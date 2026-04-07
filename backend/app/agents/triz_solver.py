"""TRIZ Solver Agent — matrix lookup + principle instantiation + SCAMPER.

Ref: AI_Agent_Architecture.md §1.1 TRIZ Solver Agent + §6.2 triz_solver_agent tools
"""

import json
import logging

logger = logging.getLogger(__name__)

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
    """Resolve a TRIZ contradiction — route strictly by declared type.

    Step 3 classifies each contradiction/problem into a type; Step 5a
    dispatches to the corresponding solver path:
      TC → contradiction matrix → 40 principles (requires improving/worsening params)
      PC → separation principles (requires physical_contradiction)
      SF → Su-Field 76 standard solutions (requires sf_* fields)
    """
    if req.type == "SF":
        return _solve_sf(req)
    elif req.type == "TC":
        if not req.improving_param or not req.worsening_param:
            # Should not happen if formalize ran correctly — return empty with warning
            return TrizLookupResponse(
                mapped_improving=req.improving_param,
                mapped_worsening=req.worsening_param,
                suggestions=[],
            )
        return _solve_tc(req)
    elif req.type == "PC":
        return _solve_pc(req)
    else:
        raise ValueError(f"Unknown contradiction type '{req.type}'. Expected TC, PC, or SF.")


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
    try:
        data = json.loads(raw) if raw and raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

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
    try:
        data = json.loads(raw) if raw and raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

    # Ensure each suggestion carries path="PC"
    suggestions = data.get("suggestions", [])
    for s in suggestions:
        if not s.get("path"):
            s["path"] = "PC"

    return TrizLookupResponse(
        suggestions=suggestions,
    )


def _solve_sf(req: TrizLookupRequest) -> TrizLookupResponse:
    """Su-Field path: delegate to analyze_sufield and wrap result as TrizLookupResponse."""
    from app.models.schemas import SuFieldRequest as _SFReq

    sf_req = _SFReq(
        project_id=req.project_id,
        system_description=req.natural_description,
        current_issues=[req.natural_description],
        contradiction_id=req.contradiction_id,
        substance_1=req.sf_substance_1,
        substance_2=req.sf_substance_2,
        field_type=req.sf_field,
    )
    sf_resp = analyze_sufield(sf_req)

    # Convert matched 76-standard solutions into TrizSuggestion format
    suggestions = []
    for sol in sf_resp.matched_solutions:
        suggestions.append({
            "path": "SuField",
            "principle_number": None,
            "principle_name": f"{sol.standard_id} {sol.standard_name}",
            "suggestion": sol.suggestion,
            "separation_principle": "",
            "affected_modules": sol.affected_modules,
            "secondary_contradictions": sol.secondary_contradictions,
        })

    return TrizLookupResponse(suggestions=suggestions)


def _infer_sufield_state(req: SuFieldRequest) -> str | None:
    """Infer Su-Field system state from request metadata for KB filtering."""
    comp = (getattr(req, 'sf_completeness', None) or '').lower()
    inter = (getattr(req, 'sf_interaction', None) or '').lower()
    if 'incomplete' in comp or not (req.substance_1 and req.substance_2 and req.field_type):
        return 'incomplete'
    if 'harmful' in inter or 'harmful' in comp:
        return 'harmful'
    if 'insufficient' in inter:
        return 'insufficient'
    return None  # unknown → full inject


def analyze_sufield(req: SuFieldRequest) -> SuFieldResponse:
    """Analyse a technical system using Su-Field modelling + 76 standard solutions."""
    state_hint = _infer_sufield_state(req)
    triz_context = build_sufield_context(system_state=state_hint)

    # Enrich system_description with Su-Field context from Function Model if available
    desc = req.system_description
    if req.substance_1 or req.substance_2:
        desc += f"\nFunction Model: S1={req.substance_1 or '?'}, S2={req.substance_2 or '?'}, F={req.field_type or '?'}"

    prompt = SUFIELD_ANALYSIS.format(
        system_description=desc,
        current_issues="\n".join(f"- {i}" for i in req.current_issues) or "（未指定）",
        triz_context=triz_context,
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)  # no max_tokens → uses config default (16384)
    empty_fallback = SuFieldResponse(
        su_field={"S1": req.substance_1 or "", "S2": req.substance_2 or "", "F": req.field_type or ""},
        system_state="unknown",
        matched_solutions=[],
    )
    if not raw or not raw.strip():
        logger.warning("Su-Field analysis: LLM returned empty response (raw=%r)", raw[:200] if raw else raw)
        return empty_fallback
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Su-Field analysis: LLM returned non-JSON (raw=%s)", raw[:500])
        return empty_fallback

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
