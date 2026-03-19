// Shared types used across multiple page-specific type modules.
// Centralised here to avoid circular imports between e.g. track.ts and designReview.ts.

/** Canonical experiment status — matches DB enum ('Plan' | 'Running' | 'Done'). */
export type ExperimentStatus = 'Plan' | 'Running' | 'Done';

/** Risk level used in both Track and Design Review contexts. */
export type RiskLevel = 'L' | 'M' | 'H' | 'H*';
