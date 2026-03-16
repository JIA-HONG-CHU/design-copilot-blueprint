// Multi-Solution Adoption Strategy types (Step 5a-X)

/** 5 情境判斷類型 — 對應 TRIZ_Multi_Solution_Adoption_Strategy.md §2 */
export type AdoptionType = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export const ADOPTION_TYPE_LABELS: Record<AdoptionType, { zh: string; strategy: string }> = {
  M1: { zh: '不同維度', strategy: '合併採納' },
  M2: { zh: '互相強化', strategy: '合併採納' },
  M3: { zh: '不同子系統', strategy: '各自採納' },
  M4: { zh: '互斥', strategy: '擇一篩選' },
  M5: { zh: '資源有限', strategy: '擇優保留' },
};

export type CompatibilityResult = 'compatible' | 'exclusive' | 'needs_verification';

export interface SolutionCompatibility {
  solutionAId: string;
  solutionBId: string;
  result: CompatibilityResult;
  adoptionType: AdoptionType | null;
  reason: string;
}

export interface CompositionEntry {
  solutionId: string;
  sourcePrinciple: string;
  concrete: string;
  dimension: string;
  adoptionType: AdoptionType;
}

export interface ConceptRoute {
  id: string;
  type: 'single' | 'composite';
  composition: CompositionEntry[];
  compositionRationale: string;
  antiPatternWarnings: string[];
  createdAt?: string;
}

export interface CompatibilityMatrix {
  solutions: { id: string; label: string; dimension: string }[];
  pairs: SolutionCompatibility[];
}

export interface AntiPatternCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface MultiSolutionAdoptionState {
  matrix: CompatibilityMatrix;
  recommendedRoutes: ConceptRoute[];
  antiPatternChecks: AntiPatternCheck[];
}
