"""Unknown Factor Discovery: AI-driven identification of design blind spots.

SOW Module: 未知集合 (unknown_factors)
SOW Endpoints:
  - POST /unknown-factors/discover   ← AI discover (implemented)
"""

from fastapi import APIRouter

from app.models.schemas import UnknownFactorDiscoverRequest, UnknownFactorDiscoverResponse
from app.agents.analyst import discover_unknown_factors

router = APIRouter()


@router.post("/unknown-factors/discover", response_model=UnknownFactorDiscoverResponse)
def unknown_factors_discover(req: UnknownFactorDiscoverRequest):
    """Analyst Agent discovers unknown factors from project context gaps."""
    return discover_unknown_factors(req)
