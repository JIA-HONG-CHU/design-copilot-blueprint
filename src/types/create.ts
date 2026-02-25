// Create page types

export type AccordionStepStatus = 'complete' | 'in_progress' | 'not_started';

export interface CreateStepProgress {
  antiAnchor: AccordionStepStatus;
  triz: AccordionStepStatus;
  subsystem: AccordionStepStatus;
  scamper: AccordionStepStatus;
  alternatives: AccordionStepStatus;
  must: AccordionStepStatus;
  preCad: AccordionStepStatus;
}

// Anti-Anchor
export interface AntiAnchorRoute {
  id: string;
  name: string;
  description: string;
}

// TRIZ solutions
export type TrizPath = 'TC' | 'PC' | 'SF';
export type TrizActionStatus = 'adopted' | 'edited' | 'skipped' | 'pending';

export interface TrizSolution {
  id: string;
  contradictionId: string;
  path: TrizPath;
  principleNumber: number | null;
  principleName: string;
  suggestion: string;
  status: TrizActionStatus;
}

// Subsystem
export interface Subsystem {
  id: string;
  name: string;
  reason: string;
  relatedContradictions: string[];
  confirmed: boolean;
}

// SCAMPER
export type ScamperAction = 'S' | 'C' | 'A' | 'M' | 'P' | 'E' | 'R';
export const SCAMPER_LABELS: Record<ScamperAction, { en: string; zh: string }> = {
  S: { en: 'Substitute', zh: '替代' },
  C: { en: 'Combine', zh: '結合' },
  A: { en: 'Adapt', zh: '適應' },
  M: { en: 'Modify', zh: '修改' },
  P: { en: 'Put to other use', zh: '其他用途' },
  E: { en: 'Eliminate', zh: '消除' },
  R: { en: 'Rearrange', zh: '重排' },
};

export interface ScamperVariant {
  id: string;
  subsystemId: string;
  action: ScamperAction;
  description: string;
  adopted: boolean;
}

// Alternative (concept route)
export type AlternativeSource = 'triz_tc' | 'triz_pc' | 'triz_sf' | 'scamper' | 'manual' | 'ai_integrated';

export interface Alternative {
  id: string;
  name: string;
  mechanism: string;
  source: AlternativeSource;
  keyAssumptionIds: string[];
  mustScores: Record<string, 'pass' | 'fail' | 'marginal' | null>; // M1-M5
  preCadScores: {
    space: number | null;
    cost: number | null;
    safety: number | null;
    decoupling: number | null;
    supply: number | null;
  };
  overallPass: boolean | null;
}

export const MUST_CRITERIA = [
  { id: 'M1', label: 'M1 空間' },
  { id: 'M2', label: 'M2 成本' },
  { id: 'M3', label: 'M3 安全餘裕' },
  { id: 'M4', label: 'M4 解耦' },
  { id: 'M5', label: 'M5 供應' },
];

export const PRECAD_DIMENSIONS = [
  { key: 'space', label: '空間可行性', labels: ['不可行', '', '可行需調整', '', '完全可行'] },
  { key: 'cost', label: '成本合理性', labels: ['嚴重超標', '', '可接受', '', '有餘裕'] },
  { key: 'safety', label: '安全餘裕', labels: ['不達標', '', '達標', '', '大幅超標'] },
  { key: 'decoupling', label: '解耦程度', labels: ['高耦合', '', '適度', '', '完全解耦'] },
  { key: 'supply', label: '供應鏈可行性', labels: ['無供應商', '', '有替代', '', '成熟供應鏈'] },
] as const;

// Gate
export interface CreateGateItem {
  label: string;
  current: number;
  target: number;
  passed: boolean;
}
