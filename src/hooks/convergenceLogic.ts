/**
 * Pure convergence logic — extracted from useConvergenceLoop for testability.
 *
 * All functions are stateless / side-effect-free so they can be unit-tested
 * without React or API mocks.
 */

import type { ContradictionSeverity } from '@/types/contradiction';

// ---------------------------------------------------------------------------
// Types (minimal, matching the hook's internal structures)
// ---------------------------------------------------------------------------

export interface CountPair {
  resolved: number;
  total: number;
}

export interface ScanCounts {
  newFatal: number;
  newMajor: number;
  newMinor: number;
  noNewContradictions: boolean;
}

export interface ConvergenceInput {
  iteration: number;
  confidence: number;
  fatalCount: CountPair;
  majorCount: CountPair;
  scan: ScanCounts;
  forcePause: boolean;
  architectureHealth: string;
}

export type LoopStatus = 'exploring' | 'converged' | 'halted';

export interface ConvergenceResult {
  status: LoopStatus;
  fatalCount: CountPair;
  majorCount: CountPair;
  minorDelta: number;
  confidence: number;
  shouldContinue: boolean;
}

// ---------------------------------------------------------------------------
// Core: decide whether the loop should continue
// ---------------------------------------------------------------------------

/**
 * Determines whether the convergence loop should continue, converge, or halt.
 *
 * Rules:
 * 1. Halt if force_pause OR health is critical/circular.
 * 2. Converged ONLY when confidence >= 80 AND all fatal+major resolved.
 * 3. Otherwise keep exploring.
 */
export function evaluateConvergence(input: ConvergenceInput): ConvergenceResult {
  const { iteration, scan, fatalCount, majorCount, forcePause, architectureHealth, confidence } = input;

  // --- Update counts ---
  // Only increment totals; resolved counts come from explicit resolution
  // (e.g., TRIZ solution adopted), NOT from "no new contradictions found"
  const updatedFatal: CountPair = {
    total: fatalCount.total + scan.newFatal,
    resolved: fatalCount.resolved,
  };
  const updatedMajor: CountPair = {
    total: majorCount.total + scan.newMajor,
    resolved: majorCount.resolved,
  };
  const minorDelta = scan.newMinor;

  // --- Halt check ---
  // Halt when: force_pause, critical/circular health,
  // OR no new info but unresolved fatal/major exist (needs human decision)
  const hasUnresolvedBlocking =
    (updatedFatal.total > updatedFatal.resolved) ||
    (updatedMajor.total > updatedMajor.resolved);
  const noNewInfo = scan.noNewContradictions;
  const isHalted = forcePause
    || architectureHealth === 'critical'
    || architectureHealth === 'circular'
    || (iteration > 0 && noNewInfo && hasUnresolvedBlocking);

  // --- Convergence check ---
  // Hard rule: NEVER converge while unresolved fatal/major exist.
  // Converged only when:
  //   (a) all fatal+major resolved, AND
  //   (b) EITHER confidence >= 80 OR no new fatal/major this round
  const allFatalResolved = updatedFatal.total === 0 || updatedFatal.resolved >= updatedFatal.total;
  const allMajorResolved = updatedMajor.total === 0 || updatedMajor.resolved >= updatedMajor.total;
  const allResolved = allFatalResolved && allMajorResolved;
  const noNewBlocking = scan.newFatal === 0 && scan.newMajor === 0;
  const isConverged = iteration > 0
    && allResolved
    && (confidence >= 80 || noNewBlocking);

  const status: LoopStatus = isHalted ? 'halted' : isConverged ? 'converged' : 'exploring';

  return {
    status,
    fatalCount: updatedFatal,
    majorCount: updatedMajor,
    minorDelta,
    confidence,
    shouldContinue: status === 'exploring',
  };
}

// ---------------------------------------------------------------------------
// Confidence recalculation for addContradiction
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resolve a contradiction (TRIZ adopted → increment resolved count)
// ---------------------------------------------------------------------------

export interface ResolveResult {
  fatalCount: CountPair;
  majorCount: CountPair;
  confidence: number;
}

/**
 * When a TRIZ solution is adopted for a contradiction, increment resolved
 * count for the matching severity and recalculate confidence.
 */
export function resolveContradiction(
  fatalCount: CountPair,
  majorCount: CountPair,
  severity: ContradictionSeverity,
): ResolveResult {
  const updatedFatal = severity === 'fatal'
    ? { ...fatalCount, resolved: Math.min(fatalCount.resolved + 1, fatalCount.total) }
    : fatalCount;
  const updatedMajor = severity === 'major'
    ? { ...majorCount, resolved: Math.min(majorCount.resolved + 1, majorCount.total) }
    : majorCount;

  const denominator = updatedFatal.total + updatedMajor.total;
  const confidence = denominator === 0
    ? 100
    : Math.round(((updatedFatal.resolved + updatedMajor.resolved) / denominator) * 100);

  return { fatalCount: updatedFatal, majorCount: updatedMajor, confidence };
}

// ---------------------------------------------------------------------------
// Confidence recalculation for addContradiction
// ---------------------------------------------------------------------------

/**
 * Recalculate confidence when a new contradiction is manually injected.
 * Uses the UPDATED totals, not the old ones.
 */
export function recalcConfidenceOnAdd(
  fatalCount: CountPair,
  majorCount: CountPair,
  addedSeverity: ContradictionSeverity,
): number {
  const updatedFatal = addedSeverity === 'fatal'
    ? { ...fatalCount, total: fatalCount.total + 1 }
    : fatalCount;
  const updatedMajor = addedSeverity === 'major'
    ? { ...majorCount, total: majorCount.total + 1 }
    : majorCount;

  const denominator = updatedFatal.total + updatedMajor.total;
  if (denominator === 0) return 100;

  const numerator = updatedFatal.resolved + updatedMajor.resolved;
  return Math.round((numerator / denominator) * 100);
}
