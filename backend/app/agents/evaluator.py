"""Evaluator Agent — risk analysis, convergence scan, MUST evaluation.

Ref: AI_Agent_Architecture.md §1.1 Evaluator Agent + §6.2 evaluator_agent tools
"""

import json

from app.agents.base import call_llm_json
from app.prompts.evaluator import (
    EVALUATOR_SYSTEM,
    RISK_ANALYSIS,
    CONVERGENCE_SCAN,
    CONVERGENCE_SCAN_PHASE_A,
    MUST_EVALUATION,
    PRE_CAD_ANALYSIS,
    WANT_CRITERIA_SEED,
    BRIEF_QUALITY_REVIEW,
    DEPTH_QUALITY_REVIEW,
    EXPERIMENT_COVERAGE_REVIEW,
    SOLUTION_VALIDATION_PASSPORT,
)
from app.models.schemas import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    ConvergenceScanRequest,
    ConvergenceScanResponse,
    MustEvaluationRequest,
    MustEvaluationResponse,
    PreCadAnalyzeRequest,
    PreCadAnalyzeResponse,
    WantSeedRequest,
    WantSeedResponse,
    ValidationPassportRequest,
    ValidationPassportResponse,
)


def analyze_risk(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    prompt = RISK_ANALYSIS.format(
        alternative_name=req.alternative_name,
        mechanism=req.mechanism,
        assumptions="\n".join(f"- {a}" for a in req.assumptions),
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return RiskAnalysisResponse(**data)


def evaluate_must(req: MustEvaluationRequest) -> MustEvaluationResponse:
    criteria_text = "\n".join(
        f"- {c.id}: {c.label} (來源: {c.source}, 閾值: {c.threshold or '見描述'})"
        for c in req.must_criteria
    )
    prompt = MUST_EVALUATION.format(
        alternative_name=req.alternative_name,
        mechanism=req.mechanism,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（無）",
        must_criteria=criteria_text,
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return MustEvaluationResponse(**data)


def _spatial_score_from_validator(package) -> int:
    """Deterministic 1–5 score derived from PackageMap arithmetic.

    Rules (cumulative penalties from a perfect 5):
      - −1 per clashing module pair (capped)
      - −1 if total mass exceeds a soft commuter-class threshold of 12 kg
      - −1 if any single module is heavier than 5 kg
      - −1 if required envelope x exceeds 700 mm (rough downtube cap)
    Floor at 1.
    """
    if package is None or not package.nodes:
        return 0  # signal "no evidence"
    score = 5
    distinct_clashes = sum(1 for n in package.nodes if n.clashes)
    score -= min(2, distinct_clashes)
    if package.required.total_mass_g > 12_000:
        score -= 1
    if any((n.spatial.mass_g or 0) > 5_000 for n in package.nodes):
        score -= 1
    if package.required.total_bbox_mm[0] > 700:
        score -= 1
    return max(1, score)


def _format_spatial_evidence(package) -> str:
    """Render the validator output as a compact text block for the prompt."""
    if package is None or not package.nodes:
        return "(empty — no spatial estimates available; use qualitative judgement)"
    lines = [
        f"required_envelope_mm: {package.required.total_bbox_mm[0]:.0f} x "
        f"{package.required.total_bbox_mm[1]:.0f} x {package.required.total_bbox_mm[2]:.0f}",
        f"total_mass_g: {package.required.total_mass_g:.0f}",
        f"module_count: {len(package.nodes)}",
    ]
    clash_pairs = [
        f"{n.name} <-> {', '.join(n.clashes)}" for n in package.nodes if n.clashes
    ]
    lines.append(f"clashes: {clash_pairs if clash_pairs else 'none'}")
    if package.notes:
        lines.append("notes:")
        for note in package.notes:
            lines.append(f"  - {note}")
    lines.append(f"validator_spatial_score: {_spatial_score_from_validator(package)}")
    return "\n".join(lines)


def analyze_pre_cad(req: PreCadAnalyzeRequest) -> PreCadAnalyzeResponse:
    # Compute the deterministic spatial validator output up front, if the
    # caller supplied subsystems. The result feeds the prompt as evidence and
    # also overrides the LLM's spatial_score on the way back.
    from app.services.spatial_validator import discover_package

    package = discover_package(req.subsystems) if req.subsystems else None
    spatial_evidence = _format_spatial_evidence(package)
    deterministic_spatial = _spatial_score_from_validator(package)

    prompt = PRE_CAD_ANALYSIS.format(
        alternative_name=req.alternative_name,
        mechanism=req.mechanism,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（無）",
        spatial_evidence=spatial_evidence,
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    response = PreCadAnalyzeResponse(**data)

    # Override the LLM's spatial score with the validator's arithmetic when
    # we have evidence. The LLM's narrative `analysis` is preserved.
    if deterministic_spatial > 0:
        response.spatial_score = deterministic_spatial
        response.package_map = package
        # Recompute overall_pass since we may have changed the spatial score
        scores = [
            response.spatial_score,
            response.cost_score,
            response.safety_score,
            response.decoupling_score,
            response.supply_score,
        ]
        response.overall_pass = all(s >= 3 for s in scores)

    return response


def seed_want_criteria(req: WantSeedRequest) -> WantSeedResponse:
    prompt = WANT_CRITERIA_SEED.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return WantSeedResponse(**data)


def scan_convergence(req: ConvergenceScanRequest) -> ConvergenceScanResponse:
    contradiction_json = json.dumps(
        [c.model_dump() for c in req.contradictions],
        ensure_ascii=False, indent=2,
    )
    mission = req.mission or "（未提供）"
    constraints = "\n".join(f"- {c}" for c in req.constraints) or "（尚無）"
    kpis = "\n".join(f"- {k}" for k in req.kpis) or "（尚無）"

    if req.phase == "A":
        # Phase A: contradiction-only health check (no alternatives needed)
        prompt = CONVERGENCE_SCAN_PHASE_A.format(
            contradictions=contradiction_json,
            mission=mission, constraints=constraints, kpis=kpis,
        )
    else:
        # Phase B: full alternative × contradiction cross-check
        prompt = CONVERGENCE_SCAN.format(
            alternatives=json.dumps(
                [a.model_dump() for a in req.alternatives],
                ensure_ascii=False, indent=2,
            ),
            contradictions=contradiction_json,
            mission=mission, constraints=constraints, kpis=kpis,
        )

    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    # Defensive defaults — LLM may omit optional fields
    data.setdefault("new_contradictions", [])
    data.setdefault("force_pause", False)
    data.setdefault("pause_reason", "")
    data["phase"] = req.phase  # echo phase back
    # model_validator handles key normalisation + score scaling
    return ConvergenceScanResponse(**data)


def generate_validation_passport(req: ValidationPassportRequest) -> ValidationPassportResponse:
    """Generate a self-declared validation passport for a solution hypothesis."""
    prompt = SOLUTION_VALIDATION_PASSPORT.format(
        solution_name=req.solution_name,
        mechanism=req.mechanism,
        source=req.source or "（未指定）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return ValidationPassportResponse(**data)


# ---------------------------------------------------------------------------
# Gate quality evaluators (called from evaluator_registry.py)
# ---------------------------------------------------------------------------

def review_brief_quality(
    mission: str, constraints: list[str], kpis: list[str],
) -> dict:
    prompt = BRIEF_QUALITY_REVIEW.format(
        mission=mission,
        constraints="\n".join(f"- {c}" for c in constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in kpis) or "（尚無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    return json.loads(raw)


def review_depth_quality(
    mission: str,
    assumptions: list[dict],
    contradictions: list[dict],
) -> dict:
    prompt = DEPTH_QUALITY_REVIEW.format(
        mission=mission,
        assumptions="\n".join(
            f"- [{a.get('severity', '?')}] {a.get('content', '')}"
            for a in assumptions
        ) or "（尚無）",
        contradictions="\n".join(
            f"- [{c.get('severity', '?')}] {c.get('description', '')}"
            for c in contradictions
        ) or "（尚無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    return json.loads(raw)


def review_experiment_coverage(
    high_risk_assumptions: list[dict],
    experiments: list[dict],
) -> dict:
    prompt = EXPERIMENT_COVERAGE_REVIEW.format(
        high_risk_assumptions="\n".join(
            f"- {a.get('code', '?')}: {a.get('content', '')} [{a.get('severity', '')}]"
            for a in high_risk_assumptions
        ),
        experiments="\n".join(
            f"- [{e.get('assumption_code', '?')}] {e.get('description', '')} (方法: {e.get('method', '未指定')})"
            for e in experiments
        ) or "（尚無實驗）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    return json.loads(raw)
