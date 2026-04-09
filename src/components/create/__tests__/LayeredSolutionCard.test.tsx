import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayeredSolutionCard } from "../LayeredSolutionCard";
import { ConceptRouteCard } from "../ConceptRouteCard";
import type { LayeredTrizSolution, LayeredTrizSuggestion } from "@/types/layeredTriz";
import type { ConceptRoute } from "@/types/conceptRoute";

// ---------------------------------------------------------------------------
// Fixtures — matches the e-bike motor cooling golden case (§7)
// ---------------------------------------------------------------------------

const tcSug = (num: number, name: string, text: string): LayeredTrizSuggestion => ({
  path: "TC",
  principle_number: num,
  principle_name: name,
  suggestion: text,
  affected_modules: ["motor"],
  secondary_contradictions: [],
});

function makeLayeredSolution(overrides: Partial<LayeredTrizSolution> = {}): LayeredTrizSolution {
  return {
    id: "LTS-EBIKE-012",
    project_id: "p1",
    contradiction_id: "C-EBIKE-012",
    contradiction_natural_description: "馬達功率密度提升導致定子溫度超過 145°C 絕緣上限",
    severity: "major",
    l1_surface: {
      layer_role: "phenomenon",
      type: "TC",
      improving_param: 21,
      worsening_param: 17,
      candidate_principles: [19, 35, 3, 36],
      suggestions: [
        tcSug(19, "Periodic Action", "脈衝冷卻 PWM"),
        tcSug(36, "Phase Transitions", "定子端蓋填 PCM"),
      ],
      depth_indicator: "trade-off 改良",
      evidence_level_floor: "E1",
      critic_trigger_l2: true,
      critic_reason: "四條皆屬折衷修補",
      critic_confidence: 0.88,
      status: "ran",
    },
    l2_root_cause: {
      layer_role: "root_cause",
      type: "PC",
      triggered: true,
      trigger_reason: "severity=major → 預設深挖",
      deepen_link: {
        from_layer: "L1_surface",
        from_tc_pair: [21, 17],
        derived_physical_parameter: "瞬時功率 P(t)",
        contradiction_statement: "P(t) 必須 ≥ P_peak 且 ≤ P_thermal",
        separation_type_candidates: [
          { type: "time", confidence: 0.85, rationale: "爬坡 10s 高，巡航低" },
          { type: "condition", confidence: 0.62, rationale: "" },
        ],
      },
      suggestions: [
        {
          path: "PC",
          principle_number: null,
          principle_name: "時間分離: 週期性切換",
          separation_principle: "時間分離",
          suggestion: "雙模態功率管理器",
          affected_modules: ["firmware"],
          secondary_contradictions: [],
        },
      ],
      depth_indicator: "根因突破",
      evidence_level_floor: "E1",
      status: "ran",
    },
    l3_structural_check: {
      layer_role: "structural_lens",
      type: "SF",
      su_field_model: {
        S1: "定子繞線",
        S2: "外殼",
        F: "熱場",
        state: "insufficient",
      },
      matched_standard_solutions: ["2.2.1", "2.4.1"],
      suggestions: [
        {
          path: "SuField",
          principle_number: null,
          principle_name: "2.2.1 引入 S3 中介物",
          suggestion: "熱管陣列作為 S3",
          affected_modules: ["thermal"],
          secondary_contradictions: [],
        },
      ],
      supports_l1: "為脈衝冷卻提供熱容緩衝",
      supports_l2: "延長峰值窗口 +40%",
      standalone_value: "獨立改善 15%",
      depth_indicator: "功能鏈缺陷修補",
      evidence_level_floor: "E1",
      status: "ran",
    },
    differential_analysis: {
      l1_vs_l2: {
        on_solving_degree: "L1 優化 10-15%，L2 消除主矛盾",
        on_effort: "L1 小改，L2 需韌體",
        on_risk: "L1 低，L2 中",
        orthogonality: "",
        synergy: "",
      },
      l1_vs_l3: {
        on_solving_degree: "",
        on_effort: "",
        on_risk: "",
        orthogonality: "L1 時間 × L3 熱傳路徑",
        synergy: "",
      },
      l2_vs_l3: {
        on_solving_degree: "",
        on_effort: "",
        on_risk: "",
        orthogonality: "",
        synergy: "峰值窗口 +40%",
      },
      recommended_route: {
        primary: "L2 + L3 組合（突破路線）",
        fallback: "L1 單獨（快速路線）",
        adopted_layers: ["L2", "L3"],
        rationale: "severity=major + 韌體資源充足",
      },
    },
    phase_b_directive: {
      same_contradiction_intra_layer_conflict: "skip",
      cross_contradiction_conflict: "check",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// LayeredSolutionCard tests
// ---------------------------------------------------------------------------

describe("LayeredSolutionCard", () => {
  it("renders the three layers and deepen_link visualization", () => {
    render(<LayeredSolutionCard solution={makeLayeredSolution()} />);
    expect(screen.getByTestId("layered-solution-card")).toBeInTheDocument();
    expect(screen.getByTestId("l1-section")).toBeInTheDocument();
    expect(screen.getByTestId("l2-section")).toBeInTheDocument();
    expect(screen.getByTestId("l3-section")).toBeInTheDocument();
    expect(screen.getByTestId("deepen-link")).toBeInTheDocument();
    // The deepen_link should surface the derived parameter
    expect(screen.getByText(/瞬時功率 P\(t\)/)).toBeInTheDocument();
  });

  it("shows the L1 critic badge when trade-off is detected", () => {
    render(<LayeredSolutionCard solution={makeLayeredSolution()} />);
    const badge = screen.getByTestId("l1-critic-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/折衷/);
  });

  it("shows the L3 bridge text even when L1/L2 already ran", () => {
    render(<LayeredSolutionCard solution={makeLayeredSolution()} />);
    const bridge = screen.getByTestId("l3-bridge");
    expect(bridge).toHaveTextContent(/supports L1/);
    expect(bridge).toHaveTextContent(/supports L2/);
    expect(bridge).toHaveTextContent(/standalone/);
  });

  it("renders differential_analysis with recommended route L2 + L3", () => {
    render(<LayeredSolutionCard solution={makeLayeredSolution()} />);
    const panel = screen.getByTestId("differential-analysis-panel");
    expect(panel).toHaveTextContent(/L2 \+ L3 組合/);
    expect(panel).toHaveTextContent(/fallback/);
  });

  it("clicking [採納推薦路線] invokes onAdopt with recommended layers", () => {
    const onAdopt = vi.fn();
    render(<LayeredSolutionCard solution={makeLayeredSolution()} onAdopt={onAdopt} />);
    fireEvent.click(screen.getByTestId("adopt-recommended-btn"));
    expect(onAdopt).toHaveBeenCalledWith("recommended", ["L2", "L3"]);
  });

  it("clicking [只採 L1 快速路線] invokes onAdopt with fallback mode", () => {
    const onAdopt = vi.fn();
    render(<LayeredSolutionCard solution={makeLayeredSolution()} onAdopt={onAdopt} />);
    fireEvent.click(screen.getByTestId("adopt-fallback-btn"));
    expect(onAdopt).toHaveBeenCalledWith("fallback", ["L1"]);
  });

  it("marks L2 as quick_mode skipped when orchestrator reports so", () => {
    const sol = makeLayeredSolution({
      severity: "minor",
      l2_root_cause: {
        layer_role: "root_cause",
        type: "PC",
        triggered: false,
        trigger_reason: "quick_mode skipped (severity=minor)",
        deepen_link: null,
        suggestions: [],
        depth_indicator: "根因突破",
        evidence_level_floor: "E1",
        status: "skipped_quick_mode",
      },
    });
    render(<LayeredSolutionCard solution={sol} />);
    expect(screen.getByText(/quick_mode 跳過/)).toBeInTheDocument();
  });

  it("surfaces the phase_b_directive default (intra-LTS skip)", () => {
    render(<LayeredSolutionCard solution={makeLayeredSolution()} />);
    expect(screen.getByText(/intra-LTS cross-layer/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConceptRouteCard — layered variant
// ---------------------------------------------------------------------------

function makeLayeredConceptRoute(): ConceptRoute {
  return {
    id: "CR-EMOTOR-008",
    type: "layered",
    composition: [],
    compositionRationale:
      "M6 跨層組合：L2 透過時間分離從根因解決矛盾；L3 補上 S3 中介物消除結構瓶頸。",
    antiPatternWarnings: [],
    layered: {
      ltsId: "LTS-EBIKE-012",
      adoptedLayers: ["L2", "L3"],
      availableLayers: ["L1", "L2", "L3"],
      recommendedRoute: "L2 + L3 組合（突破路線）",
      fallbackRoute: "L1 單獨（快速路線）",
      recommendedRationale: "severity=major，韌體資源充足",
      adoptionMode: "recommended",
      phaseBDirective: {
        sameContradictionIntraLayerConflict: "skip",
        crossContradictionConflict: "check",
      },
      differentialHighlight: "L2 時間分離 + L3 熱管緩衝 → 峰值窗口 +40%",
      layerSnapshots: [
        {
          layer: "L1",
          depthIndicator: "trade-off 改良",
          mechanismSummary: "脈衝冷卻 PWM + PCM 相變材料",
          suggestionCount: 4,
          principleHits: [19, 35, 3, 36],
          evidenceLevelFloor: "E1",
          effortHint: "low",
          assumptions: ["critic: 四條皆屬折衷修補"],
        },
        {
          layer: "L2",
          depthIndicator: "根因突破",
          mechanismSummary: "雙模態功率管理器：爬坡 10s 允許 P_peak，巡航降回 P_thermal",
          suggestionCount: 1,
          principleHits: [],
          evidenceLevelFloor: "E1",
          effortHint: "medium-high",
          assumptions: ["trigger: severity=major → 預設深挖"],
          deepenLink: {
            derivedParameter: "瞬時功率 P(t)",
            contradictionStatement: "P(t) 必須 ≥ P_peak 且 ≤ P_thermal",
            separationType: "time (0.85)",
          },
        },
        {
          layer: "L3",
          depthIndicator: "功能鏈缺陷修補",
          mechanismSummary: "引入熱管陣列作為 S3 中介物",
          suggestionCount: 1,
          principleHits: [],
          evidenceLevelFloor: "E1",
          effortHint: "medium",
          assumptions: ["Su-Field matched: 2.2.1, 2.4.1"],
          bridgeText: {
            supportsL1: "為脈衝冷卻提供熱容緩衝",
            supportsL2: "延長峰值窗口 +40%",
            standaloneValue: "獨立改善 15%",
          },
        },
      ],
    },
  };
}

describe("ConceptRouteCard layered variant", () => {
  it("renders the layered badges and recommended route summary", () => {
    render(<ConceptRouteCard route={makeLayeredConceptRoute()} />);
    expect(screen.getByTestId("concept-route-card-layered")).toBeInTheDocument();
    expect(screen.getByText(/Layered/)).toBeInTheDocument();
    const badges = screen.getByTestId("layer-adoption-badges");
    expect(badges).toHaveTextContent(/L1/);
    expect(badges).toHaveTextContent(/L2/);
    expect(badges).toHaveTextContent(/L3/);
    expect(screen.getByText(/L2 \+ L3 組合/)).toBeInTheDocument();
    expect(screen.getByText(/fallback：L1/)).toBeInTheDocument();
    expect(screen.getByText(/intra-LTS/)).toBeInTheDocument();
  });

  it("expands second eye to show per-layer mechanism summaries", () => {
    render(<ConceptRouteCard route={makeLayeredConceptRoute()} />);
    const toggle = screen.getByTestId("layered-second-eye-toggle");
    fireEvent.click(toggle);
    const content = screen.getByTestId("layered-second-eye-content");
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent(/脈衝冷卻/);
    expect(content).toHaveTextContent(/雙模態功率管理器/);
    expect(content).toHaveTextContent(/熱管陣列/);
    // differential highlight surfaced
    expect(content).toHaveTextContent(/峰值窗口 \+40%/);
    // principle hits visible on L1
    expect(content).toHaveTextContent(/19, 35, 3, 36/);
    // layer snapshot rows have the correct test ids
    expect(screen.getByTestId("layer-snapshot-L1")).toBeInTheDocument();
    expect(screen.getByTestId("layer-snapshot-L2")).toBeInTheDocument();
    expect(screen.getByTestId("layer-snapshot-L3")).toBeInTheDocument();
  });

  it("expands third eye to show deepen_link trace and L3 bridge text", () => {
    render(<ConceptRouteCard route={makeLayeredConceptRoute()} />);
    fireEvent.click(screen.getByTestId("layered-third-eye-toggle"));
    const content = screen.getByTestId("layered-third-eye-content");
    expect(content).toBeInTheDocument();
    // Assumptions
    expect(content).toHaveTextContent(/折衷修補/);
    // L2 deepen_link trace
    expect(content).toHaveTextContent(/瞬時功率 P\(t\)/);
    expect(content).toHaveTextContent(/time \(0\.85\)/);
    // L3 bridge text (both supports + standalone)
    expect(content).toHaveTextContent(/熱容緩衝/);
    expect(content).toHaveTextContent(/\+40%/);
    expect(content).toHaveTextContent(/獨立改善/);
  });
});
