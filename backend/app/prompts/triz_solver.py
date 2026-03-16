"""System prompts for TRIZ Solver Agent.

Domain-agnostic — all product/industry context comes from user input.
Follows Anthropic Claude prompting best practices: XML tags, strict schemas, examples.
"""

TRIZ_SOLVER_SYSTEM = """\
You are a TRIZ methodology expert integrated into a structured design platform.

<capabilities>
- 39 engineering-parameter mapping
- Contradiction matrix look-up
- 40 inventive-principle instantiation
- 4 separation principles (time, space, condition, system level)
- 76 standard solutions (Su-Field modelling)
- SCAMPER creative transformation
</capabilities>

<core_responsibilities>
1. Map natural-language contradictions to TRIZ 39 engineering parameters.
2. Look up candidate inventive principles from the matrix.
3. Instantiate abstract principles into concrete engineering actions \
   relevant to the project's domain (inferred from user-supplied context).
4. List affected modules/subsystems and flag potential secondary contradictions.
</core_responsibilities>

<output_rules>
- At least 3 engineering instantiations per contradiction.
- At least 1 must be a non-obvious / cross-domain solution.
- Clearly list affected subsystems and potential secondary contradictions.
- Respond in the user's language (default: 繁體中文). Keep TRIZ terms in English.
- Return only the JSON requested — no preamble, no markdown fences.
</output_rules>
"""

# ---------------------------------------------------------------------------
# TC (Technical Contradiction) Instantiation
# ---------------------------------------------------------------------------

TRIZ_TC_INSTANTIATION = """\
<task>
Instantiate inventive principles for a Technical Contradiction (TC).
</task>

<context>
<contradiction>{natural_description}</contradiction>
<triz_kb>{triz_context}</triz_kb>
</context>

<instructions>
1. Verify that improving parameter #{improving} and worsening parameter #{worsening} are correctly mapped.
2. For each candidate principle, propose a concrete engineering implementation \
   grounded in the project context above.
3. Identify which modules/subsystems are affected.
4. Flag any secondary contradictions the proposal might introduce.
</instructions>

<output_schema>
{{
  "suggestions": [
    {{
      "principle_number": 35,
      "principle_name": "Parameter changes",
      "suggestion": "Concrete engineering action (≥80 words)",
      "affected_modules": ["module_A", "module_B"],
      "secondary_contradictions": ["Potential new conflict description"]
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# PC (Physical Contradiction) Instantiation
# ---------------------------------------------------------------------------

TRIZ_PC_INSTANTIATION = """\
<task>
Resolve a Physical Contradiction (PC) using separation principles.
</task>

<context>
<contradiction>{natural_description}</contradiction>
<physical_contradiction>{physical_contradiction}</physical_contradiction>
<triz_kb>{triz_context}</triz_kb>
</context>

<instructions>
1. Determine which separation principle(s) apply: time / space / condition / system level.
2. For each applicable principle, identify corresponding inventive principles from the 40.
3. Propose concrete engineering implementations for the project's context.
4. Flag potential secondary contradictions.
</instructions>

<output_schema>
{{
  "suggestions": [
    {{
      "separation_principle": "time|space|condition|system_level",
      "principle_number": 1,
      "principle_name": "Segmentation",
      "suggestion": "Concrete engineering action (≥80 words)",
      "affected_modules": ["module_A"],
      "secondary_contradictions": ["..."]
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# SCAMPER Transform
# ---------------------------------------------------------------------------

SCAMPER_TRANSFORM = """\
<task>
Apply the SCAMPER creative-transformation method to the subsystem below.
</task>

<context>
<subsystem>
  <name>{subsystem_name}</name>
  <description>{subsystem_description}</description>
</subsystem>
<related_contradictions>
{related_contradictions}
</related_contradictions>
</context>

<instructions>
For each of the 7 SCAMPER actions, propose a concrete transformation:

1. **Substitute** — Replace a component, material, or process.
2. **Combine** — Merge with another function or module.
3. **Adapt** — Borrow a solution from a different domain.
4. **Modify** — Scale up/down or change a key property.
5. **Put to other use** — Repurpose an existing element.
6. **Eliminate** — Remove a step, part, or interface.
7. **Reverse** — Invert a sequence, direction, or role.

For each transformation: state the benefit AND any new contradiction it may introduce.
</instructions>

<output_schema>
{{
  "transformations": [
    {{
      "action": "substitute|combine|adapt|modify|put_to_other_use|eliminate|reverse",
      "description": "What to do",
      "benefit": "Expected advantage",
      "new_contradiction": "Potential conflict or null"
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Subsystem Suggestion
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Su-Field Analysis (76 Standard Solutions)
# ---------------------------------------------------------------------------

SUFIELD_ANALYSIS = """\
<task>
Analyse the technical system using a Su-Field (Substance-Field) model and match \
it to the most applicable TRIZ 76 Standard Solutions.
</task>

<context>
<system_description>{system_description}</system_description>
<current_issues>
{current_issues}
</current_issues>
<triz_kb>{triz_context}</triz_kb>
</context>

<instructions>
1. Identify the Su-Field elements from the system description:
   - **S1** (Object) — the substance being acted upon.
   - **S2** (Tool) — the substance performing the action.
   - **F** (Field) — the energy or interaction type (mechanical, thermal, electrical, magnetic, chemical, etc.).

2. Classify the system state:
   - **incomplete** — S1, S2, or F is missing.
   - **effective** — all elements present, functioning correctly.
   - **harmful** — all elements present, but producing unwanted effects.
   - **insufficient** — all elements present, but desired effect is too weak.

3. Based on the state, select 2–4 matching standard solutions from the 76:
   - incomplete → Class 1.1 (build / complete Su-Field)
   - harmful → Class 1.2 (destroy / neutralise harmful effect)
   - insufficient → Class 1.3 (enhance) or Class 2 (system transformation)
   - For measurement/detection issues → Class 4
   - For simplification → Class 5

4. For each matched solution, propose a **concrete engineering implementation** \
   relevant to the project's domain (inferred from the system description).

5. Flag potential secondary contradictions introduced by each solution.
</instructions>

<output_schema>
{{
  "su_field": {{
    "S1": "Object substance",
    "S2": "Tool substance",
    "F": "Field / energy type"
  }},
  "system_state": "incomplete|effective|harmful|insufficient",
  "matched_solutions": [
    {{
      "standard_id": "1.1.1",
      "standard_name": "Build Complete Su-Field",
      "class_name": "Class 1",
      "suggestion": "Concrete engineering implementation (≥80 words)",
      "affected_modules": ["module_A"],
      "secondary_contradictions": ["Potential new conflict"]
    }}
  ]
}}
</output_schema>
"""

# ---------------------------------------------------------------------------
# Subsystem Suggestion
# ---------------------------------------------------------------------------

SUBSYSTEM_SUGGESTION = """\
<task>
Identify subsystems that would benefit most from SCAMPER analysis.
</task>

<context>
<mission>{mission}</mission>
<contradictions>
{contradictions}
</contradictions>
<existing_subsystems>
{existing_subsystems}
</existing_subsystems>
</context>

<instructions>
Suggest 3–5 subsystems. For each:
1. Explain why it is a good candidate for SCAMPER (link to specific contradictions).
2. List the contradictions it relates to.
Do not repeat subsystems already listed above.
</instructions>

<output_schema>
{{
  "subsystems": [
    {{
      "name": "Subsystem name",
      "reason": "Why SCAMPER is valuable here",
      "related_contradictions": ["Contradiction 1", "Contradiction 2"]
    }}
  ]
}}
</output_schema>
"""
