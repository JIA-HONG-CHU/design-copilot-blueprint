"""Analyst Agent — brief extraction, Socratic Q&A, CLD, anti-anchor.

Ref: AI_Agent_Architecture.md §1.1 Analyst Agent
"""

import json

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
    CLD_GENERATION,
    ANTI_ANCHOR_GENERATION,
    CONTRADICTION_FORMALIZATION,
    ASSUMPTION_EXTRACTION,
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
    CldGenerationRequest,
    CldGenerationResponse,
    AntiAnchorRequest,
    AntiAnchorResponse,
    ContradictionFormalizeRequest,
    ContradictionFormalizeResponse,
    AssumptionExtractRequest,
    AssumptionExtractResponse,
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


def generate_socratic_questions(req: SocraticRequest) -> SocraticResponse:
    prompt = SOCRATIC_QUESTIONS.format(
        mission=req.mission,
        constraints="\n".join(f"- {c}" for c in req.constraints),
        existing_questions="\n".join(f"- {q}" for q in req.existing_questions),
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return SocraticResponse(**data)


def generate_cld(req: CldGenerationRequest) -> CldGenerationResponse:
    prompt = CLD_GENERATION.format(
        contradictions="\n".join(f"- {c}" for c in req.contradictions),
        assumptions="\n".join(f"- {a}" for a in req.assumptions),
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return CldGenerationResponse(**data)


def formalize_contradiction(req: ContradictionFormalizeRequest) -> ContradictionFormalizeResponse:
    prompt = CONTRADICTION_FORMALIZATION.format(
        natural_description=req.natural_description,
        mission=req.mission or "（未提供）",
        constraints="\n".join(f"- {c}" for c in req.constraints) or "（尚無）",
        kpis="\n".join(f"- {k}" for k in req.kpis) or "（尚無）",
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
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


def generate_anti_anchor(req: AntiAnchorRequest) -> AntiAnchorResponse:
    prompt = ANTI_ANCHOR_GENERATION.format(
        mission=req.mission,
        current_constraints="\n".join(f"- {c}" for c in req.current_constraints),
        existing_alternatives="\n".join(f"- {a}" for a in req.existing_alternatives),
    )
    raw = call_llm_json(ANALYST_SYSTEM, prompt)
    data = json.loads(raw)
    return AntiAnchorResponse(**data)
