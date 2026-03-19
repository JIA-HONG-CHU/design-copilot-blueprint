"""System prompts for Analyst Agent.

Generalized for any product/system design domain.
The project context (industry, product type, constraints) comes entirely
from user-supplied data — never hardcoded into prompts.

Prompt design follows Anthropic's Claude prompting best practices:
- XML tags for structure
- Clear role without domain lock-in
- Strict JSON schema with examples
- Motivation/context for key rules
"""

ANALYST_SYSTEM = """\
You are a senior systems-engineering analyst embedded in a structured \
concept-design platform. Your role spans requirement decomposition, \
Socratic questioning, causal-loop modelling, contradiction identification, \
assumption elicitation, and feasibility assessment.

<capabilities>
- Semantic parsing and structured decomposition of requirements
- Hidden-assumption detection across disciplines
- Physical / economic / regulatory feasibility analysis
- Problem reframing (Socratic Type-7)
- Solution–module coupling impact analysis
- Contradiction severity grading (Fatal / Major / Minor)
</capabilities>

<output_rules>
- Respond in the user's language (default: 繁體中文). Keep technical terms in English.
- Every constraint must carry: code, description, source, type (hard/soft), feasibility.
- Contradiction format: "Improving X worsens Y."
- Assumption status: challenged / confirmed / unknown.
- Return **only** the JSON requested — no preamble, no markdown fences, no commentary.
</output_rules>
"""

# ---------------------------------------------------------------------------
# Brief Extraction
# ---------------------------------------------------------------------------

BRIEF_EXTRACTION = """\
<task>
Extract structured information from the raw requirement text below.
</task>

<input>
{raw_text}
</input>

<instructions>
1. Identify constraints — distinguish hard (violate → kill the concept) from soft (trade-off acceptable).
2. Identify measurable KPIs — each must have a target value, unit, and measurement method.
3. Surface hidden assumptions — mark each as "unknown" pending verification.
4. Flag feasibility warnings — physical-limit violations, conflicting constraints, etc.
5. Assign each constraint a unique code in C-001 format.
6. Be concise. Do not add analytical commentary outside the JSON.
</instructions>

<output_schema>
Return exactly this JSON structure — four top-level keys, no more, no fewer:
{{
  "constraints": [
    {{"code": "C-001", "description": "...", "source": "...", "type": "hard|soft", "feasibility": "feasible|marginal|impossible|unknown"}}
  ],
  "kpis": [
    {{"name": "...", "target_value": "...", "unit": "...", "measurement_method": "..."}}
  ],
  "assumptions": ["string describing the assumption"],
  "feasibility_warnings": ["string describing the warning"]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Socratic Questions
# ---------------------------------------------------------------------------

SOCRATIC_QUESTIONS = """\
<task>
Generate Socratic questions that probe the design task below.
</task>

<context>
<mission>{mission}</mission>
<known_constraints>
{constraints}
</known_constraints>
<existing_questions_to_avoid>
{existing_questions}
</existing_questions_to_avoid>
</context>

<instructions>
Cover all seven Socratic question types, at least one question per type:

1. **Clarification** — "What specifically do you mean by X?"
2. **Assumption** — "Why must we assume X?" → tag: "assumption"
3. **Consequence** — "If X fails, what is the impact?"
4. **Counter-example** — "Is there a precedent that succeeded without X?"
5. **Origin** — "What is the root cause behind this requirement?"
6. **Reflection** — "Could experience bias be shaping this conclusion?"
7. **Reframing** — "If we ignored the current architecture entirely, how would we solve this?"

If a question hints at a contradiction, add suggested_tag: "contradiction".
Do not repeat questions already listed above.
</instructions>

<output_schema>
{{
  "questions": [
    {{
      "type_class": "clarification|assumption|consequence|counter|origin|reflection|reframing",
      "text": "The question",
      "suggested_tag": null or "assumption" or "contradiction"
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# CLD Generation
# ---------------------------------------------------------------------------

CLD_GENERATION = """\
<task>
Build a Causal Loop Diagram (CLD) from the contradictions and assumptions below.
</task>

<context>
<mission>{mission}</mission>
<known_constraints>
{constraints}
</known_constraints>
<known_kpis>
{kpis}
</known_kpis>
<contradictions>
{contradictions}
</contradictions>
<assumptions>
{assumptions}
</assumptions>
</context>

<instructions>
1. Create nodes — one per variable, id as a short English abbreviation.
2. Create edges — mark polarity:
   - `+` same-direction (A↑ → B↑)
   - `−` opposite-direction (A↑ → B↓)
3. Identify reinforcing loops (R) and balancing loops (B).
4. Mark breakpoints — system leverage points where an intervention could break a vicious cycle.
</instructions>

<output_schema>
{{
  "nodes": [{{"id": "EFF", "label": "Efficiency"}}],
  "edges": [{{"from": "EFF", "to": "COST", "polarity": "-"}}],
  "loops": [{{"id": "R1", "type": "reinforcing", "node_ids": ["EFF","PERF"]}}],
  "breakpoints": [{{"node_id": "EFF", "rationale": "..."}}]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Mission Rewrite
# ---------------------------------------------------------------------------

MISSION_REWRITE = """\
<task>
Rewrite the following design mission statement with precise, quantifiable engineering language.
</task>

<context>
<original_mission>{mission}</original_mission>
<known_constraints>
{constraints}
</known_constraints>
<known_kpis>
{kpis}
</known_kpis>
{evidence_context}
</context>

<instructions>
1. Use this template: "Given [scenario/context], the system shall [core behaviour], \
subject to [key metric] ≤/≥ [limit]."
2. Replace vague terms with quantifiable descriptions (e.g. "high efficiency" → "efficiency ≥ X%").
3. Incorporate key values from constraints and KPIs.
4. Preserve the original intent — do not invent requirements that were never stated.
5. Keep the rewritten mission between 50 and 150 characters (Chinese) or 30–80 words (English).
</instructions>

<output_schema>
{{
  "rewritten_mission": "The rewritten mission statement",
  "changes_summary": "Brief description of what changed and why (≤30 words)"
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Constraint Suggestion
# ---------------------------------------------------------------------------

CONSTRAINT_SUGGESTION = """\
<task>
Suggest hard constraints that may be missing from the current design brief.
</task>

<context>
<mission>{mission}</mission>
<existing_constraints>
{existing_constraints}
</existing_constraints>
{evidence_context}
</context>

<instructions>
1. Think across these dimensions: safety, regulations/standards, physical limits, \
interface compatibility, environmental conditions, manufacturability.
2. Each constraint must be verifiable (clear pass/fail criterion).
3. Cite evidence references where available; otherwise mark source as "engineering reasoning".
4. Suggest 2–4 constraints. Do not duplicate existing ones.
5. Tailor suggestions to the domain implied by the mission — do NOT assume a specific industry.
</instructions>

<output_schema>
{{
  "suggestions": [
    {{
      "description": "Constraint description with numeric threshold if applicable",
      "source": "Reference standard or 'engineering reasoning'",
      "rationale": "Why this constraint matters",
      "ref_ids": ["WEB-SEARCH-001"]
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# KPI Suggestion
# ---------------------------------------------------------------------------

KPI_SUGGESTION = """\
<task>
Suggest measurable Key Performance Indicators (KPIs) for the design task.
</task>

<context>
<mission>{mission}</mission>
<known_constraints>
{constraints}
</known_constraints>
<existing_kpis>
{existing_kpis}
</existing_kpis>
{evidence_context}
</context>

<instructions>
1. Every KPI must be measurable — specify target value, unit, and measurement method.
2. Prefer citing test standards from evidence references; otherwise note "engineering estimate".
3. Suggest 2–4 KPIs. Do not duplicate existing ones.
4. Cover diverse aspects: performance, durability, safety, cost, etc.
5. Base target values on evidence or industry benchmarks when available.
</instructions>

<output_schema>
{{
  "suggestions": [
    {{
      "kpi_name": "Indicator name",
      "target_value": "Target",
      "unit": "Unit",
      "measurement_method": "How to measure (include standard ID if available)",
      "rationale": "Why this KPI matters",
      "ref_ids": ["WEB-SEARCH-001"]
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# 5W1H Task Definition
# ---------------------------------------------------------------------------

TASK_DEF_5W1H = """\
<task>
Produce a 5W1H task-definition table for the design mission.
</task>

<context>
<mission>{mission}</mission>
<constraints>
{constraints}
</constraints>
<kpis>
{kpis}
</kpis>
{evidence_context}
</context>

<instructions>
1. **Who** — Name concrete roles (e.g. "Mechanical Design Engineer", "Test Engineer", "Supplier QA"), not just "the team".
2. **What** — Specific deliverables and technical actions.
3. **Where** — Execution environments (lab, production line, field test site) with required equipment/conditions.
4. **When** — Timeline with milestones (prototype, validation, production).
5. **Why** — Link to business objectives or technical necessity; explain urgency.
6. **How** — Methodology overview (e.g. TRIZ analysis, DFMEA, DOE) and verification strategy.
Each field: 50–150 words.
</instructions>

<output_schema>
{{
  "who": "...",
  "what": "...",
  "where": "...",
  "when": "...",
  "why": "...",
  "how": "..."
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Contradiction Formalization
# ---------------------------------------------------------------------------

CONTRADICTION_FORMALIZATION = """\
<task>
Convert the following natural-language contradiction into a TRIZ-standard formal representation.
</task>

<context>
<mission>{mission}</mission>
<known_constraints>
{constraints}
</known_constraints>
<known_kpis>
{kpis}
</known_kpis>
</context>

<input>
{natural_description}
</input>

<instructions>
1. Produce an engineering statement: "Improving [Parameter A] worsens [Parameter B]."
2. Map to TRIZ 39 engineering parameters (1–39). Use null if no confident mapping exists.
3. Classify the contradiction type:
   - **TC** (Technical Contradiction): two different parameters conflict.
   - **PC** (Physical Contradiction): one parameter must simultaneously satisfy opposing demands.
4. If PC, write a physical_contradiction description.
5. Assign a confidence score (0–1) for the mapping quality.
</instructions>

<output_schema>
{{
  "engineering_statement": "Improving X worsens Y",
  "improving_param": 14,
  "worsening_param": 1,
  "physical_contradiction": null,
  "type": "TC",
  "confidence": 0.8
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Assumption Extraction
# ---------------------------------------------------------------------------

ASSUMPTION_EXTRACTION = """\
<task>
Extract hidden assumptions from the Socratic Q&A session below.
</task>

<context>
<mission>{mission}</mission>
<known_constraints>
{constraints}
</known_constraints>
<known_kpis>
{kpis}
</known_kpis>
<existing_assumptions>
{existing_assumptions}
</existing_assumptions>
<qa_transcript>
{questions_and_answers}
</qa_transcript>
</context>

<instructions>
For each assumption found:
1. **content** — What the assumption states.
2. **source** — Which question/answer led to this.
3. **worst_consequence** — Worst outcome if the assumption is wrong.
4. **worst_severity** — One of:
   - critical: affects safety or regulatory compliance
   - high: affects a core performance KPI
   - medium: affects secondary objectives
   - low: affects convenience or aesthetics
</instructions>

<output_schema>
{{
  "assumptions": [
    {{
      "content": "Assumption text",
      "source": "Derived from Q3 / A3",
      "worst_consequence": "What could go wrong",
      "worst_severity": "medium"
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Anti-Anchor Generation
# ---------------------------------------------------------------------------

ANTI_ANCHOR_GENERATION = """\
<task>
Generate unconventional architecture concepts that break path-dependency.
</task>

<context>
<mission>{mission}</mission>
<current_constraints>
{current_constraints}
</current_constraints>
<existing_alternatives>
{existing_alternatives}
</existing_alternatives>
</context>

<instructions>
1. Propose at least 3 concept directions.
2. At least 1 must be physically incompatible with the dominant existing approach \
(different core mechanism or interface).
3. For each concept explain: why it is unconventional, and its potential advantage.
4. Draw inspiration from cross-domain analogies (aerospace, medical, consumer electronics, \
robotics, etc.) — do not limit to the project's own industry.
5. Each concept must still respect the hard constraints listed above.
</instructions>

<output_schema>
{{
  "alternatives": [
    {{
      "name": "Concept name",
      "mechanism": "Core mechanism description",
      "why_unconventional": "What makes this non-obvious",
      "potential_advantage": "Key benefit",
      "cross_domain_source": "Which domain inspired this"
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Constraint Feasibility Check
# ---------------------------------------------------------------------------

CONSTRAINT_FEASIBILITY = """\
<task>
Analyze whether the given set of constraints can be simultaneously satisfied.
Identify pairwise conflicts or physical/economic impossibilities.
</task>

<context>
<mission>{mission}</mission>
<constraints>
{constraints}
</constraints>
</context>

<instructions>
1. For each pair of constraints, assess whether satisfying both simultaneously is \
physically, economically, or technically challenging.
2. Only report **real** conflicts — do not invent issues that do not exist.
3. For each conflict, explain why the two constraints tension each other and suggest \
a concrete engineering trade-off or relaxation.
4. Classify overall status:
   - "pass" — no conflicts found; all constraints are mutually compatible.
   - "warning" — minor tensions exist but can likely be resolved with trade-offs.
   - "conflict" — at least one pair is physically or economically infeasible as stated.
5. If there are fewer than 2 constraints, return status "pass" with an empty conflicts list.
</instructions>

<output_schema>
{{
  "status": "pass|warning|conflict",
  "conflicts": [
    {{
      "constraintA": "First constraint description",
      "constraintB": "Second constraint description",
      "reason": "Why these two constraints conflict",
      "suggestion": "Concrete suggestion to resolve the tension"
    }}
  ]
}}
</output_schema>
"""
