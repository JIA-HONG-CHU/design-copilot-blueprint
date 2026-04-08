"""Reference library of typical e-bike component dimensions.

Loaded once from backend/app/data/ebike_reference_library.json. Used by:
- The SUBSYSTEM_SUGGESTION prompt (summarize_for_prompt) to give the LLM
  a grounded vocabulary of real component sizes instead of letting it
  hallucinate "Ø500mm motor".
- The triz_solver agent post-processing (lookup_by_key) to overwrite any
  LLM-supplied bbox/mass with library values when the LLM cites a key.

Library values ALWAYS trump LLM values when a `ref_lib:<key>` reference is
present. This is the discovery mode contract: facts beat vibes.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.models.schemas import BBox, SpatialEstimate

_LIBRARY_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "ebike_reference_library.json"
)


@lru_cache(maxsize=1)
def load_library() -> dict:
    """Load the JSON library once and cache it."""
    with _LIBRARY_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _entries() -> dict:
    """Return only the real entries (filter out the _meta block)."""
    return {k: v for k, v in load_library().items() if not k.startswith("_")}


def lookup_by_key(key: str) -> dict | None:
    """Return a single entry by exact key, or None if not found."""
    return _entries().get(key)


def lookup_by_category(category: str) -> list[tuple[str, dict]]:
    """Return all (key, entry) pairs in a given category."""
    return [(k, v) for k, v in _entries().items() if v.get("category") == category]


def to_spatial_estimate(key: str) -> SpatialEstimate | None:
    """Convert a library entry into a SpatialEstimate (confidence: library)."""
    entry = lookup_by_key(key)
    if not entry:
        return None
    bbox_vals = entry.get("bbox_mm") or [0, 0, 0]
    return SpatialEstimate(
        bbox=BBox(x_mm=bbox_vals[0], y_mm=bbox_vals[1], z_mm=bbox_vals[2]),
        mass_g=entry.get("mass_g") or 0.0,
        reference_source=f"ref_lib:{key}",
        confidence="library",
        rationale=entry.get("source", ""),
    )


def summarize_for_prompt(max_chars: int = 2000) -> str:
    """Build a compact, token-efficient listing for prompt injection.

    Format: one line per entry: `<key>: <x>x<y>x<z>mm <mass>g <category>`
    Truncated alphabetically if over max_chars to keep prompt size predictable.
    """
    lines = []
    for key in sorted(_entries().keys()):
        e = _entries()[key]
        bbox = e.get("bbox_mm") or [0, 0, 0]
        mass = e.get("mass_g") or 0
        cat = e.get("category", "?")
        lines.append(f"{key}: {bbox[0]}x{bbox[1]}x{bbox[2]}mm {mass}g {cat}")
    out = "\n".join(lines)
    if len(out) > max_chars:
        # Hard cap — cut at last newline before max_chars
        out = out[:max_chars].rsplit("\n", 1)[0] + "\n# (truncated)"
    return out


def categories() -> list[str]:
    """Return the list of categories defined in the library meta block."""
    meta = load_library().get("_meta", {})
    return list(meta.get("categories", []))
