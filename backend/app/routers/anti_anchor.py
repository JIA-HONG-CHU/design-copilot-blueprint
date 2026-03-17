"""Anti-Anchor Sprint: forced divergence to break path dependency.

SOW Module: 方案管理 (alternatives) — anti-anchor sub-route
"""

from fastapi import APIRouter

from app.models.schemas import AntiAnchorRequest, AntiAnchorResponse
from app.agents.analyst import generate_anti_anchor

router = APIRouter()


@router.post("/alternatives/anti-anchor", response_model=AntiAnchorResponse)
def alternatives_anti_anchor(req: AntiAnchorRequest):
    """Analyst Agent generates 3+ non-typical architecture concepts."""
    return generate_anti_anchor(req)
