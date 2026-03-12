/**
 * useConvergenceLoop — AI autonomous contradiction convergence loop
 *
 * Replaces the old useContradictionScan hook.
 * Simulates the E2E spec's Fully Auto TRIZ convergence:
 *   - AI explores each contradiction branch in parallel (TC/PC/SF)
 *   - Each round: pick best solution → scan for secondary contradictions
 *   - Fatal/Major → auto-trigger next round (no iteration limit)
 *   - Minor → risk register (non-blocking)
 *   - Converged when all Fatal+Major resolved (Confidence = 100%)
 *   - Halted when nodes > 5 or circular dependency detected
 */
import { useState, useCallback, useRef } from 'react';
import type { ContradictionSeverity } from '@/types/contradiction';
import type { HealthStatus } from '@/types/solution';
import type {
  ConvergenceState,
  ConvergenceLoopActions,
  BranchExploration,
  MinorContradiction,
} from '@/types/convergence';
import {
  mockBranches,
  mockRiskRegister,
  simulationSteps,
  buildGraphAtIteration,
} from '@/data/mockConvergence';

const STEP_DELAY_MS = 1500;

function getHealth(nodeCount: number, hasCircular: boolean): HealthStatus {
  if (hasCircular) return 'circular';
  if (nodeCount > 5) return 'critical';
  if (nodeCount >= 4) return 'warning';
  return 'healthy';
}

const initialState: ConvergenceState = {
  iteration: 0,
  status: 'idle',
  branches: [],
  graph: { nodes: [], edges: [] },
  health: 'healthy',
  confidence: 0,
  fatalCount: { resolved: 0, total: 0 },
  majorCount: { resolved: 0, total: 0 },
  minorCount: 0,
  riskRegister: [],
};

export function useConvergenceLoop(): ConvergenceLoopActions {
  const [state, setState] = useState<ConvergenceState>(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef = useRef(0);

  const runNextStep = useCallback(() => {
    const idx = stepIndexRef.current;
    if (idx >= simulationSteps.length) {
      // All steps done → converged
      setState((prev) => ({
        ...prev,
        status: 'converged',
        branches: mockBranches,
        riskRegister: mockRiskRegister,
      }));
      return;
    }

    const step = simulationSteps[idx];
    const graph = buildGraphAtIteration(step.iteration);
    const nodeCount = graph.nodes.filter((n) => n.type === 'contradiction').length;
    const health = getHealth(nodeCount, false);

    // Build progressive branches state
    const branchMap = new Map<string, BranchExploration>();
    for (let i = 0; i <= idx; i++) {
      const s = simulationSteps[i];
      const existing = branchMap.get(s.activeBranch);
      if (existing) {
        if (!existing.rounds.find((r) => r.roundNumber === s.round.roundNumber)) {
          existing.rounds.push(s.round);
          existing.depth = s.round.roundNumber;
        }
      } else {
        const fullBranch = mockBranches.find((b) => b.contradictionId === s.activeBranch);
        branchMap.set(s.activeBranch, {
          contradictionId: s.activeBranch,
          contradictionLabel: fullBranch?.contradictionLabel ?? s.activeBranch,
          rounds: [s.round],
          status: 'exploring',
          depth: s.round.roundNumber,
        });
      }
    }

    // Mark converged branches
    const branches = Array.from(branchMap.values()).map((b) => {
      const lastRound = b.rounds[b.rounds.length - 1];
      const isConverged = lastRound && !lastRound.scanResult.hasNewFatalMajor;
      return { ...b, status: (isConverged ? 'converged' : 'exploring') as BranchExploration['status'] };
    });

    const isScanning = idx < simulationSteps.length - 1;

    setState({
      iteration: step.iteration,
      status: health === 'critical' || health === 'circular' ? 'halted' : (isScanning ? 'exploring' : 'exploring'),
      branches,
      graph,
      health,
      confidence: step.confidence,
      fatalCount: step.cumulativeFatal,
      majorCount: step.cumulativeMajor,
      minorCount: step.minorCount,
      riskRegister: step.minorCount > 0 ? mockRiskRegister : [],
    });

    stepIndexRef.current = idx + 1;

    if (health === 'critical' || health === 'circular') {
      // Halted — don't auto-advance
      return;
    }

    timerRef.current = setTimeout(runNextStep, STEP_DELAY_MS);
  }, []);

  const startExploration = useCallback(() => {
    stepIndexRef.current = 0;
    setState({ ...initialState, status: 'exploring' });
    timerRef.current = setTimeout(runNextStep, STEP_DELAY_MS);
  }, [runNextStep]);

  const confirmSeverity = useCallback((contradictionId: string, severity: ContradictionSeverity) => {
    setState((prev) => {
      const updatedNodes = prev.graph.nodes.map((n) =>
        n.id === contradictionId && n.type === 'contradiction' ? { ...n, severity } : n
      );
      return { ...prev, graph: { ...prev.graph, nodes: updatedNodes } };
    });
  }, []);

  const forceHalt = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((prev) => ({ ...prev, status: 'halted' }));
  }, []);

  const forceContinue = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'exploring', health: 'warning' as HealthStatus }));
    timerRef.current = setTimeout(runNextStep, STEP_DELAY_MS);
  }, [runNextStep]);

  const retryBranch = useCallback((contradictionId: string) => {
    setState((prev) => ({
      ...prev,
      status: 'exploring',
      branches: prev.branches.map((b) =>
        b.contradictionId === contradictionId ? { ...b, status: 'exploring' as const } : b
      ),
    }));
    // In real impl, would re-run AI exploration for this branch
    // For mock, just re-trigger the last few steps
    timerRef.current = setTimeout(runNextStep, STEP_DELAY_MS);
  }, [runNextStep]);

  const addContradiction = useCallback((description: string, severity: ContradictionSeverity, sourceBranchId: string) => {
    const newId = `sc-ext-${Date.now()}`;
    setState((prev) => {
      const newNode = {
        id: newId,
        label: description.length > 12 ? description.slice(0, 12) + '…' : description,
        type: 'contradiction' as const,
        severity,
        resolved: false,
        x: Math.max(...prev.graph.nodes.map((n) => n.x), 0) + 160,
        y: 180,
      };
      const isFatalMajor = severity === 'fatal' || severity === 'major';
      return {
        ...prev,
        status: isFatalMajor ? 'exploring' : prev.status,
        graph: {
          nodes: [...prev.graph.nodes, newNode],
          edges: prev.graph.edges,
        },
        fatalCount: severity === 'fatal'
          ? { ...prev.fatalCount, total: prev.fatalCount.total + 1 }
          : prev.fatalCount,
        majorCount: severity === 'major'
          ? { ...prev.majorCount, total: prev.majorCount.total + 1 }
          : prev.majorCount,
        minorCount: severity === 'minor' ? prev.minorCount + 1 : prev.minorCount,
        confidence: isFatalMajor
          ? Math.round(
              ((prev.fatalCount.resolved + prev.majorCount.resolved) /
                (prev.fatalCount.total + prev.majorCount.total + 1)) *
                100
            )
          : prev.confidence,
      };
    });
  }, []);

  return {
    state,
    startExploration,
    confirmSeverity,
    forceHalt,
    forceContinue,
    retryBranch,
    addContradiction,
  };
}
