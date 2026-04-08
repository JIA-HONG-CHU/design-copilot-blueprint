"""Spatial Lookup endpoints — RD inline override + learned-component promotion.

These power the layered spatial resolver introduced to replace the hand-curated
JSON reference library:

- POST /spatial/component-overrides   ← RD says "for THIS project, X = ..."
- GET  /spatial/component-overrides   ← list all overrides for a project
- POST /spatial/learned-components    ← promote a confirmed estimate globally
- GET  /spatial/learned-components    ← list learned facts (top by confirmed_count)

The store is Supabase (tables in migration 007). The resolver
(`services.spatial_lookup`) reads from these tables transparently — these
endpoints are the FE-facing write/list surface.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import get_supabase
from app.models.schemas import (
    ComponentOverrideRequest,
    ComponentOverrideResponse,
    LearnedComponentPromoteRequest,
    LearnedComponentPromoteResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# RD inline override (Layer 1 of the resolver)
# ---------------------------------------------------------------------------


@router.post(
    "/spatial/component-overrides",
    response_model=ComponentOverrideResponse,
)
def create_component_override(req: ComponentOverrideRequest):
    """Create or update an RD-authoritative dimension override for ONE
    component within ONE project. Subsequent suggest_subsystems calls and
    spatial validation runs will see this value with `confidence: rd_confirmed`.
    """
    sb = get_supabase()
    payload = {
        "project_id": req.project_id,
        "component_key": req.component_key,
        "category": req.category,
        "bbox": {
            "x_mm": req.bbox.x_mm,
            "y_mm": req.bbox.y_mm,
            "z_mm": req.bbox.z_mm,
            "anchor": req.bbox.anchor,
        },
        "mass_g": req.mass_g,
        "note": req.note,
    }
    try:
        sb.table("project_component_overrides").upsert(
            payload, on_conflict="project_id,component_key"
        ).execute()
    except Exception as exc:
        logger.exception("failed to upsert component override")
        raise HTTPException(status_code=500, detail=f"override save failed: {exc}")
    return ComponentOverrideResponse(saved=True, component_key=req.component_key)


@router.get("/spatial/component-overrides")
def list_component_overrides(project_id: str = Query(...)):
    sb = get_supabase()
    resp = (
        sb.table("project_component_overrides")
        .select("*")
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return {"overrides": getattr(resp, "data", None) or []}


@router.delete("/spatial/component-overrides")
def delete_component_override(
    project_id: str = Query(...),
    component_key: str = Query(...),
):
    sb = get_supabase()
    sb.table("project_component_overrides").delete().eq(
        "project_id", project_id
    ).eq("component_key", component_key).execute()
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Learned components (Layer 2 of the resolver)
# ---------------------------------------------------------------------------


@router.post(
    "/spatial/learned-components",
    response_model=LearnedComponentPromoteResponse,
)
def promote_learned_component(req: LearnedComponentPromoteRequest):
    """Promote a confirmed estimate into the globally learned table.

    Behaviour:
    - If the key does not exist: insert a new row with `confirmed_count = 1`.
    - If the key already exists: bump `confirmed_count` by 1 and update
      `updated_at`. Existing bbox/mass are NOT overwritten — the first
      confirmed value is treated as canonical to avoid drift. RD wanting to
      replace it must use a project-level override instead.
    """
    sb = get_supabase()

    # Check existing
    existing = (
        sb.table("learned_components")
        .select("id, confirmed_count")
        .eq("key", req.key)
        .limit(1)
        .execute()
    )
    rows = getattr(existing, "data", None) or []

    if rows:
        # Bump confirmed_count via the SQL helper
        try:
            sb.rpc("bump_learned_component_confirm", {"p_key": req.key}).execute()
        except Exception:
            # Fallback: manual update if the RPC isn't installed
            sb.table("learned_components").update(
                {"confirmed_count": rows[0]["confirmed_count"] + 1}
            ).eq("key", req.key).execute()
        new_count = rows[0]["confirmed_count"] + 1
        return LearnedComponentPromoteResponse(
            saved=True, key=req.key, confirmed_count=new_count
        )

    # Insert new
    payload = {
        "key": req.key,
        "category": req.category,
        "bbox": {
            "x_mm": req.bbox.x_mm,
            "y_mm": req.bbox.y_mm,
            "z_mm": req.bbox.z_mm,
            "anchor": req.bbox.anchor,
        },
        "mass_g": req.mass_g,
        "origin": req.origin,
        "origin_project": req.origin_project_id or None,
        "source_url": req.source_url,
        "source_text": req.source_text,
        "confirmed_count": 1,
    }
    sb.table("learned_components").insert(payload).execute()
    return LearnedComponentPromoteResponse(saved=True, key=req.key, confirmed_count=1)


@router.get("/spatial/learned-components")
def list_learned_components(
    category: str = Query(""),
    limit: int = Query(50, ge=1, le=200),
):
    sb = get_supabase()
    q = sb.table("learned_components").select("*").order("confirmed_count", desc=True)
    if category:
        q = q.eq("category", category)
    resp = q.limit(limit).execute()
    return {"components": getattr(resp, "data", None) or []}
