export interface TrizParameter {
  id: number;
  name: string;
  nameZh: string;
}

export interface Contradiction {
  id: string;
  projectId: string;
  naturalDescription: string;
  improvingParam: number | null;
  worseningParam: number | null;
  engineeringStatement: string;
  physicalContradiction: string;
  createdAt: string;
  updatedAt: string;
}

export type ContradictionFormData = Omit<Contradiction, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
