"""Contradiction Management: formalization + TC→multi-PC decomposition.

SOW Module: 矛盾管理 (contradictions)
SOW Endpoints:
  - POST /contradictions/{cid}/formalize   ← AI formalize (implemented)
  - POST /contradictions/{cid}/decompose   ← TC → multi-PC (L2 WBS task 3.4)
  - POST/GET/PUT /contradictions            ← CRUD (handled by Supabase frontend)
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ContradictionFormalizeRequest,
    ContradictionFormalizeResponse,
    ContradictionDecomposeRequest,
    ContradictionDecomposeResponse,
)
from app.agents.analyst import formalize_contradiction, decompose_tc_to_pcs

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/contradictions/{cid}/formalize", response_model=ContradictionFormalizeResponse)
def contradictions_formalize(cid: str, req: ContradictionFormalizeRequest):
    """Analyst Agent formalizes natural-language contradiction into TRIZ sentence."""
    return formalize_contradiction(req)


@router.post("/contradictions/{cid}/decompose", response_model=ContradictionDecomposeResponse)
def contradictions_decompose(cid: str, req: ContradictionDecomposeRequest):
    """TC → multi-PC decomposition. Triggered automatically after AI TC
    identification, per docs/e2e/module/Explore_TC_to_MultiPC_Decomposition_WBS.md §3.4.
    """
    try:
        return decompose_tc_to_pcs(req)
    except Exception:
        logger.exception(
            "PC decomposition failed for project %s contradiction %s",
            req.project_id, cid,
        )
        raise HTTPException(status_code=502, detail="PC 分解失敗，請稍後重試")
