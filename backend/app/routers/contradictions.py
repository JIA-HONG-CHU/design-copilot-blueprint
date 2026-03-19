"""Contradiction Management: formalization of natural-language contradictions.

SOW Module: 矛盾管理 (contradictions)
SOW Endpoints:
  - POST /contradictions/{cid}/formalize  ← AI formalize (implemented)
  - POST/GET/PUT /contradictions           ← CRUD (handled by Supabase frontend)
"""

from fastapi import APIRouter

from app.models.schemas import ContradictionFormalizeRequest, ContradictionFormalizeResponse
from app.agents.analyst import formalize_contradiction

router = APIRouter()


@router.post("/contradictions/{cid}/formalize", response_model=ContradictionFormalizeResponse)
def contradictions_formalize(cid: str, req: ContradictionFormalizeRequest):
    """Analyst Agent formalizes natural-language contradiction into TRIZ sentence."""
    return formalize_contradiction(req)
