import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackageMapPanel } from "../PackageMapPanel";
import type { PackageMap, PackageNode } from "@/types/generated/subsystem";

function makeNode(
  name: string,
  clashes: string[] = [],
): PackageNode {
  return {
    name,
    spatial: {
      bbox: { x_mm: 100, y_mm: 50, z_mm: 40 },
      mass_g: 500,
      confidence: "estimate",
    },
    clashes,
  };
}

function makeMap(overrides: Partial<PackageMap> = {}): PackageMap {
  return {
    nodes: [makeNode("battery_bay"), makeNode("motor_mount")],
    required: {
      total_bbox_mm: [1200, 400, 300.5],
      total_mass_g: 12345,
    },
    svg: "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>",
    notes: ["note alpha", "note beta"],
    ...overrides,
  };
}

describe("PackageMapPanel", () => {
  it("shows placeholder when packageMap is null", () => {
    render(<PackageMapPanel packageMap={null} />);
    expect(screen.getByText(/尚無空間資料/)).toBeInTheDocument();
  });

  it("shows placeholder when nodes array is empty", () => {
    const empty: PackageMap = {
      nodes: [],
      required: { total_bbox_mm: [0, 0, 0], total_mass_g: 0 },
    };
    render(<PackageMapPanel packageMap={empty} />);
    expect(screen.getByText(/尚無空間資料/)).toBeInTheDocument();
  });

  it("renders node count badge and totals with thousand separators", () => {
    render(<PackageMapPanel packageMap={makeMap()} />);
    expect(screen.getByText("2 nodes")).toBeInTheDocument();
    // Total mass formatted with comma
    expect(screen.getByText(/12,345/)).toBeInTheDocument();
    // Dimensions: 1200×400×300.5
    expect(screen.getByText(/1200/)).toBeInTheDocument();
    expect(screen.getByText(/300\.5/)).toBeInTheDocument();
  });

  it("renders SVG via dangerouslySetInnerHTML", () => {
    const { container } = render(<PackageMapPanel packageMap={makeMap()} />);
    expect(container.innerHTML.includes("<svg")).toBe(true);
  });

  it("renders notes list", () => {
    render(<PackageMapPanel packageMap={makeMap()} />);
    expect(screen.getByText("note alpha")).toBeInTheDocument();
    expect(screen.getByText("note beta")).toBeInTheDocument();
  });

  it("does not render clash banner when no clashes", () => {
    render(<PackageMapPanel packageMap={makeMap()} />);
    expect(screen.queryByText(/空間衝突/)).not.toBeInTheDocument();
  });

  it("renders clash banner and deduped pair when any node reports clashes", () => {
    const pkg = makeMap({
      nodes: [
        makeNode("battery_bay", ["motor_mount"]),
        makeNode("motor_mount", ["battery_bay"]),
      ],
    });
    render(<PackageMapPanel packageMap={pkg} />);
    expect(screen.getByText(/空間衝突 · 1 對/)).toBeInTheDocument();
    expect(
      screen.getByText(/battery_bay ↔ motor_mount/),
    ).toBeInTheDocument();
  });

  it("shows SVG placeholder when svg is absent but nodes exist", () => {
    const pkg = makeMap({ svg: undefined });
    render(<PackageMapPanel packageMap={pkg} />);
    expect(
      screen.getByText(/尚未附帶 SVG 視圖/),
    ).toBeInTheDocument();
  });
});
