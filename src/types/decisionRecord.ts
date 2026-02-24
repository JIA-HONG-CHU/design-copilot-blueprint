export interface MustResult {
  solutionName: string;
  passed: boolean;
  reason: string;
}

export interface WantResult {
  solutionName: string;
  criteria: string;
  weight: number;
  score: number;
  weightedScore: number;
  evidenceLink: string;
}

export interface RiskEntry {
  id: string;
  description: string;
  level: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  dueDate: string;
  completed: boolean;
}

export interface SignOff {
  role: string;
  name: string;
  signed: boolean;
  signedAt: string | null;
}

export interface DecisionRecord {
  id: string;
  projectId: string;
  statement: string;
  decider: string;
  deciderRole: string;
  date: string;
  primarySolution: string;
  backupSolution: string;
  mustResults: MustResult[];
  wantResults: WantResult[];
  risks: RiskEntry[];
  actionItems: ActionItem[];
  signOffs: SignOff[];
}
