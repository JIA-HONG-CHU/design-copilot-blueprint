"""System prompts for Evaluator Agent.

Domain-agnostic — all product/industry context comes from user input.
Follows Anthropic Claude prompting best practices: XML tags, strict schemas.
"""

EVALUATOR_SYSTEM = """\
You are a design-decision evaluation specialist integrated into a structured \
concept-design platform.

<responsibilities>
- MUST rule verification (Go / No-Go screening)
- KT decision analysis (WANT weighted scoring + Adverse Consequences)
- Evidence-quality grading (E-level assessment)
- Phase-gate determination
- Solution-diversity scoring
- Pre-CAD five-dimension review
</responsibilities>

<output_rules>
- MUST verdicts: strictly Pass or Fail — never ambiguous.
- WANT scores: 1–5 with justification.
- Risk grading: probability (1–5) × severity (1–5).
- Evidence levels: E0 (none) → E1 (reasoning) → E2 (analogy) → E3 (test data) → E4 (production-validated).
- Respond in the user's language (default: 繁體中文).
- Return only the JSON requested — no preamble, no markdown fences.
</output_rules>
"""

# ---------------------------------------------------------------------------
# Risk Analysis
# ---------------------------------------------------------------------------

RISK_ANALYSIS = """\
<task>
Perform a risk analysis on the design alternative below.
</task>

<context>
<alternative>
  <name>{alternative_name}</name>
  <mechanism>{mechanism}</mechanism>
</alternative>
<related_assumptions>
{assumptions}
</related_assumptions>
</context>

<instructions>
Identify the main risks. For each:
1. **description** — What could go wrong.
2. **failure_mode** — Specific failure scenario.
3. **probability** — 1 (rare) to 5 (almost certain).
4. **severity** — 1 (negligible) to 5 (catastrophic).
5. **mitigation** — Concrete risk-reduction action.

Risk grading:
- P×S ≥ 15 → Critical — must mitigate before proceeding
- P×S ≥ 9  → High    — mitigation required
- P×S ≥ 4  → Medium  — mitigation recommended
- P×S < 4  → Low     — log and monitor
</instructions>

<output_schema>
{{
  "risks": [
    {{
      "description": "...",
      "failure_mode": "...",
      "probability": 3,
      "severity": 4,
      "level": "High",
      "mitigation": "..."
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# MUST Evaluation
# ---------------------------------------------------------------------------

MUST_EVALUATION = """\
<task>
Evaluate the design alternative against MUST criteria (Go / No-Go screening).
</task>

<context>
<alternative>
  <name>{alternative_name}</name>
  <mechanism>{mechanism}</mechanism>
</alternative>
<project_constraints>
{constraints}
</project_constraints>
<project_kpis>
{kpis}
</project_kpis>
<must_criteria>
{must_criteria}
</must_criteria>
</context>

<instructions>
For each MUST criterion:
1. **passed** — true (pass) / false (fail) / null (insufficient data).
2. **confidence** — 0–1:
   - ≥ 0.8: high (backed by data or physics)
   - 0.5–0.8: medium (supported by analogy or reasoning)
   - < 0.5: low (speculative — flag for engineer review)
3. **reasoning** — Cite specific data from the mechanism description or physical principles.
4. **evidence_sources** — Where the judgement came from.

Overall logic:
- Any MUST = Fail → overall_pass = false
- Any MUST = null → overall_pass = null (needs more data)
- All MUST = Pass → overall_pass = true
</instructions>

<output_schema>
{{
  "criteria_results": [
    {{
      "id": "M1",
      "label": "...",
      "passed": true,
      "confidence": 0.9,
      "reasoning": "...",
      "evidence_sources": ["..."]
    }}
  ],
  "overall_pass": true,
  "summary": "One-sentence summary"
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Pre-CAD Analysis
# ---------------------------------------------------------------------------

PRE_CAD_ANALYSIS = """\
<task>
Perform a Pre-CAD five-dimension review of the design alternative.
</task>

<context>
<alternative>
  <name>{alternative_name}</name>
  <mechanism>{mechanism}</mechanism>
</alternative>
<project_constraints>
{constraints}
</project_constraints>
</context>

<instructions>
Score each dimension 1–5:

1. **Spatial** — Volume, mass, geometric interference.
2. **Cost** — BOM cost, manufacturing process cost, tooling investment.
3. **Safety** — Structural strength, electrical safety, thermal safety.
4. **Decoupling** — Modularity, coupling with other subsystems.
5. **Supply** — Key-component availability, supplier risk.

Pass rule:
- Any dimension ≤ 2 → overall_pass = false
- All dimensions ≥ 3 → overall_pass = true
</instructions>

<output_schema>
{{
  "spatial_score": 4,
  "cost_score": 3,
  "safety_score": 5,
  "decoupling_score": 3,
  "supply_score": 4,
  "overall_pass": true,
  "analysis": "Overall assessment (50–200 words)"
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# WANT Criteria Seed
# ---------------------------------------------------------------------------

WANT_CRITERIA_SEED = """\
<task>
Generate WANT scoring criteria for KT Decision Analysis.
</task>

<context>
<mission>{mission}</mission>
<constraints>
{constraints}
</constraints>
<kpis>
{kpis}
</kpis>
</context>

<instructions>
Create 4–6 WANT criteria. For each:
1. **name** — Short label.
2. **description** — What is being scored.
3. **weight** — 1–10 (10 = most important).
4. **anchors** — Scoring anchors: {{1: worst, 3: average, 5: best}}.

Rules:
- WANT criteria must NOT overlap with MUST criteria (MUST = Go/No-Go; WANT = bonus points).
- Distribute weights realistically — avoid giving every criterion a high weight.
- Anchors must be specific enough to enable objective scoring.
</instructions>

<output_schema>
{{
  "criteria": [
    {{
      "name": "Criterion name",
      "description": "What this measures",
      "weight": 7,
      "anchors": {{"1": "Worst case", "3": "Average", "5": "Best case"}}
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Convergence Scan
# ---------------------------------------------------------------------------

CONVERGENCE_SCAN = """\
<task>
Scan the current alternatives and contradictions to assess convergence health.
</task>

<context>
<mission>{mission}</mission>
<project_constraints>
{constraints}
</project_constraints>
<project_kpis>
{kpis}
</project_kpis>
<alternatives>
{alternatives}
</alternatives>
<contradictions>
{contradictions}
</contradictions>
</context>

<instructions>
1. Identify secondary contradictions — new conflicts introduced by proposed solutions.
2. Grade each: Fatal / Major / Minor.
   - Fatal: concept is fundamentally infeasible.
   - Major: requires additional solving before proceeding.
   - Minor: log in risk register, does not block progress.
3. Compute a convergence_score (0–1; 1 = fully converged).
4. Assess architecture health:
   - > 0.8 → healthy
   - 0.5–0.8 → warning
   - < 0.5 → critical
5. If unresolved Fatal contradictions exist → force_pause = true.
</instructions>

<output_schema>
{{
  "secondary_contradictions": [
    {{"description": "...", "severity": "major", "source_alternative": "..."}}
  ],
  "convergence_score": 0.72,
  "architecture_health": "warning",
  "force_pause": false,
  "summary": "Brief assessment"
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Brief Quality Review (Gate 1.1 AI evaluator)
# ---------------------------------------------------------------------------

BRIEF_QUALITY_REVIEW = """\
<task>
Assess the quality of a design brief — is the mission statement precise, \
are the KPIs truly measurable, and are the constraints well-defined?
</task>

<context>
<mission>{mission}</mission>
<constraints>
{constraints}
</constraints>
<kpis>
{kpis}
</kpis>
</context>

<instructions>
Score each dimension 1–5:

1. **mission_score** — Clarity, specificity, and quantifiability of the mission statement.
   - 5: Fully quantified, testable, unambiguous.
   - 3: Contains measurable elements but some vague terms remain.
   - 1: Entirely qualitative or vague ("make it better").
2. **kpi_score** — Measurability and completeness of KPIs.
   - 5: All KPIs have clear target values, units, and repeatable measurement methods.
   - 3: Most KPIs are measurable but some lack methods or have ambiguous targets.
   - 1: KPIs are vague or missing measurement methods.
3. **constraint_score** — Precision and verifiability of constraints.
   - 5: All constraints have clear pass/fail thresholds.
   - 3: Some constraints are qualitative or lack numeric limits.
   - 1: Constraints are vague or self-contradictory.

Compute overall_score as the minimum of the three scores.
Provide 1–3 concrete suggestions for improvement.
</instructions>

<output_schema>
{{
  "mission_score": 4,
  "kpi_score": 3,
  "constraint_score": 4,
  "overall_score": 3,
  "summary": "One-sentence quality assessment",
  "suggestions": ["Specific improvement suggestion"]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Depth Quality Review (Gate 1.2 AI evaluator)
# ---------------------------------------------------------------------------

DEPTH_QUALITY_REVIEW = """\
<task>
Assess whether the assumptions and contradictions identified so far \
are substantive and cover the critical dimensions of the design problem.
</task>

<context>
<mission>{mission}</mission>
<assumptions>
{assumptions}
</assumptions>
<contradictions>
{contradictions}
</contradictions>
</context>

<instructions>
Score each dimension 1–5:

1. **assumption_depth_score** — Do assumptions cover safety, physics, cost, \
manufacturing, supply chain, and regulatory dimensions?
   - 5: Comprehensive coverage across all critical dimensions.
   - 3: Covers major dimensions but misses 1–2 important areas.
   - 1: Shallow or redundant — mostly restating the obvious.
2. **contradiction_depth_score** — Are contradictions genuine engineering trade-offs \
(not trivial or tautological)?
   - 5: All contradictions are non-trivial, well-articulated trade-offs.
   - 3: Mix of substantive and superficial contradictions.
   - 1: Contradictions are trivial or poorly defined.

Compute overall_score as the minimum of the two scores.
List any blind_spots — critical dimensions that are completely unaddressed.
</instructions>

<output_schema>
{{
  "assumption_depth_score": 3,
  "contradiction_depth_score": 4,
  "overall_score": 3,
  "summary": "One-sentence depth assessment",
  "blind_spots": ["Dimension or topic not yet explored"]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Experiment Coverage Review (Gate 2.1 AI evaluator)
# ---------------------------------------------------------------------------

EXPERIMENT_COVERAGE_REVIEW = """\
<task>
Assess whether the planned experiments adequately validate the high-risk assumptions.
</task>

<context>
<high_risk_assumptions>
{high_risk_assumptions}
</high_risk_assumptions>
<experiments>
{experiments}
</experiments>
</context>

<instructions>
Score overall coverage 1–5:

1. **coverage_score**:
   - 5: Every high-risk assumption has a well-designed experiment that directly tests it.
   - 3: Most are covered, but some experiments are tangential or missing.
   - 1: Major gaps — critical assumptions lack any experimental validation.

For each uncovered or weakly covered assumption, explain:
- **uncovered_assumptions** — assumptions with no matching experiment.
- **weak_experiments** — experiments that exist but are unlikely to decisively \
validate the assumption (wrong method, insufficient precision, etc.).
</instructions>

<output_schema>
{{
  "coverage_score": 3,
  "summary": "One-sentence coverage assessment",
  "uncovered_assumptions": ["Assumption code + brief reason"],
  "weak_experiments": ["Experiment description + why it's weak"]
}}
</output_schema>
"""
