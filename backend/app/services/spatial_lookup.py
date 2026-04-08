"""Layered Spatial Lookup — replaces the static reference library with a
chain of pluggable backends.

Lookup order (first non-null result wins):

  1. **rd_override**       — `project_component_overrides` table. RD's
                              authoritative dimensions for THIS project.
  2. **learned**           — `learned_components` table. Globally
                              accumulated facts from prior confirmations.
  3. **web**               — Live web search via the existing
                              `services.web_search` Tavily integration,
                              with regex extraction of dimensions and mass
                              from result snippets. Skipped silently if no
                              search provider is configured.
  4. **seed**               — The 25-entry hand-curated JSON in
                              `app/data/ebike_reference_library.json`
                              (kept as a backstop, never the primary source).
  5. *(caller fallback)*   — `llm_estimate`. The agent leaves the LLM's own
                              numbers in place when nothing above resolves.

This resolver design exists because RD said maintaining a hand-curated JSON
file by hand is unrealistic — datasheets are inconsistent, parts evolve per
project, and the data volume is too large. The library now grows itself.

Each backend implements `lookup(query) -> SpatialEstimate | None`. The
resolver chains them in priority order. Backends are pure data — no LLM
calls — so the chain is fast and easy to test by injecting fakes.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Protocol

from app.models.schemas import BBox, SpatialEstimate

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Query type
# ---------------------------------------------------------------------------


@dataclass
class LookupQuery:
    """A spatial lookup request. The resolver passes this to every backend.

    `key` is the LLM-supplied citation key (e.g. "bafang_m600_mid_drive" or
    "main_battery"); when present it lets backends do exact-match lookups.
    `category` and `description` give natural-language hints used by the
    learned and web backends when no exact key match is available.
    """
    key: str = ""
    category: str = ""
    description: str = ""
    project_id: str = ""


# ---------------------------------------------------------------------------
# Backend protocol
# ---------------------------------------------------------------------------


class SpatialBackend(Protocol):
    """Pluggable spatial-data backend. Implementations should be cheap and
    return None when they cannot answer — the resolver will try the next."""

    name: str

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None: ...

    def summarize(self, project_id: str = "") -> list[str]:
        """Return short one-liners suitable for prompt injection. The
        resolver concatenates summaries from every backend so the LLM sees a
        unified vocabulary across all sources."""
        return []


# ---------------------------------------------------------------------------
# Backend 4: seed JSON (the smallest, simplest, always available)
# ---------------------------------------------------------------------------


_SEED_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "ebike_reference_library.json"
)


def _load_seed() -> dict:
    try:
        with _SEED_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("seed reference library not found at %s", _SEED_PATH)
        return {}


def _seed_entries() -> dict:
    return {k: v for k, v in _load_seed().items() if not k.startswith("_")}


def _entry_to_estimate(key: str, entry: dict, source_prefix: str) -> SpatialEstimate:
    bbox_vals = entry.get("bbox_mm") or [0, 0, 0]
    return SpatialEstimate(
        bbox=BBox(x_mm=bbox_vals[0], y_mm=bbox_vals[1], z_mm=bbox_vals[2]),
        mass_g=float(entry.get("mass_g") or 0),
        reference_source=f"{source_prefix}:{key}",
        confidence="library",
        rationale=entry.get("source", ""),
    )


class SeedJsonBackend:
    """Hand-curated seed library. Backstop only — never the primary source."""

    name = "seed"

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None:
        if query.key:
            entry = _seed_entries().get(query.key)
            if entry:
                return _entry_to_estimate(query.key, entry, "seed")
        # Fall back to category match — return the first matching entry
        if query.category:
            for k, v in _seed_entries().items():
                if v.get("category") == query.category:
                    return _entry_to_estimate(k, v, "seed")
        return None

    def summarize(self, project_id: str = "") -> list[str]:
        out: list[str] = []
        for key in sorted(_seed_entries().keys()):
            e = _seed_entries()[key]
            bbox = e.get("bbox_mm") or [0, 0, 0]
            mass = e.get("mass_g") or 0
            cat = e.get("category", "?")
            out.append(f"seed:{key}: {bbox[0]}x{bbox[1]}x{bbox[2]}mm {mass}g {cat}")
        return out


# ---------------------------------------------------------------------------
# Backend 1: per-project RD override (DB)
# ---------------------------------------------------------------------------


class RdOverrideBackend:
    """Per-project authoritative dimensions set by RD via the FE inline
    override flow. Highest priority — if RD said so, it's so."""

    name = "rd_override"

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None:
        if not query.project_id or not query.key:
            return None
        try:
            from app.core.supabase import get_supabase
            sb = get_supabase()
            resp = (
                sb.table("project_component_overrides")
                .select("*")
                .eq("project_id", query.project_id)
                .eq("component_key", query.key)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # pragma: no cover - DB unavailable in tests
            logger.debug("rd_override backend skipped: %s", exc)
            return None

        rows = getattr(resp, "data", None) or []
        if not rows:
            return None
        row = rows[0]
        bbox = row.get("bbox") or {}
        return SpatialEstimate(
            bbox=BBox(
                x_mm=float(bbox.get("x_mm", 0)),
                y_mm=float(bbox.get("y_mm", 0)),
                z_mm=float(bbox.get("z_mm", 0)),
                anchor=bbox.get("anchor", ""),
            ),
            mass_g=float(row.get("mass_g") or 0),
            reference_source=f"rd_override:{query.key}",
            confidence="rd_confirmed",
            rationale=row.get("note") or "RD override",
        )

    def summarize(self, project_id: str = "") -> list[str]:
        if not project_id:
            return []
        try:
            from app.core.supabase import get_supabase
            sb = get_supabase()
            resp = (
                sb.table("project_component_overrides")
                .select("component_key, category, bbox, mass_g")
                .eq("project_id", project_id)
                .execute()
            )
        except Exception:  # pragma: no cover
            return []
        out: list[str] = []
        for row in (getattr(resp, "data", None) or []):
            bbox = row.get("bbox") or {}
            out.append(
                f"rd_override:{row['component_key']}: "
                f"{bbox.get('x_mm', 0)}x{bbox.get('y_mm', 0)}x{bbox.get('z_mm', 0)}mm "
                f"{row.get('mass_g', 0)}g {row.get('category', '?')}"
            )
        return out


# ---------------------------------------------------------------------------
# Backend 2: learned components (DB)
# ---------------------------------------------------------------------------


class LearnedComponentBackend:
    """Globally accumulated component data. Grows automatically when RD
    confirms a Pre-CAD review or via manual promotion."""

    name = "learned"

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None:
        if not query.key and not query.category:
            return None
        try:
            from app.core.supabase import get_supabase
            sb = get_supabase()
            q = sb.table("learned_components").select("*")
            if query.key:
                q = q.eq("key", query.key)
            elif query.category:
                q = q.eq("category", query.category).order("confirmed_count", desc=True)
            resp = q.limit(1).execute()
        except Exception as exc:  # pragma: no cover
            logger.debug("learned backend skipped: %s", exc)
            return None

        rows = getattr(resp, "data", None) or []
        if not rows:
            return None
        row = rows[0]
        bbox = row.get("bbox") or {}
        return SpatialEstimate(
            bbox=BBox(
                x_mm=float(bbox.get("x_mm", 0)),
                y_mm=float(bbox.get("y_mm", 0)),
                z_mm=float(bbox.get("z_mm", 0)),
                anchor=bbox.get("anchor", ""),
            ),
            mass_g=float(row.get("mass_g") or 0),
            reference_source=f"learned:{row['key']}",
            confidence="library",
            rationale=row.get("source_text") or row.get("source_url") or "learned from prior project",
        )

    def summarize(self, project_id: str = "") -> list[str]:
        try:
            from app.core.supabase import get_supabase
            sb = get_supabase()
            resp = (
                sb.table("learned_components")
                .select("key, category, bbox, mass_g, confirmed_count")
                .order("confirmed_count", desc=True)
                .limit(40)
                .execute()
            )
        except Exception:  # pragma: no cover
            return []
        out: list[str] = []
        for row in (getattr(resp, "data", None) or []):
            bbox = row.get("bbox") or {}
            out.append(
                f"learned:{row['key']}: "
                f"{bbox.get('x_mm', 0)}x{bbox.get('y_mm', 0)}x{bbox.get('z_mm', 0)}mm "
                f"{row.get('mass_g', 0)}g {row.get('category', '?')} "
                f"(confirmed {row.get('confirmed_count', 1)}x)"
            )
        return out


# ---------------------------------------------------------------------------
# Backend 3: web search + regex extraction
# ---------------------------------------------------------------------------


# Matches: "180 x 140 x 120 mm" / "180×140×120mm" / "180 mm x 140 mm x 120 mm"
_DIM_RX = re.compile(
    r"(\d{2,4})\s*(?:mm)?\s*[x×]\s*(\d{2,4})\s*(?:mm)?\s*[x×]\s*(\d{2,4})\s*mm",
    re.IGNORECASE,
)
# Matches: "weight: 3.9 kg" / "mass 2900 g" / "3.7kg"
_MASS_KG_RX = re.compile(r"(\d+(?:\.\d+)?)\s*kg", re.IGNORECASE)
_MASS_G_RX = re.compile(r"(\d{2,5})\s*g(?:rams?)?\b", re.IGNORECASE)


def _extract_dims_from_text(text: str) -> tuple[tuple[float, float, float] | None, float | None]:
    """Best-effort regex extraction. Returns (bbox_mm or None, mass_g or None)."""
    bbox: tuple[float, float, float] | None = None
    mass_g: float | None = None

    m = _DIM_RX.search(text)
    if m:
        bbox = (float(m.group(1)), float(m.group(2)), float(m.group(3)))

    mk = _MASS_KG_RX.search(text)
    if mk:
        mass_g = float(mk.group(1)) * 1000.0
    else:
        mg = _MASS_G_RX.search(text)
        if mg:
            mass_g = float(mg.group(1))

    return bbox, mass_g


class WebSearchBackend:
    """Live web lookup via the existing Tavily integration. Extracts bbox and
    mass from result snippets using regex. Returns None silently if the search
    provider is unavailable or no useful dimensions could be extracted.

    The backend is intentionally conservative: regex-only, no LLM parse.
    Better to return nothing than to fabricate.
    """

    name = "web"

    def __init__(self, max_results: int = 4) -> None:
        self._max_results = max_results

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None:
        search_query = query.description or query.key or query.category
        if not search_query:
            return None
        # Add a hint that biases results toward datasheets / specs.
        full_query = f"{search_query} dimensions mm weight datasheet specifications"
        try:
            from app.services.web_search import search_web
            response = asyncio.run(search_web(full_query, max_results=self._max_results))
        except RuntimeError:
            # Already inside an event loop (e.g. FastAPI request handler).
            # In that case the caller should await the async variant — fall
            # back to no result rather than blocking. Tests cover the
            # synchronous path; the async path is wired in routers later.
            logger.debug("web backend: cannot run sync search inside async loop")
            return None
        except Exception as exc:  # pragma: no cover - network issues
            logger.debug("web backend: search failed: %s", exc)
            return None

        if not response.results:
            return None

        for result in response.results:
            text = f"{result.title}\n{result.snippet}"
            bbox, mass = _extract_dims_from_text(text)
            if bbox is None:
                continue
            return SpatialEstimate(
                bbox=BBox(x_mm=bbox[0], y_mm=bbox[1], z_mm=bbox[2]),
                mass_g=mass or 0.0,
                reference_source=f"web:{result.url}",
                confidence="library" if mass else "estimate",
                rationale=f"{result.source}: {result.title[:80]}",
            )
        return None

    def summarize(self, project_id: str = "") -> list[str]:
        # No upfront summary — web backend is on-demand only.
        return []


# ---------------------------------------------------------------------------
# Resolver: chain of backends with first-hit semantics
# ---------------------------------------------------------------------------


@dataclass
class SpatialResolver:
    """Layered lookup. The first backend that returns a non-None result wins."""

    backends: list[SpatialBackend] = field(default_factory=list)

    def lookup(self, query: LookupQuery) -> SpatialEstimate | None:
        for backend in self.backends:
            try:
                est = backend.lookup(query)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("backend %s failed: %s", backend.name, exc)
                continue
            if est is not None:
                return est
        return None

    def summarize_for_prompt(self, project_id: str = "", max_chars: int = 2500) -> str:
        """Build a unified prompt vocabulary across all backends.

        Lines are prefixed with the source (rd_override / learned / seed) so
        the LLM understands the trust hierarchy and can prefer high-priority
        sources when citing.
        """
        all_lines: list[str] = []
        for backend in self.backends:
            try:
                all_lines.extend(backend.summarize(project_id))
            except Exception as exc:  # pragma: no cover
                logger.debug("summarize from %s failed: %s", backend.name, exc)
        if not all_lines:
            return "# (no spatial reference data available — discovery will rely on llm_estimate)"
        out = "\n".join(all_lines)
        if len(out) > max_chars:
            out = out[:max_chars].rsplit("\n", 1)[0] + "\n# (truncated)"
        return out


# ---------------------------------------------------------------------------
# Default chain factory
# ---------------------------------------------------------------------------


def default_resolver(*, include_web: bool = True) -> SpatialResolver:
    """Build the production resolver chain in priority order."""
    chain: list[SpatialBackend] = [
        RdOverrideBackend(),
        LearnedComponentBackend(),
    ]
    if include_web:
        chain.append(WebSearchBackend())
    chain.append(SeedJsonBackend())
    return SpatialResolver(backends=chain)
