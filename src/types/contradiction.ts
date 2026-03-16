export interface TrizParameter {
  id: number;
  name: string;
  nameZh: string;
}

export type ContradictionSeverity = 'fatal' | 'major' | 'minor';

export interface Contradiction {
  id: string;
  projectId: string;
  naturalDescription: string;
  improvingParam: number | null;
  worseningParam: number | null;
  engineeringStatement: string;
  physicalContradiction: string;
  severity: ContradictionSeverity;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ContradictionFormData = Omit<Contradiction, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
