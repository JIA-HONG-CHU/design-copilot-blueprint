// Socratic Q&A types
export type QuestionCategory = 'clarification' | 'assumption' | 'consequence' | 'counter' | 'origin' | 'action' | 'reframing';

export interface SocraticQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  answer: string | null;
  taggedAsAssumption: boolean;
  taggedAsContradiction: boolean;
  aiSuggestedTag: 'assumption' | 'contradiction' | null; // AI auto-detected tag
  aiTagConfirmed: boolean; // user confirmed
  aiTagDismissed: boolean; // user dismissed the suggestion
  createdAt?: string;
}

export const CATEGORY_CONFIG: Record<QuestionCategory, { label: string; labelZh: string; color: string }> = {
  clarification: { label: 'Clarification', labelZh: '澄清', color: '#3B82F6' },
  assumption: { label: 'Assumption', labelZh: '假設', color: '#8B5CF6' },
  consequence: { label: 'Consequence', labelZh: '後果', color: '#EC4899' },
  counter: { label: 'Counter', labelZh: '對立', color: '#F59E0B' },
  origin: { label: 'Origin', labelZh: '本源', color: '#10B981' },
  action: { label: 'Action', labelZh: '行動', color: '#6366F1' },
  reframing: { label: 'Reframing', labelZh: '重構', color: '#EF4444' },
};

// Contradiction types (enhanced from existing)
export type ContradictionType = 'TC' | 'PC';
export type ContradictionStatus = 'draft' | 'confirmed' | 'rejected';

export interface ExploreContradiction {
  id: string;
  projectId: string;
  type: ContradictionType;
  improvingParam: number | null;
  worseningParam: number | null;
  pcAttributeA: string | null;
  pcAttributeNotA: string | null;
  description: string;
  engineeringStatement: string | null;
  status: ContradictionStatus;
  source: 'ai' | 'manual';
  createdAt: string;
  updatedAt: string;
}

// CLD types
export interface CausalNode {
  id: string;
  label: string;
  position: { x: number; y: number };
  isBreakpoint: boolean;
  breakpointReason: string | null;
  relatedContradictions: string[];
}

export interface CausalEdge {
  id: string;
  source: string;
  target: string;
  feedbackType: 'positive' | 'negative';
}

export interface CausalLoop {
  id: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

// Gate check types
export interface GateCheckItem {
  label: string;
  current: number;
  target: number;
  passed: boolean;
}

export interface GateCheckResult {
  gateId: string;
  passed: boolean;
  checklist: GateCheckItem[];
}
