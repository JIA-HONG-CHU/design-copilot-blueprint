import type { WantCriterion, WantScore, KtDecision, Signature, AdverseConsequence } from '@/types/decisionRecord';

// Alternatives that passed Review (from Create mock data)
export const mockDecideAlternatives = [
  { id: 'alt-001', name: '磁力耦合 + 可變轉速方案' },
  { id: 'alt-002', name: '同軸直連 + 漸變壁厚方案' },
];

export const mockWantCriteria: WantCriterion[] = [
  { id: 'w1', name: 'W1 性能餘裕', weight: 10, description: '方案是否滿足或超越效能需求', anchors: { score10: '完全滿足+20%餘裕', score6: '剛好滿足', score2: '不足需妥協' } },
  { id: 'w2', name: 'W2 製造可行', weight: 8, description: '現有產線的製造可行性', anchors: { score10: '現有製程可做', score6: '需小幅改造', score2: '需全新製程' } },
  { id: 'w3', name: 'W3 成本競爭', weight: 7, description: '成本是否在目標範圍', anchors: { score10: '低於目標成本', score6: '接近目標', score2: '超出30%+' } },
  { id: 'w4', name: 'W4 可靠性', weight: 8, description: 'MTBF 等可靠性指標', anchors: { score10: 'MTBF>10萬小時', score6: 'MTBF 5-10萬小時', score2: 'MTBF<5萬小時' } },
  { id: 'w5', name: 'W5 開發時程', weight: 6, description: '開發時程風險', anchors: { score10: '提前完成', score6: '準時', score2: '延遲>2個月' } },
  { id: 'w6', name: 'W6 擴展性', weight: 5, description: '模組化與擴展能力', anchors: { score10: '完全獨立模組化', score6: '部分耦合', score2: '高度耦合' } },
  { id: 'w7', name: 'W7 驗證可行性', weight: 7, description: '核心假設可於1-2週內完成驗證的程度', anchors: { score10: '所有假設1週內可驗', score6: '主要假設2週可驗', score2: '關鍵假設無法短期驗證' } },
];

export const mockWantScores: WantScore[] = [
  {
    alternativeId: 'alt-001', alternativeName: '磁力耦合 + 可變轉速方案',
    scores: { w1: 8, w2: 7, w3: 6, w4: 7, w5: 6, w6: 8, w7: 7 },
    evidence: { w1: { artifactId: 'EVD-001', evidenceLevel: 'E2' }, w2: { artifactId: 'EVD-002', evidenceLevel: 'E1' }, w3: { artifactId: null, evidenceLevel: null }, w4: { artifactId: null, evidenceLevel: null }, w5: { artifactId: null, evidenceLevel: null }, w6: { artifactId: null, evidenceLevel: null }, w7: { artifactId: null, evidenceLevel: null } },
    weightedTotal: 0,
  },
  {
    alternativeId: 'alt-002', alternativeName: '同軸直連 + 漸變壁厚方案',
    scores: { w1: 6, w2: 9, w3: 8, w4: 6, w5: 8, w6: 5, w7: 6 },
    evidence: { w1: { artifactId: null, evidenceLevel: null }, w2: { artifactId: 'EVD-003', evidenceLevel: 'E2' }, w3: { artifactId: null, evidenceLevel: null }, w4: { artifactId: null, evidenceLevel: null }, w5: { artifactId: null, evidenceLevel: null }, w6: { artifactId: null, evidenceLevel: null }, w7: { artifactId: null, evidenceLevel: null } },
    weightedTotal: 0,
  },
];

export const mockKtDecision: KtDecision = {
  selectedAlternativeId: '',
  selectedAlternativeName: '',
  rationale: '',
  riskAcceptance: '',
  actionItems: [],
  decisionDate: new Date().toISOString().split('T')[0],
  status: 'draft',
};

export const mockAdverseConsequences: AdverseConsequence[] = [
  { id: 'ac-001', alternativeId: 'alt-001', description: '磁力耦合在高溫環境下扭矩傳遞效率下降', probability: 'medium', severity: 'high', level: 'H', mitigation: '增加散熱通道設計，設定溫度保護閾值', riskArtifactId: 'RSK-001' },
  { id: 'ac-002', alternativeId: 'alt-001', description: '雙繞組馬達成本超出預算', probability: 'low', severity: 'medium', level: 'L', mitigation: '與供應商協商量產價格，備選單繞組降規方案', riskArtifactId: null },
  { id: 'ac-003', alternativeId: 'alt-002', description: '漸變壁厚在振動環境下應力集中開裂', probability: 'medium', severity: 'high', level: 'H', mitigation: '增加圓角過渡設計，進行有限元素分析驗證', riskArtifactId: 'RSK-002' },
];

export const mockSignatures: Signature[] = [];
