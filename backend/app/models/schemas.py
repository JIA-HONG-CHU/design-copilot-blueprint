"""Pydantic models for API request/response schemas.

Maps to the AI Agent Architecture §1.1 Agent roles and §4.4 Artifact states.
"""

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------------------------------------------------------------------------
# Evidence Reference (shared across responses)
# ---------------------------------------------------------------------------

class EvidenceReference(BaseModel):
    """A single evidence reference attached to an AI suggestion."""
    ref_id: str          # e.g. "WEB-SEARCH-001", "DOC-001"
    ref_type: str        # "web_search" | "uploaded_doc" | "engineering_reasoning"
    title: str
    source: str          # domain, filename, or description
    url: str = ""
    snippet: str = ""


# ---------------------------------------------------------------------------
# Step 1: Brief Extraction
# ---------------------------------------------------------------------------

class BriefExtractionRequest(BaseModel):
    """Input for Analyst Agent — extract constraints, KPIs, assumptions from raw text/upload."""
    project_id: str
    raw_text: str = ""
    file_urls: list[str] = Field(default_factory=list)


class ExtractedConstraint(BaseModel):
    code: str
    description: str
    source: str
    type: str = "hard"
    feasibility: str = "unknown"


class ExtractedKpi(BaseModel):
    name: str
    target_value: str
    unit: str
    measurement_method: str = ""


class BriefExtractionResponse(BaseModel):
    constraints: list[ExtractedConstraint]
    kpis: list[ExtractedKpi]
    assumptions: list[str]
    feasibility_warnings: list[str]


# --- Constraint Feasibility Check ---

class ConstraintFeasibilityRequest(BaseModel):
    """Input for AI constraint feasibility analysis."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)


class FeasibilityConflict(BaseModel):
    constraintA: str
    constraintB: str
    reason: str
    suggestion: str


class ConstraintFeasibilityResponse(BaseModel):
    """AI-generated constraint feasibility analysis."""
    status: str  # "pass" | "warning" | "conflict"
    conflicts: list[FeasibilityConflict] = Field(default_factory=list)


# --- Brief AI Rewrite ---

class BriefRewriteRequest(BaseModel):
    """Input for AI-powered mission rewrite."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class BriefRewriteResponse(BaseModel):
    """AI-rewritten mission statement."""
    rewritten_mission: str
    changes_summary: str  # brief explanation of what was improved
    evidence_references: list[EvidenceReference] = Field(default_factory=list)


class ConstraintSuggestRequest(BaseModel):
    """Input for AI constraint suggestions based on mission context."""
    project_id: str
    mission: str
    existing_constraints: list[str] = Field(default_factory=list)


class SuggestedConstraint(BaseModel):
    description: str
    source: str
    rationale: str = ""
    ref_ids: list[str] = Field(default_factory=list)  # which evidence refs support this


class ConstraintSuggestResponse(BaseModel):
    suggestions: list[SuggestedConstraint]
    evidence_references: list[EvidenceReference] = Field(default_factory=list)


class KpiSuggestRequest(BaseModel):
    """Input for AI KPI suggestions based on mission and constraints."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    existing_kpis: list[str] = Field(default_factory=list)


class SuggestedKpi(BaseModel):
    kpi_name: str
    target_value: str
    unit: str
    measurement_method: str
    rationale: str = ""
    ref_ids: list[str] = Field(default_factory=list)  # which evidence refs support this


class KpiSuggestResponse(BaseModel):
    suggestions: list[SuggestedKpi]
    evidence_references: list[EvidenceReference] = Field(default_factory=list)


# --- 5W1H Task Definition ---

class TaskDef5W1HRequest(BaseModel):
    """Generate 5W1H task definition from mission + constraints + KPIs."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class TaskDef5W1HResponse(BaseModel):
    """AI-generated 5W1H task definition."""
    who: str
    what: str
    where: str
    when: str
    why: str
    how: str
    evidence_references: list[EvidenceReference] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Step 2: Socratic Questions
# ---------------------------------------------------------------------------

class SocraticRequest(BaseModel):
    """Generate Socratic questions based on brief + constraints."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    existing_questions: list[str] = Field(default_factory=list)


class SocraticQuestion(BaseModel):
    # 內部欄位叫 category，但可接受輸入 key = type_class
    category: str = Field(validation_alias="type_class") # clarification, assumption, consequence, counter, origin, reflection, reframing
    text: str
    suggested_tag: str | None = None  # assumption, contradiction, or None


class SocraticResponse(BaseModel):
    questions: list[SocraticQuestion]


# --- Socratic Follow-up (answer depth analysis) ---

class AnsweredQuestion(BaseModel):
    id: str = ""
    category: str
    question: str
    answer: str


class SocraticFollowUpRequest(BaseModel):
    """Analyze answer depth and generate targeted follow-up questions."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    answered_questions: list[AnsweredQuestion]


class FollowUpItem(BaseModel):
    category: str = Field(validation_alias="type_class")
    text: str
    reason: str  # why this follow-up is needed


class SocraticFollowUpResponse(BaseModel):
    follow_ups: list[FollowUpItem] = Field(default_factory=list)
    depth_sufficient: bool = False


# --- Socratic Brief Impact Evaluation ---

class ExistingQuestionItem(BaseModel):
    id: str
    category: str
    text: str
    answer: str = ""


class SocraticBriefImpactRequest(BaseModel):
    """Evaluate which Socratic questions are affected by a Brief change."""
    project_id: str
    new_mission: str
    new_constraints: list[str] = Field(default_factory=list)
    existing_questions: list[ExistingQuestionItem]


class AffectedQuestionItem(BaseModel):
    id: str
    reason: str
    replacement: SocraticQuestion


class SocraticBriefImpactResponse(BaseModel):
    affected: list[AffectedQuestionItem] = Field(default_factory=list)
    unaffected_ids: list[str] = Field(default_factory=list)


# --- Socratic Auto-Tag (hidden assumption/contradiction detection) ---

class UntaggedQuestion(BaseModel):
    id: str
    category: str
    text: str
    answer: str = ""


class SocraticAutoTagRequest(BaseModel):
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    existing_assumptions: list[str] = Field(default_factory=list)
    existing_contradictions: list[str] = Field(default_factory=list)
    untagged_questions: list[UntaggedQuestion]


class AutoTagSuggestion(BaseModel):
    question_id: str
    suggested_tag: str  # "assumption" | "contradiction" | "none"
    reason: str = ""


class SocraticAutoTagResponse(BaseModel):
    suggestions: list[AutoTagSuggestion] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Step 3: CLD Generation
# ---------------------------------------------------------------------------

class CldGenerationRequest(BaseModel):
    project_id: str
    contradictions: list[str]
    assumptions: list[str]
    mission: str = ""
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class CldNode(BaseModel):
    id: str
    label: str
    type: str = "variable"


class CldEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    polarity: str = "+"
    source_id: str = ""


class CldLoop(BaseModel):
    id: str
    type: str  # "reinforcing" | "balancing"
    node_ids: list[str]


class CldBreakpoint(BaseModel):
    node_id: str
    rationale: str = ""


class CldGenerationResponse(BaseModel):
    nodes: list[CldNode]
    edges: list[CldEdge]
    loops: list[CldLoop] = Field(default_factory=list)
    breakpoints: list[CldBreakpoint]


# ---------------------------------------------------------------------------
# Validation Passport (shared — attached to any solution hypothesis)
# ---------------------------------------------------------------------------

class ValidationPassportAssumption(BaseModel):
    """A single assumption declared by the solution itself."""
    content: str
    category: str = "physics"  # physics / material / cost / manufacturing / regulatory / integration
    evidence_level: str = "E0"  # E0 (none) → E1 (reasoning) → E2 (analogy) → E3 (test) → E4 (production)
    worst_consequence: str = ""
    worst_severity: str = "medium"  # critical / high / medium / low
    suggested_experiment: str = ""


class ValidationPassport(BaseModel):
    """Self-declared validation record for a solution hypothesis."""
    assumptions: list[ValidationPassportAssumption] = Field(default_factory=list)
    weak_points: list[str] = Field(default_factory=list)
    required_verifications: list[str] = Field(default_factory=list)
    cross_domain_source: str = ""
    confidence_level: float = Field(ge=0, le=1, default=0.5)


# ---------------------------------------------------------------------------
# Step 5-0: Anti-Anchor Routes
# ---------------------------------------------------------------------------

class AntiAnchorRequest(BaseModel):
    project_id: str
    mission: str
    current_constraints: list[str]
    existing_alternatives: list[str] = Field(default_factory=list)


class AntiAnchorRoute(BaseModel):
    name: str
    mechanism: str = ""  # core mechanism description
    description: str
    is_non_typical: bool = True
    rationale: str = ""
    why_unconventional: str = ""
    potential_advantage: str = ""
    cross_domain_source: str = ""
    validation_passport: ValidationPassport | None = None


class AntiAnchorResponse(BaseModel):
    routes: list[AntiAnchorRoute]


# ---------------------------------------------------------------------------
# Validation Passport Generation (on-demand for solutions without one)
# ---------------------------------------------------------------------------

class ValidationPassportRequest(BaseModel):
    project_id: str
    solution_name: str
    mechanism: str
    source: str = ""  # triz_tc / triz_pc / scamper / anti_anchor / manual
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class ValidationPassportResponse(BaseModel):
    validation_passport: ValidationPassport


# ---------------------------------------------------------------------------
# Step 5a: TRIZ Solver
# ---------------------------------------------------------------------------

class TrizLookupRequest(BaseModel):
    """TRIZ contradiction matrix lookup + principle instantiation."""
    project_id: str
    contradiction_id: str
    natural_description: str
    improving_param: int | None = None
    worsening_param: int | None = None
    physical_contradiction: str | None = None
    type: str = "TC"  # TC or PC


class TrizSuggestion(BaseModel):
    path: str  # TC, PC, or SuField
    principle_number: int | None = None
    principle_name: str = ""
    suggestion: str
    affected_modules: list[str] = Field(default_factory=list)
    secondary_contradictions: list[str] = Field(default_factory=list)


class TrizLookupResponse(BaseModel):
    mapped_improving: int | None = None
    mapped_worsening: int | None = None
    candidate_principles: list[int] = Field(default_factory=list)
    suggestions: list[TrizSuggestion]


# ---------------------------------------------------------------------------
# Step 5a-3: Su-Field Analysis (76 Standard Solutions)
# ---------------------------------------------------------------------------

class SuFieldRequest(BaseModel):
    """Su-Field model analysis + 76 standard solutions matching."""
    project_id: str
    system_description: str
    current_issues: list[str] = Field(default_factory=list)


class MatchedStandardSolution(BaseModel):
    standard_id: str          # e.g. "1.1.1"
    standard_name: str        # e.g. "Build Complete Su-Field"
    class_name: str           # e.g. "Class 1"
    suggestion: str
    affected_modules: list[str] = Field(default_factory=list)
    secondary_contradictions: list[str] = Field(default_factory=list)


class SuFieldResponse(BaseModel):
    su_field: dict             # {S1, S2, F}
    system_state: str          # incomplete | effective | harmful | insufficient
    matched_solutions: list[MatchedStandardSolution]


# ---------------------------------------------------------------------------
# Step 5c: SCAMPER
# ---------------------------------------------------------------------------

class ScamperRequest(BaseModel):
    project_id: str
    subsystem_name: str
    subsystem_description: str
    related_contradictions: list[str] = Field(default_factory=list)


class ScamperVariant(BaseModel):
    action: str  # Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse
    description: str
    potential_benefits: str = ""
    new_contradictions: list[str] = Field(default_factory=list)


class ScamperResponse(BaseModel):
    variants: list[ScamperVariant]


# ---------------------------------------------------------------------------
# Step 6: Risk Analysis
# ---------------------------------------------------------------------------

class RiskAnalysisRequest(BaseModel):
    project_id: str
    alternative_name: str
    mechanism: str
    assumptions: list[str] = Field(default_factory=list)


class RiskSuggestion(BaseModel):
    description: str
    failure_mode: str
    probability: int = Field(ge=1, le=5)
    severity: int = Field(ge=1, le=5)
    mitigation: str


class RiskAnalysisResponse(BaseModel):
    risks: list[RiskSuggestion]


# ---------------------------------------------------------------------------
# Step 7: Action Suggestions
# ---------------------------------------------------------------------------

class ActionSuggestRequest(BaseModel):
    project_id: str
    selected_alternative: str
    rationale: str
    risks: list[str] = Field(default_factory=list)


class ActionSuggestion(BaseModel):
    description: str
    assignee_role: str
    suggested_due_days: int = 14


class ActionSuggestResponse(BaseModel):
    actions: list[ActionSuggestion]


# ---------------------------------------------------------------------------
# Contradiction Convergence (Step 5a-6)
# ---------------------------------------------------------------------------

class ConvergenceAlternativeInput(BaseModel):
    """Rich alternative payload for convergence scanning."""
    id: str
    name: str
    mechanism: str
    source: str = ""  # triz_tc / triz_pc / triz_sf / scamper / manual / ai_integrated
    resolves_contradiction_ids: list[str] = Field(default_factory=list)


class ConvergenceContradictionInput(BaseModel):
    """Rich contradiction payload for convergence scanning."""
    id: str
    natural_description: str
    severity: str  # fatal / major / minor
    resolved: bool = False
    type: str | None = None  # TC or PC
    improving_param: int | None = None  # TRIZ 39-param number
    worsening_param: int | None = None
    engineering_statement: str = ""
    physical_contradiction: str = ""


class ConvergenceScanRequest(BaseModel):
    project_id: str
    alternatives: list[ConvergenceAlternativeInput] = Field(default_factory=list)
    contradictions: list[ConvergenceContradictionInput]
    mission: str = ""
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    phase: str = "B"  # "A" = contradiction-only, "B" = full cross-check


class SecondaryContradiction(BaseModel):
    description: str
    severity: str  # fatal, major, minor
    source_alternative: str = ""  # empty in Phase A (no alternatives)
    type: str = "TC"  # TC or PC
    improving_param: int | None = None
    worsening_param: int | None = None
    reasoning: str = ""


class ConvergenceScanResponse(BaseModel):
    new_contradictions: list[SecondaryContradiction]
    convergence_score: float  # 0-100 integer scale
    architecture_health: str  # healthy, warning, critical
    force_pause: bool = False
    pause_reason: str = ""
    reasoning_trace: str = ""
    phase: str = "B"  # echo back which phase produced this result

    @model_validator(mode="before")
    @classmethod
    def normalize_keys(cls, values):
        # Accept LLM output key 'secondary_contradictions' -> 'new_contradictions'
        if isinstance(values, dict):
            if "secondary_contradictions" in values and "new_contradictions" not in values:
                values["new_contradictions"] = values.pop("secondary_contradictions")
            # Accept 0-1 scale and normalise to 0-100
            score = values.get("convergence_score", 0)
            if isinstance(score, (int, float)) and score <= 1.0:
                values["convergence_score"] = round(score * 100)
        return values


# ---------------------------------------------------------------------------
# MUST Evaluation (AI-assisted Go/No-Go)
# ---------------------------------------------------------------------------

class MustCriterionConfig(BaseModel):
    """A single MUST criterion derived from Brief constraints/KPIs."""
    id: str  # e.g. "M1"
    label: str  # e.g. "效率 ≥ 95%"
    source: str  # which constraint/KPI this comes from
    threshold: str = ""  # quantitative threshold if applicable


class MustEvaluationRequest(BaseModel):
    """Evaluate one alternative against project MUST criteria."""
    project_id: str
    alternative_name: str
    mechanism: str
    must_criteria: list[MustCriterionConfig]
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class MustCriterionResult(BaseModel):
    """AI pre-judgment for a single MUST criterion."""
    id: str
    label: str
    passed: bool | None  # true=pass, false=fail, null=insufficient data
    confidence: float = Field(ge=0, le=1)  # 0~1
    reasoning: str  # why AI judged this way
    evidence_sources: list[str] = Field(default_factory=list)


class MustEvaluationResponse(BaseModel):
    """AI pre-filled MUST results for RD to confirm/override."""
    criteria_results: list[MustCriterionResult]
    overall_pass: bool | None  # null if any criterion is null
    summary: str  # brief overall assessment


# ---------------------------------------------------------------------------
# Contradiction Formalization (SOW: POST /contradictions/{cid}/formalize)
# ---------------------------------------------------------------------------

class ContradictionFormalizeRequest(BaseModel):
    """Formalize a natural-language contradiction into TRIZ sentence."""
    project_id: str
    contradiction_id: str
    natural_description: str
    mission: str = ""
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class ContradictionFormalizeResponse(BaseModel):
    """TRIZ-formalized contradiction."""
    engineering_statement: str
    improving_param: int | None = None
    worsening_param: int | None = None
    physical_contradiction: str | None = None
    pc_attribute_a: str | None = None
    pc_attribute_not_a: str | None = None
    type: str = "TC"  # TC or PC
    confidence: float = Field(ge=0, le=1, default=0.7)


# ---------------------------------------------------------------------------
# Assumption Extraction (SOW: POST /assumptions/extract)
# ---------------------------------------------------------------------------

class AssumptionExtractRequest(BaseModel):
    """Extract assumptions from Socratic question answers."""
    project_id: str
    questions_and_answers: list[dict] = Field(default_factory=list)
    mission: str = ""
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    existing_assumptions: list[str] = Field(default_factory=list)


class ExtractedAssumption(BaseModel):
    content: str
    source: str = ""
    worst_consequence: str = ""
    worst_severity: str = "medium"  # critical, high, medium, low


class AssumptionExtractResponse(BaseModel):
    assumptions: list[ExtractedAssumption]


# ---------------------------------------------------------------------------
# SCAMPER Subsystem Suggestions (SOW: GET /scamper/subsystem-suggestions)
# ---------------------------------------------------------------------------

class SubsystemSuggestRequest(BaseModel):
    """Suggest subsystems for SCAMPER analysis."""
    project_id: str
    mission: str
    contradictions: list[str] = Field(default_factory=list)
    existing_subsystems: list[str] = Field(default_factory=list)


class SuggestedSubsystem(BaseModel):
    name: str
    reason: str
    related_contradictions: list[str] = Field(default_factory=list)


class SubsystemSuggestResponse(BaseModel):
    subsystems: list[SuggestedSubsystem]


# ---------------------------------------------------------------------------
# SCAMPER Feedback Contradictions (SOW: POST /scamper/feedback-contradictions)
# ---------------------------------------------------------------------------

class ScamperFeedbackRequest(BaseModel):
    """Feed SCAMPER-generated contradictions back to contradiction management."""
    project_id: str
    new_contradictions: list[dict] = Field(default_factory=list)


class ScamperFeedbackResponse(BaseModel):
    created_count: int
    deduplicated_count: int
    contradiction_ids: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pre-CAD AI Analysis (SOW: POST /pre-cad-reviews/{rid}/ai-analyze)
# ---------------------------------------------------------------------------

class PreCadAnalyzeRequest(BaseModel):
    """AI analysis of Pre-CAD 5D review."""
    project_id: str
    alternative_name: str
    mechanism: str
    constraints: list[str] = Field(default_factory=list)


class PreCadAnalyzeResponse(BaseModel):
    """5D AI scores and analysis."""
    spatial_score: int = Field(ge=1, le=5)
    cost_score: int = Field(ge=1, le=5)
    safety_score: int = Field(ge=1, le=5)
    decoupling_score: int = Field(ge=1, le=5)
    supply_score: int = Field(ge=1, le=5)
    overall_pass: bool
    analysis: str
    evidence_references: list[EvidenceReference] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# WANT Criteria Seed (SOW: POST /want/criteria/seed)
# ---------------------------------------------------------------------------

class WantSeedRequest(BaseModel):
    """Seed WANT criteria from mission + constraints + KPIs."""
    project_id: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)


class SuggestedWantCriterion(BaseModel):
    name: str
    description: str
    weight: int = Field(ge=1, le=10, default=5)
    anchors: dict = Field(default_factory=dict)  # {1: "poor", 3: "fair", 5: "excellent"}


class WantSeedResponse(BaseModel):
    criteria: list[SuggestedWantCriterion]


# ---------------------------------------------------------------------------
# Gate Check (SOW: GET /gates/{gate_id}/check)
# ---------------------------------------------------------------------------

class GateCheckItem(BaseModel):
    label: str
    met: bool
    detail: str = ""


class AiReviewResult(BaseModel):
    """AI evaluator result attached to a gate check (optional)."""
    evaluator: str          # "must" | "pre_cad" | "convergence"
    summary: str
    confidence: float = 0.0
    details: dict = Field(default_factory=dict)


class GateCheckResponse(BaseModel):
    gate_id: str
    passed: bool
    failed_reasons: list[str] = Field(default_factory=list)
    checklist_items: list[GateCheckItem] = Field(default_factory=list)
    ai_review: AiReviewResult | None = None


# ---------------------------------------------------------------------------
# Export (SOW: POST /export)
# ---------------------------------------------------------------------------

class ExportRequest(BaseModel):
    project_id: str
    format: str = "markdown"  # markdown or json
    sections: list[str] = Field(default_factory=list)  # empty = all sections


class ExportResponse(BaseModel):
    content: str
    format: str
    filename: str


# ---------------------------------------------------------------------------
# Knowledge Writeback (SOW: POST /knowledge/writeback)
# ---------------------------------------------------------------------------

class KnowledgeWritebackRequest(BaseModel):
    project_id: str
    asset_types: list[str] = Field(default_factory=list)  # empty = all 6 types


class WrittenAsset(BaseModel):
    asset_type: str
    title: str
    id: str


class KnowledgeWritebackResponse(BaseModel):
    written_count: int
    assets: list[WrittenAsset] = Field(default_factory=list)
