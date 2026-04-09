"""Step 5a — TRIZ Solver: contradiction matrix lookup + principle instantiation + Su-Field.

v7 (2026-04-09): Adds `POST /triz/solve-layered` — the ARIZ-style three-layer
drill-down orchestrator (L1 TC / L2 PC / L3 SF) that returns a LayeredTrizSolution
instead of a flat suggestion list. The legacy `/triz/solve` endpoint remains as
the primitive API (used internally by the orchestrator and for back-compat with
feature-flagged old UI).

Ref:
  - docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §4–§8
  - docs/e2e/module/TRIZ_Layered_Drilldown_Development_WBS.md §6
"""

from fastapi import APIRouter

from app.models.schemas import (
    TrizLookupRequest, TrizLookupResponse,
    SuFieldRequest, SuFieldResponse,
    SolveTrizLayeredRequest, SolveTrizLayeredResponse,
)
from app.agents.triz_solver import solve_triz, analyze_sufield, solve_triz_layered

router = APIRouter()


@router.post("/triz/solve", response_model=TrizLookupResponse)
def triz_solve(req: TrizLookupRequest):
    """TRIZ Solver Agent resolves a contradiction via a SINGLE TC / PC / SF path.

    Kept as a primitive API — direct use by the UI is deprecated when the
    `triz_layered_mode` feature flag is enabled. Prefer `/triz/solve-layered`
    for new consumers so that RD sees L1 / L2 / L3 as a drill-down diagnosis
    instead of three competing candidates.
    """
    return solve_triz(req)


@router.post("/triz/sufield", response_model=SuFieldResponse)
def triz_sufield(req: SuFieldRequest):
    """Su-Field analysis: model the system and match 76 standard solutions."""
    return analyze_sufield(req)


@router.post("/triz/solve-layered", response_model=SolveTrizLayeredResponse)
def triz_solve_layered(req: SolveTrizLayeredRequest):
    """v7 — Three-layer drill-down TRIZ solver.

    Returns a LayeredTrizSolution with:
      - L1 TC surface (always runs)
      - L2 PC root-cause (conditional, via ARIZ deepen_link)
      - L3 SF structural lens (always runs, parallel)
      - differential_analysis + recommended_route
      - phase_b_directive (default: intra-LTS cross-layer SKIP)

    Request flags:
      - `quick_mode=true` + `severity=minor` → L2 is skipped to avoid over-deepening
      - `force_l2=true` → RD forces L2 deepen regardless of critic/severity
    """
    return solve_triz_layered(req)
