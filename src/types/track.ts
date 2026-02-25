// Track page types

export type VerificationStatus = 'unverified' | 'verifying' | 'verified' | 'negated';
export type RiskLevel = 'L' | 'M' | 'H' | 'H*';
export type AssumptionSource = 'explore_tag' | 'manual' | 'ai_suggest' | 'unknown_convert';

export interface TrackAssumption {
  id: string;
  assumptionCode: string; // auto-generated A-001
  description: string;
  riskLevel: RiskLevel | null;
  verificationStatus: VerificationStatus;
  experimentCount: number;
  source: AssumptionSource;
  linkedContradictionId: string | null;
  aiChallenge: string | null; // AI challenge question
  createdAt: string;
  updatedAt: string;
}

export const VERIFICATION_STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string }> = {
  unverified: { label: '未驗證', color: '#6c757d' },
  verifying: { label: '驗證中', color: '#F59E0B' },
  verified: { label: '已驗證', color: '#28a745' },
  negated: { label: '已否定', color: '#dc3545' },
};

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  'L': { label: 'Low', color: '#10B981' },
  'M': { label: 'Medium', color: '#F59E0B' },
  'H': { label: 'High', color: '#dc3545' },
  'H*': { label: 'H*', color: '#7f1d1d' },
};

export const KANBAN_COLUMNS: VerificationStatus[] = ['unverified', 'verifying', 'verified', 'negated'];

// Unknown factors
export type UnknownStatus = 'open' | 'converted' | 'dismissed';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface UnknownFactor {
  id: string;
  unknownCode: string; // auto U-01
  description: string;
  impact: ImpactLevel;
  status: UnknownStatus;
  note: string | null;
  linkedAssumptionId: string | null;
  createdAt: string;
}

export const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string }> = {
  high: { label: '高', color: '#dc3545' },
  medium: { label: '中', color: '#fd7e14' },
  low: { label: '低', color: '#28a745' },
};

export const UNKNOWN_STATUS_CONFIG: Record<UnknownStatus, { label: string; color: string }> = {
  open: { label: '開放', color: '#6c757d' },
  converted: { label: '已轉假設', color: '#28a745' },
  dismissed: { label: '已排除', color: '#dc3545' },
};

// Gate check
export interface TrackGateItem {
  label: string;
  current: number;
  target: number;
  passed: boolean;
}
