"""Spatial Validator — Discovery mode for Interface Contracts.

This module is the part of the system that RD trusts. No LLM. Pure arithmetic.

The validator answers two questions:

1. **Discovery (`discover_package`)** — Given a set of subsystems with embedded
   spatial estimates, what envelope does this design REQUIRE? This is purely
   descriptive: it computes the minimum bbox and total mass and surfaces any
   AABB clashes between modules whose origin is set. It does NOT enforce any
   budget. Modules without a `spatial` block are ignored, not penalised.

2. **What-if overlay (`apply_overlay`)** — Optional. Given a previously
   discovered PackageMap and a hypothetical frame envelope (the overlay),
   report which modules overflow which zones and which mass budgets are
   exceeded. The overlay never modifies the discovery result; it produces a
   new PackageMap with `overlay_*` fields populated.

The discovery / overlay split exists because RD said: declaring a spatial
budget upfront constrains creative design. Discovery first, what-if second.
"""

from __future__ import annotations

import logging
from itertools import combinations
from typing import Iterable

from app.models.schemas import (
    BBox,
    InterfaceContract,
    PackageMap,
    PackageNode,
    RequiredEnvelope,
    SpatialEstimate,
    SuggestedSubsystem,
)
from app.services.package_svg import render_package_map_svg, render_package_map_table

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tree → flat node list
# ---------------------------------------------------------------------------

def _flatten_modules_with_spatial(
    subsystems: Iterable[SuggestedSubsystem],
) -> list[tuple[str, SpatialEstimate]]:
    """Walk the tree and yield (qualified_name, SpatialEstimate) for every
    interface contract that has a non-empty spatial block. The qualified
    name combines the owning module name and the target module name so the
    same module appearing in multiple contracts produces distinct entries.

    De-duplication: if the same (owner, target) pair appears more than once,
    only the first non-empty estimate is kept.
    """
    seen: set[str] = set()
    out: list[tuple[str, SpatialEstimate]] = []

    def visit(node: SuggestedSubsystem) -> None:
        for target_name, contract in (node.interface_contracts or {}).items():
            est = contract.spatial
            if est is None or est.bbox is None:
                continue
            qname = f"{node.name} → {target_name}"
            if qname in seen:
                continue
            seen.add(qname)
            out.append((qname, est))
        for child in node.children or []:
            visit(child)

    for root in subsystems:
        visit(root)
    return out


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _aabb_overlap(a: BBox, b: BBox) -> bool:
    """Test whether two AABBs overlap. Both must have explicit origins set
    (otherwise overlap is undefined and we conservatively return False)."""
    if a.origin_mm == (0.0, 0.0, 0.0) or b.origin_mm == (0.0, 0.0, 0.0):
        return False
    for axis in range(3):
        a_min = a.origin_mm[axis]
        a_max = a_min + (a.x_mm, a.y_mm, a.z_mm)[axis]
        b_min = b.origin_mm[axis]
        b_max = b_min + (b.x_mm, b.y_mm, b.z_mm)[axis]
        if a_max <= b_min or b_max <= a_min:
            return False
    return True


def _detect_clashes(
    nodes: list[tuple[str, SpatialEstimate]],
) -> dict[str, list[str]]:
    clashes: dict[str, list[str]] = {}
    for (na, ea), (nb, eb) in combinations(nodes, 2):
        if ea.bbox and eb.bbox and _aabb_overlap(ea.bbox, eb.bbox):
            clashes.setdefault(na, []).append(nb)
            clashes.setdefault(nb, []).append(na)
    return clashes


def _compose_notes(
    nodes: list[tuple[str, SpatialEstimate]],
    total_mass: float,
) -> list[str]:
    notes: list[str] = []
    if not nodes:
        notes.append("No modules carry a spatial estimate yet — discovery is empty.")
        return notes

    estimate_count = sum(1 for _, e in nodes if e.confidence != "library")
    library_count = len(nodes) - estimate_count
    notes.append(
        f"{len(nodes)} module(s) with spatial data "
        f"({library_count} from reference library, {estimate_count} LLM estimate)."
    )

    if total_mass:
        # Identify the heaviest single module
        heaviest = max(nodes, key=lambda kv: kv[1].mass_g or 0)
        if heaviest[1].mass_g:
            pct = 100 * (heaviest[1].mass_g or 0) / total_mass
            notes.append(
                f"Heaviest module: {heaviest[0]} at {heaviest[1].mass_g:.0f}g "
                f"({pct:.0f}% of total)."
            )

    return notes


# ---------------------------------------------------------------------------
# Public: discovery
# ---------------------------------------------------------------------------

def discover_package(subsystems: Iterable[SuggestedSubsystem]) -> PackageMap:
    """Compute the descriptive PackageMap for a set of subsystems.

    The result includes:
      - per-node clash list (only for nodes with explicit origins)
      - required envelope (sum of x extents, max of y/z extents — a serial-row
        lower bound that ignores any optimisation potential from clever
        packing)
      - total mass
      - inline SVG and markdown table for the FE
      - human-readable notes
    """
    flat = _flatten_modules_with_spatial(subsystems)

    total_x = sum(e.bbox.x_mm for _, e in flat if e.bbox)
    max_y = max((e.bbox.y_mm for _, e in flat if e.bbox), default=0.0)
    max_z = max((e.bbox.z_mm for _, e in flat if e.bbox), default=0.0)
    total_mass = sum((e.mass_g or 0.0) for _, e in flat)

    clashes = _detect_clashes(flat)
    nodes = [
        PackageNode(name=name, spatial=est, clashes=clashes.get(name, []))
        for name, est in flat
    ]

    required = RequiredEnvelope(
        total_bbox_mm=(total_x, max_y, max_z),
        total_mass_g=total_mass,
    )
    notes = _compose_notes(flat, total_mass)

    pkg = PackageMap(nodes=nodes, required=required, notes=notes)
    pkg.svg = render_package_map_svg(pkg)
    pkg.table_md = render_package_map_table(pkg)
    return pkg


# ---------------------------------------------------------------------------
# Public: what-if overlay
# ---------------------------------------------------------------------------

def apply_overlay(package: PackageMap, overlay: dict) -> PackageMap:
    """Re-evaluate a previously discovered PackageMap against a hypothetical
    overlay. Returns a NEW PackageMap (does not mutate input).

    Overlay schema (all keys optional):
      {
        "zones": {
          "<zone_name>": {"x_mm": ..., "y_mm": ..., "z_mm": ..., "anchor": "..."}
        },
        "mass_budget_g": {
          "<category_or_zone>": <max_mass>
        }
      }

    Violation rules:
      - For each zone, sum the x_mm of nodes whose anchor matches the zone
        name. Flag overflow when the sum exceeds the zone's x_mm. (We use
        x as the dominant axis because most e-bike packaging is length-bound;
        callers wanting full 3D enforcement can extend this later.)
      - For each mass budget, sum the masses of nodes whose anchor or name
        contains the budget key. Flag overflow when the sum exceeds the cap.
    """
    violations: list[str] = []

    zones = (overlay or {}).get("zones") or {}
    for zone_name, zone_spec in zones.items():
        cap_x = float(zone_spec.get("x_mm") or 0)
        if cap_x <= 0:
            continue
        used = sum(
            (n.spatial.bbox.x_mm if n.spatial.bbox else 0.0)
            for n in package.nodes
            if n.spatial.bbox and n.spatial.bbox.anchor == zone_name
        )
        if used > cap_x:
            violations.append(
                f"zone {zone_name}: x-extent {used:.0f}mm exceeds cap {cap_x:.0f}mm"
            )

    mass_budget = (overlay or {}).get("mass_budget_g") or {}
    for budget_key, cap in mass_budget.items():
        cap_v = float(cap or 0)
        if cap_v <= 0:
            continue
        used = sum(
            (n.spatial.mass_g or 0.0)
            for n in package.nodes
            if budget_key in n.name
            or (n.spatial.bbox and n.spatial.bbox.anchor == budget_key)
        )
        if used > cap_v:
            violations.append(
                f"mass budget {budget_key}: {used:.0f}g exceeds cap {cap_v:.0f}g"
            )

    overlaid = PackageMap(
        nodes=package.nodes,
        required=package.required,
        overlay_budget=overlay,
        overlay_violations=violations,
        notes=list(package.notes),
    )
    overlaid.svg = render_package_map_svg(overlaid)
    overlaid.table_md = render_package_map_table(overlaid)
    return overlaid
