import { DesignReviewData, EvidenceItem, RiskItem } from "@/types/designReview";

const defaultEvidence = (solId: string): EvidenceItem[] => [
  { id: "e1", category: "結構強度", requirement: "承載 ≥ 500N", currentEvidence: "", evidenceQuality: "none", evidenceGap: "", nextExperiment: "", owner: "", dueDate: "" },
  { id: "e2", category: "熱管理", requirement: "工作溫度 ≤ 85°C", currentEvidence: "", evidenceQuality: "none", evidenceGap: "", nextExperiment: "", owner: "", dueDate: "" },
  { id: "e3", category: "製造可行性", requirement: "現有產線可生產", currentEvidence: "", evidenceQuality: "none", evidenceGap: "", nextExperiment: "", owner: "", dueDate: "" },
];

const defaultRisks = (solId: string): RiskItem[] => [
  { id: "rk1", description: "", failureMode: "", probability: "low", severity: "low", riskLevel: "low", mitigation: "", monitoringMetric: "" },
];

export const createDefaultReview = (solId: string): DesignReviewData => ({
  solutionId: solId,
  evidenceMatrix: defaultEvidence(solId),
  riskRegister: defaultRisks(solId),
  disposition: null,
  conclusion: "",
  reviewed: false,
});
