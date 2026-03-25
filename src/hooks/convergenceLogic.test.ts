import { describe, it, expect } from 'vitest';
import { evaluateConvergence, recalcConfidenceOnAdd, resolveContradiction } from './convergenceLogic';
import type { ConvergenceInput, CountPair } from './convergenceLogic';

// ---------------------------------------------------------------------------
// Helper: build a default input and override specific fields
// ---------------------------------------------------------------------------
function makeInput(overrides: Partial<ConvergenceInput> = {}): ConvergenceInput {
  return {
    iteration: 1,
    confidence: 50,
    fatalCount: { resolved: 0, total: 0 },
    majorCount: { resolved: 0, total: 0 },
    scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    forcePause: false,
    architectureHealth: 'healthy',
    ...overrides,
  };
}

// =========================================================================
// BUG #1: Loop must NOT converge when unresolved fatal/major exist
// =========================================================================
describe('evaluateConvergence — unresolved contradictions block convergence', () => {
  it('should HALT when unresolved major exist and no new contradictions found (needs human decision)', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 2,
        confidence: 85,
        majorCount: { resolved: 0, total: 2 },
        scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
      }),
    );
    // AI exhausted options — halts so human can intervene (adopt TRIZ, override, etc.)
    expect(result.status).toBe('halted');
    expect(result.shouldContinue).toBe(false);
  });

  it('should HALT when unresolved fatal exist and no new contradictions found', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 3,
        confidence: 90,
        fatalCount: { resolved: 0, total: 1 },
        scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
      }),
    );
    expect(result.status).toBe('halted');
    expect(result.shouldContinue).toBe(false);
  });

  it('should converge when all fatal+major resolved AND confidence >= 80', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 3,
        confidence: 85,
        fatalCount: { resolved: 1, total: 1 },
        majorCount: { resolved: 2, total: 2 },
      }),
    );
    expect(result.status).toBe('converged');
    expect(result.shouldContinue).toBe(false);
  });

  it('should converge when all resolved and no new blocking, even if confidence < 80', () => {
    // New rule: allResolved && noNewBlocking → converged (confidence is secondary)
    const result = evaluateConvergence(
      makeInput({
        iteration: 2,
        confidence: 60,
        fatalCount: { resolved: 1, total: 1 },
        majorCount: { resolved: 1, total: 1 },
      }),
    );
    expect(result.status).toBe('converged');
    expect(result.shouldContinue).toBe(false);
  });
});

// =========================================================================
// BUG #1 cont: new fatal/major discovered → must keep exploring
// =========================================================================
describe('evaluateConvergence — new contradictions extend the loop', () => {
  it('should keep exploring when new major contradictions appear', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 2,
        confidence: 90,
        majorCount: { resolved: 1, total: 1 },
        scan: { newFatal: 0, newMajor: 2, newMinor: 0, noNewContradictions: false },
      }),
    );
    expect(result.status).toBe('exploring');
    expect(result.majorCount.total).toBe(3); // 1 existing + 2 new
  });

  it('should keep exploring when new fatal contradictions appear', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 1,
        confidence: 95,
        scan: { newFatal: 1, newMajor: 0, newMinor: 0, noNewContradictions: false },
      }),
    );
    expect(result.status).toBe('exploring');
    expect(result.fatalCount.total).toBe(1);
  });
});

// =========================================================================
// Halt conditions
// =========================================================================
describe('evaluateConvergence — halt conditions', () => {
  it('should halt when force_pause is true', () => {
    const result = evaluateConvergence(makeInput({ forcePause: true, confidence: 100 }));
    expect(result.status).toBe('halted');
  });

  it('should halt when architecture_health is critical', () => {
    const result = evaluateConvergence(makeInput({ architectureHealth: 'critical' }));
    expect(result.status).toBe('halted');
  });

  it('should halt when architecture_health is circular', () => {
    const result = evaluateConvergence(makeInput({ architectureHealth: 'circular' }));
    expect(result.status).toBe('halted');
  });
});

// =========================================================================
// Iteration 0 should never converge
// =========================================================================
describe('evaluateConvergence — iteration 0', () => {
  it('should NOT converge on iteration 0 even if all conditions met', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 0,
        confidence: 100,
        fatalCount: { resolved: 0, total: 0 },
        majorCount: { resolved: 0, total: 0 },
      }),
    );
    expect(result.status).toBe('exploring');
  });
});

// =========================================================================
// Count updates
// =========================================================================
describe('evaluateConvergence — count updates', () => {
  it('should increment fatal total when new fatal found', () => {
    const result = evaluateConvergence(
      makeInput({
        fatalCount: { resolved: 0, total: 1 },
        scan: { newFatal: 2, newMajor: 0, newMinor: 0, noNewContradictions: false },
      }),
    );
    expect(result.fatalCount.total).toBe(3);
    expect(result.fatalCount.resolved).toBe(0);
  });

  it('should NOT auto-resolve when no new contradictions found — resolution requires explicit action', () => {
    const result = evaluateConvergence(
      makeInput({
        fatalCount: { resolved: 0, total: 2 },
        majorCount: { resolved: 1, total: 3 },
        scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
      }),
    );
    // Resolved counts stay unchanged — only explicit resolution can increment them
    expect(result.fatalCount.resolved).toBe(0);
    expect(result.majorCount.resolved).toBe(1);
  });
});

// =========================================================================
// BUG #2: recalcConfidenceOnAdd must use UPDATED totals
// =========================================================================
describe('recalcConfidenceOnAdd', () => {
  it('should correctly calculate confidence when adding a major with 0 resolved', () => {
    // Before: 0 fatal, 0 major → adding 1 major → 0/1 = 0%
    const result = recalcConfidenceOnAdd(
      { resolved: 0, total: 0 },
      { resolved: 0, total: 0 },
      'major',
    );
    expect(result).toBe(0);
  });

  it('should correctly calculate confidence with existing resolved counts', () => {
    // Before: fatal 1/1, major 1/2 → adding 1 major → (1+1)/(1+3) = 50%
    const result = recalcConfidenceOnAdd(
      { resolved: 1, total: 1 },
      { resolved: 1, total: 2 },
      'major',
    );
    expect(result).toBe(50);
  });

  it('should return 100% when no fatal or major exist and adding minor', () => {
    const result = recalcConfidenceOnAdd(
      { resolved: 0, total: 0 },
      { resolved: 0, total: 0 },
      'minor',
    );
    expect(result).toBe(100);
  });

  it('should not change denominator when adding fatal to existing majors', () => {
    // Before: fatal 0/0, major 2/3 → adding 1 fatal → (0+2)/(1+3) = 50%
    const result = recalcConfidenceOnAdd(
      { resolved: 0, total: 0 },
      { resolved: 2, total: 3 },
      'fatal',
    );
    expect(result).toBe(50);
  });
});

// =========================================================================
// Edge: zero-division safety
// =========================================================================
describe('edge cases', () => {
  it('should handle zero fatal+major gracefully (no division by zero)', () => {
    const result = evaluateConvergence(
      makeInput({
        iteration: 1,
        confidence: 85,
        fatalCount: { resolved: 0, total: 0 },
        majorCount: { resolved: 0, total: 0 },
      }),
    );
    // No fatal/major → all resolved trivially → converged if confidence >= 80
    expect(result.status).toBe('converged');
  });

  it('recalcConfidenceOnAdd handles zero denominator', () => {
    const result = recalcConfidenceOnAdd(
      { resolved: 0, total: 0 },
      { resolved: 0, total: 0 },
      'minor',
    );
    expect(result).toBe(100); // no fatal/major → 100%
  });
});

// =========================================================================
// resolveContradiction — explicit resolution via TRIZ adoption
// =========================================================================
describe('resolveContradiction', () => {
  it('should increment major.resolved and recalculate confidence', () => {
    const result = resolveContradiction(
      { resolved: 0, total: 1 },  // fatal
      { resolved: 0, total: 2 },  // major
      'major',
    );
    expect(result.majorCount.resolved).toBe(1);
    expect(result.fatalCount.resolved).toBe(0);
    // confidence = (0 + 1) / (1 + 2) = 33%
    expect(result.confidence).toBe(33);
  });

  it('should increment fatal.resolved and recalculate confidence', () => {
    const result = resolveContradiction(
      { resolved: 0, total: 1 },
      { resolved: 1, total: 1 },
      'fatal',
    );
    expect(result.fatalCount.resolved).toBe(1);
    // confidence = (1 + 1) / (1 + 1) = 100%
    expect(result.confidence).toBe(100);
  });

  it('should not exceed total when resolving', () => {
    const result = resolveContradiction(
      { resolved: 2, total: 2 },
      { resolved: 0, total: 0 },
      'fatal',
    );
    // Already at max → clamped
    expect(result.fatalCount.resolved).toBe(2);
  });

  it('should not affect counts for minor severity', () => {
    const result = resolveContradiction(
      { resolved: 0, total: 1 },
      { resolved: 0, total: 1 },
      'minor',
    );
    expect(result.fatalCount.resolved).toBe(0);
    expect(result.majorCount.resolved).toBe(0);
    // confidence = (0 + 0) / (1 + 1) = 0%
    expect(result.confidence).toBe(0);
  });
});

// =========================================================================
// FULL RECURSIVE SCENARIO: simulate multi-round convergence loop
// =========================================================================
describe('full recursive convergence scenario', () => {
  /**
   * Simulates the real loop:
   *   Round 1 → 2 major found → keep exploring
   *   User adopts TRIZ → 1 major resolved
   *   Round 2 → 1 new minor, no new fatal/major → still exploring (1 unresolved major)
   *   User adopts TRIZ → last major resolved
   *   Round 3 → no new contradictions, confidence 85 → CONVERGED
   */
  it('should require explicit resolution of ALL major contradictions before converging', () => {
    let fatal: CountPair = { resolved: 0, total: 0 };
    let major: CountPair = { resolved: 0, total: 0 };

    // ── Round 1: AI discovers 2 major contradictions ──
    const round1 = evaluateConvergence(makeInput({
      iteration: 1,
      confidence: 40,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 2, newMinor: 0, noNewContradictions: false },
    }));
    expect(round1.status).toBe('exploring');
    expect(round1.majorCount).toEqual({ resolved: 0, total: 2 });
    fatal = round1.fatalCount;
    major = round1.majorCount;

    // ── User adopts TRIZ for 1st major → resolve 1 ──
    const resolve1 = resolveContradiction(fatal, major, 'major');
    expect(resolve1.majorCount.resolved).toBe(1);
    expect(resolve1.confidence).toBe(50); // 1/2
    fatal = resolve1.fatalCount;
    major = resolve1.majorCount;

    // ── Round 2: AI finds 1 minor, no new fatal/major ──
    const round2 = evaluateConvergence(makeInput({
      iteration: 2,
      confidence: 60,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 1, noNewContradictions: false },
    }));
    // 1 major still unresolved → MUST keep exploring
    expect(round2.status).toBe('exploring');
    expect(round2.majorCount).toEqual({ resolved: 1, total: 2 });
    fatal = round2.fatalCount;
    major = round2.majorCount;

    // ── User adopts TRIZ for 2nd major → resolve all ──
    const resolve2 = resolveContradiction(fatal, major, 'major');
    expect(resolve2.majorCount.resolved).toBe(2);
    expect(resolve2.confidence).toBe(100); // 2/2
    fatal = resolve2.fatalCount;
    major = resolve2.majorCount;

    // ── Round 3: no new contradictions, confidence 85 from backend ──
    const round3 = evaluateConvergence(makeInput({
      iteration: 3,
      confidence: 85,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    // All resolved + confidence >= 80 → CONVERGED
    expect(round3.status).toBe('converged');
    expect(round3.shouldContinue).toBe(false);
  });

  /**
   * Scenario: cascading contradictions
   *   Round 1 → 1 fatal found
   *   Round 2 → resolving the fatal spawns 1 new major (secondary contradiction)
   *   Round 3 → resolve the major, no new ones → converged
   */
  it('should handle cascading contradictions (resolving one spawns another)', () => {
    let fatal: CountPair = { resolved: 0, total: 0 };
    let major: CountPair = { resolved: 0, total: 0 };

    // ── Round 1: 1 fatal discovered ──
    const round1 = evaluateConvergence(makeInput({
      iteration: 1,
      confidence: 30,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 1, newMajor: 0, newMinor: 0, noNewContradictions: false },
    }));
    expect(round1.status).toBe('exploring');
    expect(round1.fatalCount.total).toBe(1);
    fatal = round1.fatalCount;
    major = round1.majorCount;

    // ── User resolves the fatal via TRIZ ──
    const resolve1 = resolveContradiction(fatal, major, 'fatal');
    expect(resolve1.fatalCount.resolved).toBe(1);
    fatal = resolve1.fatalCount;
    major = resolve1.majorCount;

    // ── Round 2: resolving fatal spawned a new major (secondary contradiction) ──
    const round2 = evaluateConvergence(makeInput({
      iteration: 2,
      confidence: 70,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 1, newMinor: 0, noNewContradictions: false },
    }));
    expect(round2.status).toBe('exploring');
    expect(round2.majorCount.total).toBe(1);
    expect(round2.majorCount.resolved).toBe(0);
    fatal = round2.fatalCount;
    major = round2.majorCount;

    // ── User resolves the secondary major ──
    const resolve2 = resolveContradiction(fatal, major, 'major');
    expect(resolve2.majorCount.resolved).toBe(1);
    fatal = resolve2.fatalCount;
    major = resolve2.majorCount;

    // ── Round 3: nothing new, confidence 85 → converged ──
    const round3 = evaluateConvergence(makeInput({
      iteration: 3,
      confidence: 85,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round3.status).toBe('converged');
  });

  /**
   * Scenario: user adds contradiction via SCAMPER feedback mid-loop
   */
  it('should re-open exploration when SCAMPER injects a major mid-loop', () => {
    let fatal: CountPair = { resolved: 0, total: 0 };
    let major: CountPair = { resolved: 1, total: 1 };

    // ── Round 2: was about to converge ──
    const round2 = evaluateConvergence(makeInput({
      iteration: 2,
      confidence: 85,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round2.status).toBe('converged');

    // ── SCAMPER feedback: inject 1 new major ──
    const afterAdd = recalcConfidenceOnAdd(fatal, major, 'major');
    expect(afterAdd).toBe(50); // 1/(1+1) resolved

    // Update counts as addContradiction would
    major = { resolved: major.resolved, total: major.total + 1 };

    // ── Round 3: loop resumes, 1 unresolved major, no new info → halts for human ──
    const round3 = evaluateConvergence(makeInput({
      iteration: 3,
      confidence: 60,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round3.status).toBe('halted'); // AI exhausted, human must resolve

    // ── Resolve the injected major ──
    const resolve = resolveContradiction(fatal, major, 'major');
    major = resolve.majorCount;

    // ── Round 4: all resolved, confidence 85 ──
    const round4 = evaluateConvergence(makeInput({
      iteration: 4,
      confidence: 85,
      fatalCount: fatal,
      majorCount: major,
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round4.status).toBe('converged');
  });

  /**
   * Scenario: architecture halt interrupts then resumes
   */
  it('should halt on critical health and resume after forceContinue', () => {
    const fatal: CountPair = { resolved: 0, total: 1 };
    const major: CountPair = { resolved: 0, total: 0 };

    // ── Round 1: critical architecture health → halt ──
    const round1 = evaluateConvergence(makeInput({
      iteration: 1,
      confidence: 30,
      fatalCount: fatal,
      majorCount: major,
      architectureHealth: 'critical',
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round1.status).toBe('halted');

    // ── After forceContinue (health downgraded to warning), resolve fatal ──
    const resolve = resolveContradiction(fatal, major, 'fatal');

    // ── Round 2: health now warning, all resolved ──
    const round2 = evaluateConvergence(makeInput({
      iteration: 2,
      confidence: 90,
      fatalCount: resolve.fatalCount,
      majorCount: resolve.majorCount,
      architectureHealth: 'warning',
      scan: { newFatal: 0, newMajor: 0, newMinor: 0, noNewContradictions: true },
    }));
    expect(round2.status).toBe('converged');
  });
});
