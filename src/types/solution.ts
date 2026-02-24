export interface MustCriteria {
  id: string;
  label: string;
  passed: boolean | null; // null = not evaluated
}

export interface SolutionRisk {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
}

export interface Solution {
  id: string;
  projectId: string;
  name: string;
  description: string;
  mechanism: string;
  assumptions: string[];
  risks: SolutionRisk[];
  minValidation: string;
  mustCriteria: MustCriteria[];
  relatedContradictionIds: string[];
  createdAt: string;
  updatedAt: string;
}
