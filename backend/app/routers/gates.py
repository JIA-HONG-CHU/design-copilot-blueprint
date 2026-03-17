"""Gate Checking: configurable rule engine + optional AI evaluation.

SOW Module: Gate 檢查 (gates)
SOW Endpoints:
  - GET /gates/{gate_id}/check  ← 8 gate variants (1.1, 1.2, PG1, 2.1, 2.2, PG2, 3.2, PG3)

Gate definitions are declarative — see app/core/gate_registry.py.
AI evaluation is opt-in via include_ai_review query parameter.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import GateCheckResponse, GateCheckItem, AiReviewResult
from app.core.supabase import get_supabase
from app.core.gate_registry import GATE_REGISTRY

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/gates/{gate_id}/check", response_model=GateCheckResponse)
def gates_check(
    gate_id: str,
    project_id: str,
    include_ai_review: bool = False,
):
    """Check whether a project passes the specified quality gate.

    gate_id: 1.1 | 1.2 | PG1 | 2.1 | 2.2 | PG2 | 3.2 | PG3
    include_ai_review: when True, gates with an AI evaluator run additional analysis.
    """
    defn = GATE_REGISTRY.get(gate_id)
    if defn is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gate_id: {gate_id}. Valid: {set(GATE_REGISTRY.keys())}",
        )

    sb = get_supabase()
    checklist: list[GateCheckItem] = []
    failed_reasons: list[str] = []

    for check_fn in defn.checks:
        item, reason = check_fn(sb, project_id)
        checklist.append(item)
        if reason:
            failed_reasons.append(reason)

    # Optional AI review
    ai_review = None
    if include_ai_review and defn.ai_evaluator:
        try:
            ai_review = _run_ai_review(defn.ai_evaluator, sb, project_id)
        except Exception:
            logger.exception("AI review failed for gate %s", gate_id)
            ai_review = AiReviewResult(
                evaluator=defn.ai_evaluator,
                summary="AI 評估失敗，請稍後重試",
                confidence=0.0,
            )

    return GateCheckResponse(
        gate_id=gate_id,
        passed=len(failed_reasons) == 0,
        failed_reasons=failed_reasons,
        checklist_items=checklist,
        ai_review=ai_review,
    )


# ---------------------------------------------------------------------------
# AI Review dispatcher
# ---------------------------------------------------------------------------

def _run_ai_review(evaluator: str, sb, project_id: str) -> AiReviewResult:
    """Dispatch to the appropriate evaluator agent and wrap result."""

    if evaluator == "must":
        return _ai_must_review(sb, project_id)
    elif evaluator == "pre_cad":
        return _ai_pre_cad_review(sb, project_id)
    elif evaluator == "convergence":
        return _ai_convergence_review(sb, project_id)
    else:
        raise ValueError(f"Unknown evaluator: {evaluator}")


def _ai_must_review(sb, project_id: str) -> AiReviewResult:
    from app.agents.evaluator import evaluate_must
    from app.models.schemas import MustEvaluationRequest, MustCriterion

    # Fetch project data
    brief = sb.table("briefs").select("mission").eq("project_id", project_id).maybe_single().execute()
    constraints_rows = sb.table("constraints").select("description").eq("project_id", project_id).execute()
    kpis_rows = sb.table("kpis").select("name, target_value, unit").eq("project_id", project_id).execute()
    alts = sb.table("alternatives").select("id, name, mechanism").eq("project_id", project_id).execute()
    project = sb.table("projects").select("must_criteria_config").eq("id", project_id).maybe_single().execute()

    constraints = [r["description"] for r in (constraints_rows.data or [])]
    kpis = [f"{r['name']}: {r.get('target_value', '')} {r.get('unit', '')}" for r in (kpis_rows.data or [])]

    # Build MUST criteria from config or default
    must_config = (project.data or {}).get("must_criteria_config") or []
    if isinstance(must_config, str):
        try:
            must_config = json.loads(must_config)
        except (json.JSONDecodeError, TypeError):
            logger.warning("Malformed must_criteria_config for project %s", project_id)
            must_config = []
    must_criteria = [MustCriterion(**c) for c in must_config] if must_config else []

    if not alts.data or not must_criteria:
        return AiReviewResult(
            evaluator="must",
            summary="資料不足：缺少方案或 MUST 準則，無法進行 AI 評估",
            confidence=0.0,
        )

    # Evaluate the first alternative as a sample
    alt = alts.data[0]
    req = MustEvaluationRequest(
        project_id=project_id,
        alternative_name=alt.get("name", ""),
        mechanism=alt.get("mechanism", ""),
        constraints=constraints,
        kpis=kpis,
        must_criteria=must_criteria,
    )
    result = evaluate_must(req)

    return AiReviewResult(
        evaluator="must",
        summary=result.summary,
        confidence=min((cr.confidence for cr in result.criteria_results), default=0.0),
        details={
            "overall_pass": result.overall_pass,
            "criteria_count": len(result.criteria_results),
            "evaluated_alternative": alt.get("name", ""),
        },
    )


def _ai_pre_cad_review(sb, project_id: str) -> AiReviewResult:
    from app.agents.evaluator import analyze_pre_cad
    from app.models.schemas import PreCadAnalyzeRequest

    alts = sb.table("alternatives").select("id, name, mechanism").eq("project_id", project_id).execute()
    constraints_rows = sb.table("constraints").select("description").eq("project_id", project_id).execute()
    constraints = [r["description"] for r in (constraints_rows.data or [])]

    if not alts.data:
        return AiReviewResult(
            evaluator="pre_cad",
            summary="資料不足：缺少方案，無法進行 Pre-CAD AI 評估",
            confidence=0.0,
        )

    alt = alts.data[0]
    req = PreCadAnalyzeRequest(
        project_id=project_id,
        alternative_name=alt.get("name", ""),
        mechanism=alt.get("mechanism", ""),
        constraints=constraints,
    )
    result = analyze_pre_cad(req)

    scores = {
        "spatial": result.spatial_score,
        "cost": result.cost_score,
        "safety": result.safety_score,
        "decoupling": result.decoupling_score,
        "supply": result.supply_score,
    }
    avg_score = sum(scores.values()) / len(scores) if scores else 0

    return AiReviewResult(
        evaluator="pre_cad",
        summary=result.analysis,
        confidence=avg_score / 5.0,
        details={
            "overall_pass": result.overall_pass,
            "scores": scores,
            "evaluated_alternative": alt.get("name", ""),
        },
    )


def _ai_convergence_review(sb, project_id: str) -> AiReviewResult:
    from app.agents.evaluator import scan_convergence
    from app.models.schemas import ConvergenceScanRequest

    alts = sb.table("alternatives").select("name, mechanism").eq("project_id", project_id).execute()
    contras = sb.table("contradictions").select("description, severity").eq("project_id", project_id).execute()

    alternatives = [{"name": a.get("name", ""), "mechanism": a.get("mechanism", "")} for a in (alts.data or [])]
    contradictions = [{"description": c.get("description", ""), "severity": c.get("severity", "")} for c in (contras.data or [])]

    if not alternatives and not contradictions:
        return AiReviewResult(
            evaluator="convergence",
            summary="資料不足：缺少方案和矛盾資料，無法進行收斂掃描",
            confidence=0.0,
        )

    req = ConvergenceScanRequest(
        project_id=project_id,
        alternatives=alternatives,
        contradictions=contradictions,
    )
    result = scan_convergence(req)

    return AiReviewResult(
        evaluator="convergence",
        summary=result.summary,
        confidence=result.convergence_score,
        details={
            "convergence_score": result.convergence_score,
            "architecture_health": result.architecture_health,
            "force_pause": result.force_pause,
            "secondary_contradictions_count": len(result.secondary_contradictions),
        },
    )
