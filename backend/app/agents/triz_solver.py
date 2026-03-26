"""TRIZ Solver Agent — matrix lookup + principle instantiation + SCAMPER.

Ref: AI_Agent_Architecture.md §1.1 TRIZ Solver Agent + §6.2 triz_solver_agent tools
"""

import json

from app.agents.base import call_llm_json
from app.prompts.triz_solver import (
    TRIZ_SOLVER_SYSTEM,
    TRIZ_TC_INSTANTIATION,
    TRIZ_PC_INSTANTIATION,
    SUFIELD_ANALYSIS,
    SCAMPER_TRANSFORM,
    SUBSYSTEM_SUGGESTION,
)
from app.tools.triz_kb import (
    build_triz_tc_context,
    build_triz_pc_context,
    build_sufield_context,
    lookup_matrix,
)
from app.models.schemas import (
    TrizLookupRequest,
    TrizLookupResponse,
    SuFieldRequest,
    SuFieldResponse,
    ScamperRequest,
    ScamperResponse,
    SubsystemSuggestRequest,
    SubsystemSuggestResponse,
)


def solve_triz(req: TrizLookupRequest) -> TrizLookupResponse:
    """Resolve a TRIZ contradiction — TC or PC path."""
    if req.type == "TC" and req.improving_param and req.worsening_param:
        return _solve_tc(req)
    else:
        return _solve_pc(req)


def _solve_tc(req: TrizLookupRequest) -> TrizLookupResponse:
    improving = req.improving_param
    worsening = req.worsening_param
    candidates = lookup_matrix(improving, worsening)
    triz_context = build_triz_tc_context(improving, worsening)

    prompt = TRIZ_TC_INSTANTIATION.format(
        natural_description=req.natural_description,
        triz_context=triz_context,
        improving=improving,
        worsening=worsening,
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)

    # Ensure each suggestion carries path="TC"
    suggestions = data.get("suggestions", [])
    for s in suggestions:
        if not s.get("path"):
            s["path"] = "TC"

    return TrizLookupResponse(
        mapped_improving=improving,
        mapped_worsening=worsening,
        candidate_principles=candidates,
        suggestions=suggestions,
    )


def _solve_pc(req: TrizLookupRequest) -> TrizLookupResponse:
    triz_context = build_triz_pc_context()

    prompt = TRIZ_PC_INSTANTIATION.format(
        natural_description=req.natural_description,
        physical_contradiction=req.physical_contradiction or req.natural_description,
        triz_context=triz_context,
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)

    # Ensure each suggestion carries path="PC"
    suggestions = data.get("suggestions", [])
    for s in suggestions:
        if not s.get("path"):
            s["path"] = "PC"

    return TrizLookupResponse(
        suggestions=suggestions,
    )


def analyze_sufield(req: SuFieldRequest) -> SuFieldResponse:
    """Analyse a technical system using Su-Field modelling + 76 standard solutions."""
    triz_context = build_sufield_context()

    prompt = SUFIELD_ANALYSIS.format(
        system_description=req.system_description,
        current_issues="\n".join(f"- {i}" for i in req.current_issues) or "（未指定）",
        triz_context=triz_context,
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt, max_tokens=4096)
    if not raw or not raw.strip():
        raise ValueError("LLM returned empty response for Su-Field analysis")
    data = json.loads(raw)

    return SuFieldResponse(
        su_field=data.get("su_field", {}),
        system_state=data.get("system_state", "unknown"),
        matched_solutions=data.get("matched_solutions", []),
    )


def suggest_subsystems(req: SubsystemSuggestRequest) -> SubsystemSuggestResponse:
    prompt = SUBSYSTEM_SUGGESTION.format(
        mission=req.mission,
        contradictions="\n".join(f"- {c}" for c in req.contradictions) or "（無）",
        existing_subsystems="\n".join(f"- {s}" for s in req.existing_subsystems) or "（無）",
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)
    return SubsystemSuggestResponse.model_validate(data)


def scamper_transform(req: ScamperRequest) -> ScamperResponse:
    prompt = SCAMPER_TRANSFORM.format(
        subsystem_name=req.subsystem_name,
        subsystem_description=req.subsystem_description,
        related_contradictions="\n".join(f"- {c}" for c in req.related_contradictions),
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)
    return ScamperResponse(**data)
