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
    SuggestedSubsystem,
    InterfaceContract,
    SpatialEstimate,
    BBox,
)
from app.services import reference_library  # legacy direct access (kept for back-compat)
from app.services.spatial_lookup import LookupQuery, default_resolver
from app.services.spatial_validator import discover_package


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


def _resolve_spatial_via_layers(
    subsystems: list[SuggestedSubsystem],
    project_id: str,
    resolver=None,
) -> None:
    """Walk the subsystem tree and replace each LLM-supplied spatial estimate
    with the highest-priority lookup result from the layered resolver.

    The LLM may cite any of these source prefixes (or omit `reference_source`
    entirely):
        rd_override:<key>  | learned:<key>  | web:<...>  | seed:<key>  | llm_estimate

    For non-llm sources, the resolver is queried by `key`. If the resolver
    finds a match (in ANY layer — typically a project-level RD override or a
    learned component), the bbox/mass are overwritten with the authoritative
    values and `confidence` is set accordingly. The LLM number is always
    discarded when an authoritative source is available.

    For `llm_estimate` and entries with no reference_source set, the LLM
    number is left in place — that's the final fallback layer.
    """
    resolver = resolver or default_resolver(include_web=False)

    def visit(node: SuggestedSubsystem) -> None:
        for target_name, contract in (node.interface_contracts or {}).items():
            est = contract.spatial
            if est is None:
                continue
            src = est.reference_source or ""
            if not src or src == "llm_estimate":
                continue  # leave LLM numbers as the last-resort fallback
            # Strip any layer prefix to get the lookup key
            key = src.split(":", 1)[1] if ":" in src else src
            resolved = resolver.lookup(
                LookupQuery(key=key, category="", project_id=project_id)
            )
            if resolved is None or resolved.bbox is None:
                # The LLM cited a layer that didn't actually have this entry —
                # downgrade confidence so RD knows the number is not vendor-grade.
                est.confidence = "estimate"
                continue
            # Preserve any frame-relative origin/anchor the LLM proposed —
            # those describe placement, not the part itself.
            preserved_origin = est.bbox.origin_mm if est.bbox else (0.0, 0.0, 0.0)
            preserved_anchor = est.bbox.anchor if est.bbox else resolved.bbox.anchor
            est.bbox = BBox(
                x_mm=resolved.bbox.x_mm,
                y_mm=resolved.bbox.y_mm,
                z_mm=resolved.bbox.z_mm,
                origin_mm=preserved_origin,
                anchor=preserved_anchor,
            )
            est.mass_g = resolved.mass_g
            est.reference_source = resolved.reference_source
            est.confidence = resolved.confidence
            if not est.rationale and resolved.rationale:
                est.rationale = resolved.rationale
        for child in node.children or []:
            visit(child)

    for root in subsystems:
        visit(root)


# Legacy alias kept so older callers / tests still find this name. The new
# implementation routes through the layered resolver instead of the static
# JSON, but the behavioural contract is the same: vendor facts trump LLM.
def _override_with_reference_library(subsystems: list[SuggestedSubsystem]) -> None:
    _resolve_spatial_via_layers(subsystems, project_id="")


def suggest_subsystems(req: SubsystemSuggestRequest) -> SubsystemSuggestResponse:
    # Build a project-scoped resolver so RD overrides for THIS project surface
    # in the prompt vocabulary alongside global learned components and the
    # seed JSON. Web lookup is excluded from the prompt summary because it is
    # an on-demand layer, not an enumerable one.
    resolver = default_resolver(include_web=False)
    library_summary = resolver.summarize_for_prompt(project_id=req.project_id)

    prompt = SUBSYSTEM_SUGGESTION.format(
        mission=req.mission,
        contradictions="\n".join(f"- {c}" for c in req.contradictions) or "（無）",
        existing_subsystems="\n".join(f"- {s}" for s in req.existing_subsystems) or "（無）",
        reference_library=library_summary,
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)
    response = SubsystemSuggestResponse.model_validate(data)

    # Resolve spatial estimates through the full layered chain (with web
    # lookup ENABLED — we're willing to spend a search call here when the
    # LLM cites web: or an unknown key, to keep the data grounded).
    full_resolver = default_resolver(include_web=True)
    _resolve_spatial_via_layers(response.subsystems, req.project_id, full_resolver)

    # Discovery: compute the package map from whatever spatial estimates we
    # ended up with. This never blocks the response — if the validator finds
    # nothing useful (e.g., LLM omitted spatial entirely), it returns an empty
    # PackageMap and the caller can ignore it.
    try:
        response.package_map = discover_package(response.subsystems)
    except Exception as exc:  # pragma: no cover - defensive, validator must not break the agent
        logger.warning("spatial validator failed: %s", exc)
        response.package_map = None

    return response


def scamper_transform(req: ScamperRequest) -> ScamperResponse:
    prompt = SCAMPER_TRANSFORM.format(
        subsystem_name=req.subsystem_name,
        subsystem_description=req.subsystem_description,
        related_contradictions="\n".join(f"- {c}" for c in req.related_contradictions),
    )
    raw = call_llm_json(TRIZ_SOLVER_SYSTEM, prompt)
    data = json.loads(raw)
    return ScamperResponse(**data)
