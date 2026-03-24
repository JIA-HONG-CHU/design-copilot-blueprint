export interface TrizParameter {
  id: number;
  name: string;
  nameZh: string;
}

export const CONTRADICTION_SEVERITIES = ['fatal', 'major', 'minor'] as const;
export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITIES)[number];
export const DEFAULT_SEVERITY: ContradictionSeverity = 'minor';

export type ContradictionSourceType = 'socratic' | 'manual' | 'scamper_feedback' | 'convergence';

export interface Contradiction {
  id: string;
  projectId: string;
  naturalDescription: string;
  improvingParam: number | null;
  worseningParam: number | null;
  engineeringStatement: string;
  physicalContradiction: string;
  type: 'TC' | 'PC' | null;
  severity: ContradictionSeverity;
  resolved: boolean;
  sourceQuestionId: string | null;
  sourceType: ContradictionSourceType;
  createdAt: string;
  updatedAt: string;
}

export interface ContradictionAssumptionLink {
  id: string;
  contradictionId: string;
  assumptionId: string;
  linkType: 'depends_on' | 'challenges' | 'derived_from';
  createdAt: string;
}

export type ContradictionFormData = Omit<Contradiction, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
