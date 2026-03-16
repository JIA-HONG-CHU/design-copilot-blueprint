"""CLD Generation: causal loop diagrams from contradictions + assumptions.

SOW Module: 因果迴路 (causal-loops)
"""

from fastapi import APIRouter

from app.models.schemas import CldGenerationRequest, CldGenerationResponse
from app.agents.analyst import generate_cld

router = APIRouter()


@router.post("/causal-loops/generate", response_model=CldGenerationResponse)
async def causal_loops_generate(req: CldGenerationRequest):
    """Analyst Agent generates causal loop diagram with breakpoints."""
    return generate_cld(req)
