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
)
from app.agents.triz_solver import scamper_transform, suggest_subsystems
from app.agents.scamper_feedback import process_scamper_feedback

router = APIRouter()


@router.post("/scamper/perform", response_model=ScamperResponse)
def scamper_perform(req: ScamperRequest):
    """TRIZ Solver Agent applies SCAMPER 7-action transformation."""
    return scamper_transform(req)


@router.post("/scamper/subsystem-suggestions", response_model=SubsystemSuggestResponse)
def scamper_subsystem_suggestions(req: SubsystemSuggestRequest):
    """AI suggests subsystems suitable for SCAMPER analysis."""
    return suggest_subsystems(req)


@router.post("/scamper/feedback-contradictions", response_model=ScamperFeedbackResponse)
async def scamper_feedback_contradictions(req: ScamperFeedbackRequest):
    """Feed SCAMPER-generated contradictions back to contradiction management."""
    return await process_scamper_feedback(
        project_id=req.project_id,
        new_contradictions=[c for c in req.new_contradictions],
    )
