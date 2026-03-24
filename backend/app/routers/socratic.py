"""Socratic Questions: 7-category questioning for assumption/contradiction discovery.

SOW Module: 索克拉底問答 (questions)
"""

from fastapi import APIRouter

from app.models.schemas import (
    SocraticRequest,
    SocraticResponse,
    SocraticFollowUpRequest,
    SocraticFollowUpResponse,
    SocraticBriefImpactRequest,
    SocraticBriefImpactResponse,
)
from app.agents.analyst import (
    generate_socratic_questions,
    analyze_socratic_depth,
    evaluate_brief_impact,
)

router = APIRouter()


@router.post("/questions/generate", response_model=SocraticResponse)
def questions_generate(req: SocraticRequest):
    """Analyst Agent generates Socratic questions across 7 categories."""
    return generate_socratic_questions(req)


@router.post("/questions/follow-up", response_model=SocraticFollowUpResponse)
def questions_follow_up(req: SocraticFollowUpRequest):
    """Analyze answer depth and generate targeted follow-up questions (max 3)."""
    return analyze_socratic_depth(req)


@router.post("/questions/brief-impact", response_model=SocraticBriefImpactResponse)
def questions_brief_impact(req: SocraticBriefImpactRequest):
    """Evaluate which questions are affected by a Brief change and suggest replacements."""
    return evaluate_brief_impact(req)
