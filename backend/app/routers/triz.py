"""Step 5a — TRIZ Solver: contradiction matrix lookup + principle instantiation."""

from fastapi import APIRouter

from app.models.schemas import TrizLookupRequest, TrizLookupResponse
from app.agents.triz_solver import solve_triz

router = APIRouter()


@router.post("/triz/solve", response_model=TrizLookupResponse)
async def triz_solve(req: TrizLookupRequest):
    """TRIZ Solver Agent resolves contradiction via TC or PC path."""
    return solve_triz(req)
