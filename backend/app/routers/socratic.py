"""Socratic Questions: 7-category questioning for assumption/contradiction discovery.

SOW Module: 索克拉底問答 (questions)
"""

from fastapi import APIRouter

from app.models.schemas import SocraticRequest, SocraticResponse
from app.agents.analyst import generate_socratic_questions

router = APIRouter()


@router.post("/questions/generate", response_model=SocraticResponse)
def questions_generate(req: SocraticRequest):
    """Analyst Agent generates Socratic questions across 7 categories."""
    return generate_socratic_questions(req)
