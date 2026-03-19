"""Evaluator Agent — risk analysis, convergence scan, MUST evaluation.

Ref: AI_Agent_Architecture.md §1.1 Evaluator Agent + §6.2 evaluator_agent tools
"""

import json

from app.agents.base import call_llm_json
from app.prompts.evaluator import (
    EVALUATOR_SYSTEM,
    RISK_ANALYSIS,
    CONVERGENCE_SCAN,
    MUST_EVALUATION,
    PRE_CAD_ANALYSIS,
    WANT_CRITERIA_SEED,
    BRIEF_QUALITY_REVIEW,
    DEPTH_QUALITY_REVIEW,
    EXPERIMENT_COVERAGE_REVIEW,
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


def analyze_pre_cad(req: PreCadAnalyzeRequest) -> PreCadAnalyzeResponse:
    prompt = PRE_CAD_ANALYSIS.format(
        alternative_name=req.alternative_name,
        mechanism=req.mechanism,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return PreCadAnalyzeResponse(**data)


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
    prompt = CONVERGENCE_SCAN.format(
        alternatives=json.dumps(req.alternatives, ensure_ascii=False, indent=2),
        contradictions=json.dumps(req.contradictions, ensure_ascii=False, indent=2),
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
    )
    raw = call_llm_json(EVALUATOR_SYSTEM, prompt)
    data = json.loads(raw)
    return ConvergenceScanResponse(**data)


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
