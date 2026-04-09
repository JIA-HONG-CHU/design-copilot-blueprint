"""Analyst Agent — brief extraction, Socratic Q&A, CLD, anti-anchor.

Ref: AI_Agent_Architecture.md §1.1 Analyst Agent
"""

import json
import logging

logger = logging.getLogger(__name__)

from app.agents.base import call_llm_json
from app.prompts.analyst import (
    ANALYST_SYSTEM,
    BRIEF_EXTRACTION,
    MISSION_REWRITE,
    CONSTRAINT_SUGGESTION,
    CONSTRAINT_FEASIBILITY,
    KPI_SUGGESTION,
    TASK_DEF_5W1H,
    SOCRATIC_QUESTIONS,
    SOCRATIC_FOLLOW_UP,
    SOCRATIC_BRIEF_IMPACT,
    SOCRATIC_AUTO_TAG,
    CLD_GENERATION,
    ANTI_ANCHOR_GENERATION,
    SOCRATIC_INSIGHT_EXTRACTION,
    CONTRADICTION_FORMALIZATION,
    ASSUMPTION_EXTRACTION,
    UNKNOWN_FACTOR_DISCOVERY,
)
from app.models.schemas import (
    BriefExtractionRequest,
    BriefExtractionResponse,
    BriefRewriteRequest,
    BriefRewriteResponse,
    ConstraintSuggestRequest,
    ConstraintSuggestResponse,
    ConstraintFeasibilityRequest,
    ConstraintFeasibilityResponse,
    KpiSuggestRequest,
    KpiSuggestResponse,
    TaskDef5W1HRequest,
    TaskDef5W1HResponse,
    EvidenceReference,
    SocraticRequest,
    SocraticResponse,
    SocraticFollowUpRequest,
    SocraticFollowUpResponse,
    SocraticBriefImpactRequest,
    SocraticBriefImpactResponse,
    SocraticAutoTagRequest,
    SocraticAutoTagResponse,
    CldGenerationRequest,
    CldGenerationResponse,
    AntiAnchorRequest,
    AntiAnchorResponse,
    ContradictionFormalizeRequest,
    ContradictionFormalizeResponse,
    AssumptionExtractRequest,
    AssumptionExtractResponse,
    UnknownFactorDiscoverRequest,
    UnknownFactorDiscoverResponse,
)
from app.services.evidence_retrieval import (
    retrieve_constraint_evidence,
    retrieve_kpi_evidence,
    retrieve_5w1h_evidence,
    retrieve_mission_rewrite_evidence,
    EvidenceReference as ServiceEvidenceRef,
)


def _convert_refs(service_refs: list[ServiceEvidenceRef]) -> list[EvidenceReference]:
    """Convert service-layer evidence refs to Pydantic schema refs."""
    return [
        EvidenceReference(
            ref_id=r.ref_id,
            ref_type=r.ref_type,
            title=r.title,
            source=r.source,
            url=r.url,
            snippet=r.snippet,
        )
        for r in service_refs
    ]


def extract_brief(req: BriefExtractionRequest) -> BriefExtractionResponse:
    prompt = BRIEF_EXTRACTION.format(raw_text=req.raw_text or "(無文字，請根據 file_urls 推斷)")
    raw = call_llm_json(ANALYST_SYSTEM, prompt, max_tokens=2048)
    data = json.loads(raw)
    # Only keep the 4 expected keys to avoid Pydantic validation errors
    filtered = {
        "constraints": data.get("constraints", []),
        "kpis": data.get("kpis", []),
        "assumptions": data.get("assumptions", []),
        "feasibility_warnings": data.get("feasibility_warnings", []),
    }
    return BriefExtractionResponse(**filtered)


def check_constraint_feasibility(req: ConstraintFeasibilityRequest) -> ConstraintFeasibilityResponse:
    if len(req.constraints) < 2:
        return ConstraintFeasibilityResponse(status="pass", conflicts=[])
    prompt = CONSTRAINT_FEASIBILITY.format(
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints),
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return ConstraintFeasibilityResponse(**data)


async def rewrite_mission(req: BriefRewriteRequest) -> BriefRewriteResponse:
    # Retrieve evidence for grounding
    evidence = await retrieve_mission_rewrite_evidence(req.mission)

    prompt = MISSION_REWRITE.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        evidence_context=evidence.prompt_context,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return BriefRewriteResponse(
        **data,
        evidence_references=_convert_refs(evidence.references),
    )


async def suggest_constraints(req: ConstraintSuggestRequest) -> ConstraintSuggestResponse:
    # Retrieve evidence — safety standards, regulations, physical limits
    evidence = await retrieve_constraint_evidence(
        req.mission,
        req.existing_constraints,
    )

    prompt = CONSTRAINT_SUGGESTION.format(
        mission=req.mission,
        existing_constraints="\n".join(f"- {c}" for c in req.existing_constraints) or "（尚無）",
        evidence_context=evidence.prompt_context,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return ConstraintSuggestResponse(
        **data,
        evidence_references=_convert_refs(evidence.references),
    )


async def suggest_kpis(req: KpiSuggestRequest) -> KpiSuggestResponse:
    # Retrieve evidence — benchmarks, test standards
    evidence = await retrieve_kpi_evidence(
        req.mission,
        req.constraints,
    )

    prompt = KPI_SUGGESTION.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        existing_kpis="\n".join(f"- {k}" for k in req.existing_kpis) or "（尚無）",
        evidence_context=evidence.prompt_context,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return KpiSuggestResponse(
        **data,
        evidence_references=_convert_refs(evidence.references),
    )


async def generate_5w1h(req: TaskDef5W1HRequest) -> TaskDef5W1HResponse:
    evidence = await retrieve_5w1h_evidence(req.mission)

    prompt = TASK_DEF_5W1H.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        evidence_context=evidence.prompt_context,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return TaskDef5W1HResponse(
        **data,
        evidence_references=_convert_refs(evidence.references),
    )


_VALID_CATEGORIES = {
    "clarification", "assumption", "consequence",
    "counter", "origin", "action", "reframing",
}


def generate_socratic_questions(req: SocraticRequest) -> SocraticResponse:
    prompt = SOCRATIC_QUESTIONS.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints),
        existing_questions="\n".join(f"- {q}" for q in req.existing_questions),
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    # Prompt uses dict keyed by category → convert to list
    q_raw = data.get("questions", {})
    if isinstance(q_raw, dict):
        questions_list = [
            {"type_class": cat, **v}
            for cat, v in q_raw.items()
            if cat in _VALID_CATEGORIES and isinstance(v, dict)
        ]
        data["questions"] = questions_list
    return SocraticResponse(**data)


def analyze_socratic_depth(req: SocraticFollowUpRequest) -> SocraticFollowUpResponse:
    """Analyze answer depth and generate targeted follow-up questions."""
    qa_text = "\n".join(
        f"[{q.category}] Q: {q.question}\nA: {q.answer}" for q in req.answered_questions
    )
    prompt = SOCRATIC_FOLLOW_UP.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints),
        answered_questions=qa_text,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    data.setdefault("follow_ups", [])
    data.setdefault("depth_sufficient", len(data["follow_ups"]) == 0)
    return SocraticFollowUpResponse(**data)


def evaluate_brief_impact(req: SocraticBriefImpactRequest) -> SocraticBriefImpactResponse:
    """Evaluate which Socratic questions are affected by a Brief change."""
    q_text = "\n".join(
        f"- id={q.id} [{q.category}] Q: {q.text}" + (f" A: {q.answer}" if q.answer else "")
        for q in req.existing_questions
    )
    prompt = SOCRATIC_BRIEF_IMPACT.format(
        new_mission=req.new_mission,
        new_constraints="\n".join(f"- {c}" for c in req.new_constraints),
        existing_questions=q_text,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    data.setdefault("affected", [])
    data.setdefault("unaffected_ids", [])
    return SocraticBriefImpactResponse(**data)


def auto_tag_socratic(req: SocraticAutoTagRequest) -> SocraticAutoTagResponse:
    """Analyse untagged Socratic Q&A for hidden assumptions/contradictions."""
    untagged_text = "\n".join(
        f"[{q.id}] Q ({q.category}): {q.text}\nA: {q.answer}"
        for q in req.untagged_questions
        if q.answer
    ) or "（無未標記的已回答問題）"
    prompt = SOCRATIC_AUTO_TAG.format(
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        existing_assumptions="\n".join(f"- {a}" for a in req.existing_assumptions) or "（尚無）",
        existing_contradictions="\n".join(f"- {c}" for c in req.existing_contradictions) or "（尚無）",
        untagged_questions=untagged_text,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return SocraticAutoTagResponse(**data)


def _extract_socratic_insights(socraticAnswers: list[str]) -> str:
    """Extract Socratic Q&A and return a bullet list string."""
    if not socraticAnswers:
        return "No additional insights available."

    prompt = SOCRATIC_INSIGHT_EXTRACTION.format(
        socraticAnswers="\n".join(f"- {a}" for a in socraticAnswers)
    )

    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    insights = data.get("insights", [])

    if not insights:
        return "No additional insights available."

    return "\n".join(f"- {ins}" for ins in insights)


def generate_cld(req: CldGenerationRequest) -> CldGenerationResponse:
    # Step 1: Refine Socratic Insights
    socratic_insights = _extract_socratic_insights(
        getattr(req, "socraticAnswers", None) or []
    )

    # Step 2: Assemble prompt
    prompt = CLD_GENERATION.format(
        contradictions="\n".join(f"- {c}" for c in req.contradictions),
        assumptions="\n".join(f"- {a}" for a in req.assumptions),
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        socratic_insights=socratic_insights,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return CldGenerationResponse.model_validate(data)


def formalize_contradiction(req: ContradictionFormalizeRequest) -> ContradictionFormalizeResponse:
    # Step 1: Refine Socratic Insights
    socratic_insights = _extract_socratic_insights(
        getattr(req, "socraticAnswers", None) or []
    )

    # Step 2: Assemble prompt
    prompt = CONTRADICTION_FORMALIZATION.format(
        natural_description=req.natural_description,
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        socratic_insights=socratic_insights,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)

    # Enforce invariant: TC MUST have both params. If LLM returned TC
    # with null params, downgrade to PC (parameter trade-off that couldn't
    # be mapped = physical contradiction).
    if data.get("type") == "TC":
        ip = data.get("improving_param")
        wp = data.get("worsening_param")
        if not isinstance(ip, int) or not isinstance(wp, int) or ip < 1 or wp < 1:
            logger.warning(
                "Formalize returned TC with invalid params (ip=%s, wp=%s) — downgrading to PC",
                ip, wp,
            )
            data["type"] = "PC"
            data["improving_param"] = None
            data["worsening_param"] = None
             # Ensure PC fields are populated
            if not data.get("physical_contradiction"):
                data["physical_contradiction"] = data.get("engineering_statement", "")

    return ContradictionFormalizeResponse(**data)


def extract_assumptions(req: AssumptionExtractRequest) -> AssumptionExtractResponse:
    qa_text = "\n".join(
        f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}"
        for qa in req.questions_and_answers
    ) or "（無問答紀錄）"
    prompt = ASSUMPTION_EXTRACTION.format(
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        existing_assumptions="\n".join(f"- {a}" for a in req.existing_assumptions) or "（尚無）",
        questions_and_answers=qa_text,
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return AssumptionExtractResponse(**data)


def _flatten_to_str(value) -> str:
    """When LLM returns a dict, it merges them into a string."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " | ".join(f"{k.replace('_', ' ').capitalize()}: {v}" 
                          for k, v in value.items())
    return str(value)


def generate_anti_anchor(req: AntiAnchorRequest) -> AntiAnchorResponse:
    prompt = ANTI_ANCHOR_GENERATION.format(
        mission=req.mission,
        current_constraints="\n".join(f"- {c}" for c in req.current_constraints),
        existing_alternatives="\n".join(f"- {a}" for a in req.existing_alternatives),
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    # Even if the prompt requires a string, the LLM may still return a dict.
    for alt in data.get("alternatives", []):
        for key in ("mechanism", "why_unconventional", 
                     "potential_advantage", "cross_domain_source"):
            if key in alt and not isinstance(alt[key], str):
                alt[key] = _flatten_to_str(alt[key])
    return AntiAnchorResponse(**data)


def discover_unknown_factors(req: UnknownFactorDiscoverRequest) -> UnknownFactorDiscoverResponse:
    """Discover unknown factors from project context gaps."""
    prompt = UNKNOWN_FACTOR_DISCOVERY.format(
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
        contradictions="\n".join(f"- {c}" for c in req.contradictions) or "（尚無）",
        existing_assumptions="\n".join(f"- {a}" for a in req.existing_assumptions) or "（尚無）",
        existing_unknowns="\n".join(f"- {u}" for u in req.existing_unknowns) or "（尚無）",
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return UnknownFactorDiscoverResponse(**data)
