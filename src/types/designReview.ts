export interface EvidenceItem {
  id: string;
  category: string;
  requirement: string;
  currentEvidence: string;
  evidenceQuality: "strong" | "moderate" | "weak" | "none";
  evidenceGap: string;
  nextExperiment: string;
  owner: string;
  dueDate: string;
}

export interface RiskItem {
  id: string;
  description: string;
  failureMode: string;
  probability: "low" | "medium" | "high";
  severity: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high" | "critical";
  mitigation: string;
  monitoringMetric: string;
}

export interface DesignReviewData {
  solutionId: string;
  evidenceMatrix: EvidenceItem[];
  riskRegister: RiskItem[];
  disposition: "approve" | "revise" | "reject" | null;
  conclusion: string;
  reviewed: boolean;
}
