// WANT Criteria
export interface WantCriterion {
  id: string;
  name: string;
  weight: number; // 1-10
  description: string;
  anchors?: { score10: string; score6: string; score2: string };
}

// WANT Scores per alternative
export interface WantScore {
  alternativeId: string;
  alternativeName: string;
  scores: Record<string, number>; // criterion id -> raw score (1-10)
  weightedTotal: number;
}

// KT Decision
export type DecisionStatus = 'draft' | 'confirmed' | 'signed';

export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
}

export interface KtDecision {
  selectedAlternativeId: string;
  selectedAlternativeName: string;
  rationale: string;
  riskAcceptance: string;
  actionItems: ActionItem[];
  decisionDate: string;
  status: DecisionStatus;
}

// Signature
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface Signature {
  name: string;
  role: string;
  status: SignatureStatus;
  signedAt: string | null;
  note: string;
}

// Gate items
export interface DecideGateItem {
  label: string;
  passed: boolean;
}

// Default WANT template
export const DEFAULT_WANT_TEMPLATE: Omit<WantCriterion, 'id'>[] = [
  { name: 'W1 性能餘裕', weight: 10, description: '方案是否滿足或超越效能需求', anchors: { score10: '完全滿足+20%餘裕', score6: '剛好滿足', score2: '不足需妥協' } },
  { name: 'W2 製造可行', weight: 8, description: '現有產線的製造可行性', anchors: { score10: '現有製程可做', score6: '需小幅改造', score2: '需全新製程' } },
  { name: 'W3 成本競爭', weight: 7, description: '成本是否在目標範圍', anchors: { score10: '低於目標成本', score6: '接近目標', score2: '超出30%+' } },
  { name: 'W4 可靠性', weight: 8, description: 'MTBF 等可靠性指標', anchors: { score10: 'MTBF>10萬小時', score6: 'MTBF 5-10萬小時', score2: 'MTBF<5萬小時' } },
  { name: 'W5 開發時程', weight: 6, description: '開發時程風險', anchors: { score10: '提前完成', score6: '準時', score2: '延遲>2個月' } },
  { name: 'W6 擴展性', weight: 5, description: '模組化與擴展能力', anchors: { score10: '完全獨立模組化', score6: '部分耦合', score2: '高度耦合' } },
];
