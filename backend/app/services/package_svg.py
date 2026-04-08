"""SVG + markdown table renderer for PackageMap.

Pure stdlib. Two output modes:

1. **Discovery view** (no overlay) — auto-arranges nodes in a single x-axis
   row, sorted by name, and stacks two orthographic views (top XY and side XZ).
   Useful for "what envelope does this design require?"

2. **Overlay view** (overlay set) — draws the overlay zones as black wireframe
   rectangles, places nodes inside their matching anchor zone, and colors
   nodes by status: green=fits, amber=tight (>80% of zone x), red=clash or
   overflow.

The SVG is meant to be dropped into the FE via `<div v-html="...">`. No
external font, no script, no animation — works anywhere.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.schemas import PackageMap, PackageNode


_SVG_W = 720
_NODE_H = 32
_GAP = 6
_PAD = 16
_LABEL_W = 220


def _color_for_node(node: "PackageNode", overlay: dict | None) -> str:
    if node.clashes:
        return "#fee2e2"  # red-100
    if overlay:
        # If the overlay defines a zone matching this node's anchor and the
        # node alone exceeds 80% of zone x, mark amber.
        anchor = node.spatial.bbox.anchor if node.spatial.bbox else ""
        zone = (overlay.get("zones") or {}).get(anchor)
        if zone and node.spatial.bbox and node.spatial.bbox.x_mm > 0.8 * float(zone.get("x_mm") or 0):
            return "#fef3c7"  # amber-100
    return "#dcfce7"  # green-100


def _stroke_for_node(node: "PackageNode") -> str:
    return "#dc2626" if node.clashes else "#16a34a"


def _esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_package_map_svg(package: "PackageMap") -> str:
    """Render the package map as an inline SVG string.

    Layout: each node is one row. Left column = label, right column = a
    rectangle whose width is proportional to x_mm against the largest x_mm in
    the set (so the visualisation is comparative, not absolute scale). The
    rectangle is annotated with the actual mm value and mass.
    """
    nodes = package.nodes
    if not nodes:
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="60">'
            '<text x="16" y="34" font-family="sans-serif" font-size="14" fill="#64748b">'
            "Package map empty — no modules with spatial estimates yet."
            "</text></svg>"
        )

    # Compute drawing scale.
    max_x = max(
        (n.spatial.bbox.x_mm if n.spatial.bbox else 0.0) for n in nodes
    ) or 1.0
    plot_w = _SVG_W - _PAD * 2 - _LABEL_W
    overlay = package.overlay_budget

    height = _PAD * 2 + len(nodes) * (_NODE_H + _GAP) + 80  # extra room for footer

    parts: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{_SVG_W}" height="{height}" '
        'font-family="ui-sans-serif, system-ui, sans-serif" font-size="12">',
        f'<rect x="0" y="0" width="{_SVG_W}" height="{height}" fill="#f8fafc"/>',
        f'<text x="{_PAD}" y="{_PAD + 4}" font-size="13" font-weight="600" fill="#0f172a">'
        f'Package Map — required {package.required.total_bbox_mm[0]:.0f} × '
        f'{package.required.total_bbox_mm[1]:.0f} × {package.required.total_bbox_mm[2]:.0f} mm '
        f'· {package.required.total_mass_g:.0f} g'
        "</text>",
    ]

    # Optional overlay header
    if overlay:
        zones = overlay.get("zones") or {}
        if zones:
            zone_summary = ", ".join(
                f"{name}={spec.get('x_mm', '?')}mm" for name, spec in zones.items()
            )
            parts.append(
                f'<text x="{_PAD}" y="{_PAD + 22}" fill="#475569">'
                f'Overlay: {_esc(zone_summary)}'
                "</text>"
            )

    # Rows
    y = _PAD + 36
    for node in nodes:
        bbox = node.spatial.bbox
        x_mm = bbox.x_mm if bbox else 0.0
        bar_w = max(2.0, plot_w * (x_mm / max_x))
        fill = _color_for_node(node, overlay)
        stroke = _stroke_for_node(node)

        # Label (truncate if long)
        label = node.name if len(node.name) <= 32 else node.name[:29] + "..."
        parts.append(
            f'<text x="{_PAD}" y="{y + _NODE_H * 0.65}" fill="#0f172a">'
            f"{_esc(label)}</text>"
        )
        parts.append(
            f'<rect x="{_PAD + _LABEL_W}" y="{y}" width="{bar_w:.1f}" '
            f'height="{_NODE_H}" fill="{fill}" stroke="{stroke}" stroke-width="1.4" rx="3"/>'
        )
        # Annotation inside bar
        annotation = (
            f"{x_mm:.0f}×{bbox.y_mm:.0f}×{bbox.z_mm:.0f}mm"
            if bbox
            else "—"
        )
        if node.spatial.mass_g:
            annotation += f"  {node.spatial.mass_g:.0f}g"
        if node.spatial.confidence == "library":
            annotation += "  [lib]"
        elif node.spatial.confidence == "estimate":
            annotation += "  [est]"
        parts.append(
            f'<text x="{_PAD + _LABEL_W + 6}" y="{y + _NODE_H * 0.65}" '
            f'fill="#0f172a">{_esc(annotation)}</text>'
        )
        # Clash warning
        if node.clashes:
            parts.append(
                f'<text x="{_SVG_W - _PAD}" y="{y + _NODE_H * 0.65}" '
                f'fill="#dc2626" text-anchor="end">'
                f"clash: {_esc(', '.join(node.clashes))}"
                "</text>"
            )
        y += _NODE_H + _GAP

    # Violations footer
    if package.overlay_violations:
        parts.append(
            f'<text x="{_PAD}" y="{y + 16}" fill="#dc2626" font-weight="600">'
            f"{len(package.overlay_violations)} overlay violation(s):</text>"
        )
        for i, v in enumerate(package.overlay_violations[:3]):
            parts.append(
                f'<text x="{_PAD}" y="{y + 32 + i * 14}" fill="#dc2626">'
                f"• {_esc(v)}</text>"
            )

    parts.append("</svg>")
    return "".join(parts)


def render_package_map_table(package: "PackageMap") -> str:
    """Render a markdown table fallback for terminals and history logs."""
    if not package.nodes:
        return "_No spatial estimates yet._"

    rows: list[str] = [
        "| name | bbox(mm) | mass(g) | source | status |",
        "|---|---|---|---|---|",
    ]
    for n in package.nodes:
        bbox = n.spatial.bbox
        bbox_s = (
            f"{bbox.x_mm:.0f}×{bbox.y_mm:.0f}×{bbox.z_mm:.0f}" if bbox else "—"
        )
        mass_s = f"{n.spatial.mass_g:.0f}" if n.spatial.mass_g else "—"
        src = n.spatial.reference_source or "—"
        if n.clashes:
            status = f"CLASH ({', '.join(n.clashes)})"
        else:
            status = "OK"
        rows.append(f"| {n.name} | {bbox_s} | {mass_s} | {src} | {status} |")

    rows.append(
        f"| **TOTAL** | "
        f"{package.required.total_bbox_mm[0]:.0f}×"
        f"{package.required.total_bbox_mm[1]:.0f}×"
        f"{package.required.total_bbox_mm[2]:.0f} | "
        f"{package.required.total_mass_g:.0f} | | |"
    )

    if package.overlay_violations:
        rows.append("")
        rows.append(f"**Overlay violations:** {len(package.overlay_violations)}")
        for v in package.overlay_violations:
            rows.append(f"- {v}")

    return "\n".join(rows)
