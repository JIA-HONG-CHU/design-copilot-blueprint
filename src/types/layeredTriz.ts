/**
 * LayeredTrizSolution TypeScript mirror of backend `app/models/schemas.py:511-669`.
 *
 * Refs:
 *   - docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §5 schema
 *   - docs/diagrams/create-ux-spec.md v7 Tab ① 區塊 B
 *   - docs/e2e/module/TRIZ_Layered_Drilldown_Development_WBS.md §1.1 / §2
 *
 * Shape is a 1:1 reflection of the Pydantic model so that JSON responses
 * from `POST /triz/solve-layered` deserialise without transform.
 */

// ---- Frozen enums (WBS 1.2) -------------------------------------------------

export type LayerRole = 'phenomenon' | 'root_cause' | 'structural_lens';

export type DepthIndicator =
  | 'trade-off 改良'
  | '根因突破'
  | '功能鏈缺陷修補';

export type SeparationType = 'time' | 'space' | 'condition' | 'whole_part';

export type EvidenceLevelFloor = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

export type LayerStatus = 'ran' | 'skipped_quick_mode' | 'skipped_condition' | 'error';

export type TrizSeverity = 'fatal' | 'major' | 'minor' | 'unknown';

// ---- Suggestions reuse the flat schema from the legacy /triz/solve API ------

export interface LayeredTrizSuggestion {
  path: string; // TC | PC | SuField
  principle_number: number | null;
  principle_name: string;
  suggestion: string;
  separation_principle?: string;
  affected_modules: string[];
  secondary_contradictions: string[];
}

// ---- L1 Surface (TC, always runs) ------------------------------------------

export interface L1Surface {
  layer_role: 'phenomenon';
  type: 'TC';
  improving_param: number | null;
  worsening_param: number | null;
  candidate_principles: number[];
  suggestions: LayeredTrizSuggestion[];
  depth_indicator: DepthIndicator;
  evidence_level_floor: EvidenceLevelFloor;
  critic_trigger_l2: boolean;
  critic_reason: string;
  critic_confidence: number;
  status: LayerStatus;
}

// ---- L2 Root Cause (PC, conditional) ---------------------------------------

export interface SeparationCandidate {
  type: SeparationType;
  rationale: string;
  confidence: number;
}

export interface DeepenLink {
  from_layer: 'L1_surface';
  from_tc_pair: [number | null, number | null];
  derived_physical_parameter: string;
  contradiction_statement: string;
  separation_type_candidates: SeparationCandidate[];
}

export interface L2RootCause {
  layer_role: 'root_cause';
  type: 'PC';
  triggered: boolean;
  trigger_reason: string;
  deepen_link: DeepenLink | null;
  suggestions: LayeredTrizSuggestion[];
  depth_indicator: DepthIndicator;
  evidence_level_floor: EvidenceLevelFloor;
  status: LayerStatus;
}

// ---- L3 Structural lens (SF, always runs, parallel) ------------------------

export type SuFieldState =
  | 'incomplete'
  | 'effective'
  | 'harmful'
  | 'insufficient'
  | 'unknown';

export interface SuFieldModel {
  S1: string;
  S2: string;
  F: string;
  state: SuFieldState;
}

export interface L3StructuralCheck {
  layer_role: 'structural_lens';
  type: 'SF';
  su_field_model: SuFieldModel;
  matched_standard_solutions: string[];
  suggestions: LayeredTrizSuggestion[];
  supports_l1: string;
  supports_l2: string;
  standalone_value: string;
  depth_indicator: DepthIndicator;
  evidence_level_floor: EvidenceLevelFloor;
  status: LayerStatus;
}

// ---- Differential analysis --------------------------------------------------

export interface DifferentialPairAnalysis {
  on_solving_degree: string;
  on_effort: string;
  on_risk: string;
  orthogonality: string;
  synergy: string;
}

export type AdoptedLayerId = 'L1' | 'L2' | 'L3';

export interface RecommendedRoute {
  primary: string;
  fallback: string;
  adopted_layers: AdoptedLayerId[];
  rationale: string;
}

export interface DifferentialAnalysis {
  l1_vs_l2: DifferentialPairAnalysis;
  l1_vs_l3: DifferentialPairAnalysis;
  l2_vs_l3: DifferentialPairAnalysis;
  recommended_route: RecommendedRoute;
}

// ---- Phase B directive -----------------------------------------------------

export interface PhaseBDirective {
  same_contradiction_intra_layer_conflict: 'skip' | 'check';
  cross_contradiction_conflict: 'skip' | 'check';
}

// ---- Top-level LayeredTrizSolution -----------------------------------------

export interface LayeredTrizSolution {
  id: string;
  project_id: string;
  contradiction_id: string;
  contradiction_natural_description: string;
  severity: TrizSeverity;

  l1_surface: L1Surface;
  l2_root_cause: L2RootCause | null;
  l3_structural_check: L3StructuralCheck;

  differential_analysis: DifferentialAnalysis;
  phase_b_directive: PhaseBDirective;
}

// ---- API request/response --------------------------------------------------

export interface SolveTrizLayeredRequest {
  project_id: string;
  contradiction_id: string;
  natural_description: string;
  severity?: TrizSeverity;
  improving_param?: number | null;
  worsening_param?: number | null;
  physical_contradiction?: string | null;
  sf_substance_1?: string | null;
  sf_substance_2?: string | null;
  sf_field?: string | null;
  quick_mode?: boolean;
  force_l2?: boolean;
  // Hint fields for child PC solve (Phase 9.1 / 9.2)
  separation_principle_id?: string | null;
  separation_category?: string | null;
  separation_rationale?: string | null;
  derived_parameter?: string | null;
}

export interface SolveTrizLayeredResponse {
  layered_solution: LayeredTrizSolution;
}

// ---- Display helpers -------------------------------------------------------

/** Visual theme (v7 Tab ① 區塊 B): blue / amber / green for L1 / L2 / L3. */
export const LAYER_COLOR: Record<AdoptedLayerId, string> = {
  L1: 'text-blue-600 dark:text-blue-400',
  L2: 'text-amber-600 dark:text-amber-400',
  L3: 'text-emerald-600 dark:text-emerald-400',
};

export const LAYER_LABEL: Record<AdoptedLayerId, string> = {
  L1: '現象層 (TC)',
  L2: '根因層 (PC)',
  L3: '結構層 (SF)',
};

export const SEVERITY_BADGE: Record<TrizSeverity, string> = {
  fatal: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
  major: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
  minor: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-500',
};

/** Convert a layer id to its human-readable depth_indicator fallback. */
export function defaultDepthIndicator(layer: AdoptedLayerId): DepthIndicator {
  switch (layer) {
    case 'L1':
      return 'trade-off 改良';
    case 'L2':
      return '根因突破';
    case 'L3':
      return '功能鏈缺陷修補';
  }
}
