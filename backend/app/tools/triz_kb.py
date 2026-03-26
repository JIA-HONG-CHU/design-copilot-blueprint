"""TRIZ Knowledge Base tools — rule engine for contradiction matrix lookup.

Loads the static Markdown knowledge base files and provides:
- Parameter mapping (natural language → 39 TRIZ parameters)
- Contradiction matrix lookup (improving × worsening → candidate principles)
- Separation principle matching (for physical contradictions)
- 76 Standard solutions matching

Ref: AI_Agent_Architecture.md §6.2 triz_solver_agent tools
Ref: triz_knowledge_base/README.md — injection strategy
"""

import re
from pathlib import Path
from functools import lru_cache

from app.core.config import settings


# ---------------------------------------------------------------------------
# File loaders (cached)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _kb_path() -> Path:
    return Path(settings.triz_kb_path).resolve()


@lru_cache(maxsize=1)
def load_39_parameters() -> str:
    """Full text of 39 parameters — inject into prompt context (~1,500 tokens)."""
    return (_kb_path() / "01_39_parameters.md").read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def load_40_principles() -> str:
    """Full text of 40 principles — inject into prompt context (~4,000 tokens)."""
    return (_kb_path() / "03_40_principles.md").read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def load_separation_principles() -> str:
    """Full text of separation principles (~1,000 tokens)."""
    return (_kb_path() / "04_separation_principles.md").read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def _load_matrix_raw() -> str:
    return (_kb_path() / "02_contradiction_matrix.md").read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def load_76_standard_solutions() -> str:
    return (_kb_path() / "05_76_standard_solutions.md").read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Contradiction Matrix Lookup (RAG-style row extraction)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=128)
def lookup_matrix(improving: int, worsening: int) -> list[int]:
    """Lookup contradiction matrix: returns candidate principle numbers.

    Instead of loading the full 39×39 matrix into LLM context,
    we parse the specific cell and return just the principle numbers.
    """
    raw = _load_matrix_raw()

    # Parse the matrix table — each row starts with "| {improving_param} |"
    # and columns correspond to worsening parameters
    lines = raw.split("\n")

    # Find table header to determine column positions
    header_line = None
    data_lines = []
    in_table = False

    for line in lines:
        if line.startswith("|") and "改善" in line or "worsening" in line.lower():
            header_line = line
            in_table = True
            continue
        if in_table and line.startswith("|---"):
            continue
        if in_table and line.startswith("|"):
            data_lines.append(line)
        elif in_table and not line.startswith("|"):
            in_table = False

    # Find the row for improving parameter
    for line in data_lines:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if not cells:
            continue
        try:
            row_param = int(re.search(r"\d+", cells[0]).group())
        except (AttributeError, ValueError):
            continue
        if row_param != improving:
            continue

        # Find column for worsening parameter (column index = worsening - 1 + 1 for row header)
        col_idx = worsening  # 1-based, first cell is row header
        if col_idx < len(cells):
            cell = cells[col_idx]
            # Parse principle numbers from cell (e.g., "1, 28, 35" or "—")
            principles = [int(n) for n in re.findall(r"\d+", cell)]
            return principles

    return []


def get_matrix_context(improving: int, worsening: int) -> str:
    """Get a human-readable context string for the matrix lookup result."""
    principles = lookup_matrix(improving, worsening)
    if not principles:
        return f"No TRIZ principles found for improving={improving}, worsening={worsening}. Consider physical contradiction approach."
    return (
        f"TRIZ Contradiction Matrix lookup:\n"
        f"  Improving parameter: #{improving}\n"
        f"  Worsening parameter: #{worsening}\n"
        f"  Candidate principles: {principles}\n"
        f"  → Inject 40_principles.md for principle details"
    )


# ---------------------------------------------------------------------------
# Prompt context builders (for LLM injection)
# ---------------------------------------------------------------------------

def build_triz_tc_context(improving: int, worsening: int) -> str:
    """Build full prompt context for Technical Contradiction resolution.

    Injection strategy (README.md §方式 3 混合注入):
    - 39 parameters: full inject
    - Matrix: only the relevant row
    - 40 principles: full inject (filtered to candidates)
    """
    principles = lookup_matrix(improving, worsening)
    params_text = load_39_parameters()
    principles_text = load_40_principles()

    # Filter principles text to only include candidate principles
    if principles:
        filtered_sections = []
        for p in principles:
            pattern = rf"### #{p}\s"
            match = re.search(pattern, principles_text)
            if match:
                start = match.start()
                next_match = re.search(r"### #\d+\s", principles_text[start + 1:])
                end = start + 1 + next_match.start() if next_match else len(principles_text)
                filtered_sections.append(principles_text[start:end].strip())
        principles_context = "\n\n".join(filtered_sections)
    else:
        principles_context = "（矩陣無推薦原理，請使用物理矛盾分離原則或 76 標準解）"

    return (
        f"## TRIZ 39 工程參數\n\n{params_text}\n\n"
        f"---\n\n"
        f"## 矛盾矩陣查表結果\n\n"
        f"改善參數: #{improving} / 惡化參數: #{worsening}\n"
        f"候選原理: {principles if principles else '無 → 請用分離原則'}\n\n"
        f"---\n\n"
        f"## 候選發明原理詳細說明\n\n{principles_context}"
    )


def _extract_class_sections(full_text: str, class_numbers: list[int]) -> str:
    """Extract specific Class sections from 76 standard solutions by class number.

    E.g., class_numbers=[1,2] extracts "## Class 1: ..." and "## Class 2: ..."
    """
    sections = []
    for cn in class_numbers:
        # Match "## Class N" header until next "## Class" or "## 三" (reference section)
        pattern = rf"(## Class {cn}[：:].+?)(?=## Class \d|## 三|$)"
        match = re.search(pattern, full_text, re.DOTALL)
        if match:
            sections.append(match.group(1).strip())
    return "\n\n---\n\n".join(sections) if sections else full_text


# Su-Field state → relevant Classes mapping
_SUFIELD_STATE_TO_CLASSES: dict[str, list[int]] = {
    "incomplete":   [1],      # Class 1.1: build Su-Field
    "harmful":      [1],      # Class 1.2: destroy harmful effect
    "insufficient": [1, 2],   # Class 1.3 enhance + Class 2 transform
    "effective":    [2, 3],   # already working → transform or scale
    "measurement":  [4],      # detection & measurement
    "simplify":     [5],      # simplification strategies
}


def build_sufield_context(system_state: str | None = None) -> str:
    """Build prompt context for Su-Field analysis (76 standard solutions).

    Level 1 optimization: if system_state is provided, only inject the
    relevant Class sections (~500-1500 tokens) instead of all 76 (~6000 tokens).
    """
    full_text = load_76_standard_solutions()
    if system_state and system_state in _SUFIELD_STATE_TO_CLASSES:
        classes = _SUFIELD_STATE_TO_CLASSES[system_state]
        filtered = _extract_class_sections(full_text, classes)
        # Always include the intro and matching flow
        intro_match = re.search(r"(# TRIZ 76.+?)(?=## Class)", full_text, re.DOTALL)
        intro = intro_match.group(1).strip() if intro_match else ""
        flow_match = re.search(r"(## 三、標準解匹配流程.+)", full_text, re.DOTALL)
        flow = flow_match.group(1).strip() if flow_match else ""
        return f"{intro}\n\n---\n\n{filtered}\n\n---\n\n{flow}"
    return f"## Su-Field 76 標準解\n\n{full_text}"


def _extract_principles_by_ids(principle_ids: list[int]) -> str:
    """Extract specific principles from 40 principles by their IDs."""
    full_text = load_40_principles()
    sections = []
    for pid in principle_ids:
        pattern = rf"(### #{pid}\s.+?)(?=### #\d+\s|## LLM|$)"
        match = re.search(pattern, full_text, re.DOTALL)
        if match:
            sections.append(match.group(1).strip())
    return "\n\n".join(sections) if sections else full_text


# Separation strategy → most relevant 40 principles mapping
_SEPARATION_RELEVANT_PRINCIPLES: dict[str, list[int]] = {
    "time":      [9, 10, 11, 15, 19, 20, 21],   # pre-action, dynamics, periodic, rushing
    "space":     [1, 2, 3, 4, 7, 17],             # segmentation, extraction, local quality, nesting, dimension
    "condition":  [15, 35, 36, 37, 38, 39],        # dynamics, parameter change, phase transition, thermal expansion
    "whole_part": [1, 5, 6, 7, 31, 40],            # segmentation, merging, universality, nesting, porous, composite
}


def build_triz_pc_context(separation_type: str | None = None) -> str:
    """Build prompt context for Physical Contradiction resolution.

    Level 1 optimization: if separation_type is provided, only inject
    the relevant subset of 40 principles (~500-800 tokens) instead of all 40 (~4000 tokens).
    """
    sep_text = load_separation_principles()

    if separation_type and separation_type in _SEPARATION_RELEVANT_PRINCIPLES:
        principle_ids = _SEPARATION_RELEVANT_PRINCIPLES[separation_type]
        principles_context = _extract_principles_by_ids(principle_ids)
        label = separation_type
    else:
        principles_context = load_40_principles()
        label = "all"

    return (
        f"## 物理矛盾分離原則\n\n{sep_text}\n\n"
        f"---\n\n"
        f"## 候選發明原理（{label} 分離相關）\n\n{principles_context}"
    )
