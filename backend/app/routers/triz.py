"""Step 5a — TRIZ Solver: contradiction matrix lookup + principle instantiation + Su-Field."""

from fastapi import APIRouter

from app.models.schemas import (
    TrizLookupRequest, TrizLookupResponse,
    SuFieldRequest, SuFieldResponse,
)
from app.agents.triz_solver import solve_triz, analyze_sufield

router = APIRouter()


@router.post("/triz/solve", response_model=TrizLookupResponse)
def triz_solve(req: TrizLookupRequest):
    """TRIZ Solver Agent resolves contradiction via TC or PC path."""
    return solve_triz(req)


@router.post("/triz/sufield", response_model=SuFieldResponse)
def triz_sufield(req: SuFieldRequest):
    """Su-Field analysis: model the system and match 76 standard solutions."""
    return analyze_sufield(req)
