"""Structured parser for TRIZ separation principles (16 items).

Built on top of the existing triz_kb.load_separation_principles() loader.
Source of truth: rd_assistant_design_system/triz_knowledge_base/04_separation_principles.md

Used by:
- Explore stage TC→multi-PC decomposition (validates separation_principle_id)
- Frontend parity constants (src/lib/triz/separationPrinciples.ts must match these IDs)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from app.tools.triz_kb import load_separation_principles


SeparationCategory = Literal["time", "space", "condition", "whole_part"]


@dataclass(frozen=True)
class SeparationPrinciple:
    """A single TRIZ separation-principle strategy row."""

    id: str
    category: SeparationCategory
    name_zh: str
    physical_principle: str
    cross_domain_examples: str


# Canonical locked IDs — order matters (matches KB row order within each category).
_CANONICAL_IDS: list[tuple[str, SeparationCategory]] = [
    ("time.pre_action", "time"),
    ("time.post_action", "time"),
    ("time.periodic_switching", "time"),
    ("time.accelerated_pass", "time"),
    ("space.local_quality", "space"),
    ("space.partition_combine", "space"),
    ("space.nesting", "space"),
    ("space.geometry_transform", "space"),
    ("condition.phase_change", "condition"),
    ("condition.threshold_trigger", "condition"),
    ("condition.responsive_material", "condition"),
    ("condition.external_field", "condition"),
    ("whole_part.composite", "whole_part"),
    ("whole_part.porous_hollow", "whole_part"),
    ("whole_part.gradient", "whole_part"),
    ("whole_part.fractal", "whole_part"),
]

# Maps KB heading number (1..4) to the canonical category slug.
_HEADING_TO_CATEGORY: dict[int, SeparationCategory] = {
    1: "time",
    2: "space",
    3: "condition",
    4: "whole_part",
}

# Chinese label for each category (used in prompt context).
_CATEGORY_ZH: dict[SeparationCategory, str] = {
    "time": "時間分離",
    "space": "空間分離",
    "condition": "條件分離",
    "whole_part": "整體局部分離",
}


# Heading anchor, e.g. "### 1. 時間分離 (Separation in Time)"
_HEADING_RE = re.compile(r"^###\s+(\d+)\.\s+(.+?)\s*$", re.MULTILINE)


def _extract_category_rows(raw: str, heading_num: int) -> list[tuple[str, str, str]]:
    """Extract the 4 strategy rows from the markdown table under `### N.`.

    Returns list of (name_zh, physical_principle, cross_domain_examples) tuples.
    Raises ValueError if the section/table is malformed.
    """
    # Find the heading for this category.
    heading_match = None
    for m in _HEADING_RE.finditer(raw):
        if int(m.group(1)) == heading_num:
            heading_match = m
            break
    if heading_match is None:
        raise ValueError(
            f"separation_principles KB: heading '### {heading_num}.' not found"
        )

    # Slice from this heading to the next '### N.' heading (or EOF).
    start = heading_match.end()
    rest = raw[start:]
    next_heading = re.search(r"^###\s+\d+\.\s", rest, re.MULTILINE)
    section = rest[: next_heading.start()] if next_heading else rest

    # Collect table rows: lines starting with '|' that are neither the header
    # row (`| 策略 | ...`) nor the separator row (`|------|...`).
    rows: list[tuple[str, str, str]] = []
    for line in section.split("\n"):
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        # Split into cells, dropping leading/trailing empty strings from the pipes.
        cells = [c.strip() for c in stripped.split("|")[1:-1]]
        if len(cells) != 3:
            continue
        # Skip header row.
        if cells[0] == "策略":
            continue
        # Skip separator row (dashes only).
        if re.fullmatch(r":?-+:?", cells[0]):
            continue
        rows.append((cells[0], cells[1], cells[2]))

    if len(rows) != 4:
        raise ValueError(
            f"separation_principles KB: heading '### {heading_num}.' expected "
            f"4 strategy rows, found {len(rows)}: {[r[0] for r in rows]}"
        )
    return rows


@lru_cache(maxsize=1)
def parse_separation_principles() -> tuple[SeparationPrinciple, ...]:
    """Parse the separation principles markdown into 16 structured items.

    Returns a tuple (hashable for lru_cache) in the canonical ID order.
    Raises ValueError if the KB does not yield exactly 16 rows matching the
    canonical layout.
    """
    raw = load_separation_principles()

    all_rows: list[tuple[SeparationCategory, tuple[str, str, str]]] = []
    for heading_num in (1, 2, 3, 4):
        category = _HEADING_TO_CATEGORY[heading_num]
        for row in _extract_category_rows(raw, heading_num):
            all_rows.append((category, row))

    if len(all_rows) != 16:
        raise ValueError(
            f"separation_principles KB: expected 16 rows total, got {len(all_rows)}"
        )

    # Zip against canonical IDs — order must line up.
    parsed: list[SeparationPrinciple] = []
    for (canonical_id, canonical_category), (row_category, row) in zip(
        _CANONICAL_IDS, all_rows, strict=True
    ):
        if canonical_category != row_category:
            raise ValueError(
                f"separation_principles KB: id '{canonical_id}' expected category "
                f"'{canonical_category}' but KB row is in category '{row_category}'"
            )
        name_zh, physical_principle, cross_domain_examples = row
        parsed.append(
            SeparationPrinciple(
                id=canonical_id,
                category=canonical_category,
                name_zh=name_zh,
                physical_principle=physical_principle,
                cross_domain_examples=cross_domain_examples,
            )
        )

    return tuple(parsed)


# Module-level constant — evaluated at import time so validators can reference it.
SEPARATION_PRINCIPLES: list[SeparationPrinciple] = list(parse_separation_principles())


def get_separation_principle(principle_id: str) -> SeparationPrinciple | None:
    """Look up a separation principle by its canonical id (e.g. 'time.pre_action')."""
    for sp in SEPARATION_PRINCIPLES:
        if sp.id == principle_id:
            return sp
    return None


def get_separation_principles_by_category(
    category: str,
) -> list[SeparationPrinciple]:
    """Return all separation principles for a given category slug."""
    return [sp for sp in SEPARATION_PRINCIPLES if sp.category == category]


def build_separation_principle_id_context() -> str:
    """Return a prompt-ready string listing all 16 separation-principle IDs.

    Formatted for LLM consumption inside the Explore-stage
    TC_TO_MULTI_PC_DECOMPOSITION prompt. Each line is prefixed with the canonical
    id so the LLM can echo it back verbatim for Pydantic validation.
    """
    lines: list[str] = [
        "# TRIZ Separation Principle IDs (canonical — use these exact strings)",
        "",
    ]
    current_category: SeparationCategory | None = None
    for sp in SEPARATION_PRINCIPLES:
        if sp.category != current_category:
            current_category = sp.category
            lines.append(f"## {_CATEGORY_ZH[sp.category]} ({sp.category})")
        # Truncate long physical_principle description for prompt economy.
        desc = sp.physical_principle.strip()
        if len(desc) > 120:
            desc = desc[:117] + "..."
        lines.append(
            f"- {sp.id} ({_CATEGORY_ZH[sp.category]}: {sp.name_zh}): {desc}"
        )
    return "\n".join(lines)
