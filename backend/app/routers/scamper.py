"""SCAMPER: 7-action module transformation per subsystem.

SOW Module: SCAMPER (scamper)
SOW Endpoints:
  - POST /scamper/perform                ← 7-action transform (implemented)
  - POST /scamper/subsystem-suggestions   ← AI suggest subsystems (implemented)
  - POST /scamper/feedback-contradictions ← Feed new contradictions back (stub)
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ScamperRequest,
    ScamperResponse,
    SubsystemSuggestRequest,
    SubsystemSuggestResponse,
    ScamperFeedbackRequest,
    ScamperFeedbackResponse,
    SpatialOverlayRequest,
    SpatialOverlayResponse,
)
from app.agents.triz_solver import (
    scamper_transform,
    suggest_subsystems,
    IncompleteLLMResponseError,
)
from app.agents.scamper_feedback import process_scamper_feedback
from app.services.spatial_validator import discover_package, apply_overlay

router = APIRouter()


@router.post("/scamper/perform", response_model=ScamperResponse)
def scamper_perform(req: ScamperRequest):
    """TRIZ Solver Agent applies SCAMPER 7-action transformation."""
    return scamper_transform(req)


@router.post("/scamper/subsystem-suggestions", response_model=SubsystemSuggestResponse)
def scamper_subsystem_suggestions(req: SubsystemSuggestRequest):
    """AI suggests subsystems suitable for SCAMPER analysis.

    Raises HTTP 502 with a structured body when the LLM cannot produce a
    complete 6-dim interface contract even after one targeted retry. The FE
    should surface this to RD as "LLM output incomplete, please retry" and
    log the violations for prompt tuning. This is intentionally fail-loud —
    silent fallback to partial data was the root cause of the
    "interface contracts disappearing" class of bugs.
    """
    try:
        return suggest_subsystems(req)
    except IncompleteLLMResponseError as exc:
        raise HTTPException(status_code=502, detail=exc.to_dict()) from exc


@router.post("/scamper/spatial-overlay", response_model=SpatialOverlayResponse)
def scamper_spatial_overlay(req: SpatialOverlayRequest):
    """Apply an OPTIONAL what-if overlay to a previously generated subsystem
    tree. Stateless: caller passes the subsystems back together with the
    hypothetical frame envelope; this endpoint re-runs discovery and reports
    overlay violations. Discovery never requires this — it exists so RD can
    explore trade-offs against multiple imaginary frames after the design has
    been freely proposed.
    """
    pkg = discover_package(req.subsystems)
    overlaid = apply_overlay(pkg, req.overlay or {})
    return SpatialOverlayResponse(package_map=overlaid)


@router.post("/scamper/feedback-contradictions", response_model=ScamperFeedbackResponse)
async def scamper_feedback_contradictions(req: ScamperFeedbackRequest):
    """Feed SCAMPER-generated contradictions back to contradiction management."""
    return await process_scamper_feedback(
        project_id=req.project_id,
        new_contradictions=[c for c in req.new_contradictions],
    )
