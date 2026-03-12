/**
 * useContradictionScan — WBS 2.2.1
 * After each TRIZ solution adoption, scan CLD/Interface Contract
 * to classify secondary contradictions as Fatal/Major/Minor.
 */
import { useState, useCallback } from 'react';
import type { ContradictionSeverity } from '@/types/contradiction';

export interface SecondaryContradiction {
  id: string;
  description: string;
  severity: ContradictionSeverity;
  resolved: boolean;
  sourceSolutionId: string;
}

export interface ContradictionScanResult {
  contradictions: SecondaryContradiction[];
  nodeCount: number;
  hasCircular: boolean;
  confidenceScore: number; // converged(Fatal+Major) / total(Fatal+Major) * 100
}

export function useContradictionScan() {
  const [scanResult, setScanResult] = useState<ContradictionScanResult>({
    contradictions: [],
    nodeCount: 0,
    hasCircular: false,
    confidenceScore: 100,
  });
  const [isScanning, setIsScanning] = useState(false);

  const runScan = useCallback(async (solutionId: string) => {
    setIsScanning(true);

    // Simulate AI contradiction scan with delay
    await new Promise((r) => setTimeout(r, 1200));

    // Mock: generate secondary contradictions based on the solution
    const mockContradictions: SecondaryContradiction[] = [
      {
        id: `sc-${Date.now()}-1`,
        description: '磁力耦合方案引入新的散熱需求 → 與輕量化目標矛盾',
        severity: 'major',
        resolved: false,
        sourceSolutionId: solutionId,
      },
      {
        id: `sc-${Date.now()}-2`,
        description: '非接觸傳動降低效率 → 與續航需求矛盾',
        severity: 'minor',
        resolved: true,
        sourceSolutionId: solutionId,
      },
    ];

    const fatal = mockContradictions.filter((c) => c.severity === 'fatal');
    const major = mockContradictions.filter((c) => c.severity === 'major');
    const totalFM = fatal.length + major.length;
    const resolvedFM =
      fatal.filter((c) => c.resolved).length + major.filter((c) => c.resolved).length;
    const score = totalFM > 0 ? (resolvedFM / totalFM) * 100 : 100;

    setScanResult({
      contradictions: mockContradictions,
      nodeCount: mockContradictions.length + 1, // +1 for the solution node
      hasCircular: false,
      confidenceScore: Math.round(score * 10) / 10,
    });

    setIsScanning(false);
    return mockContradictions;
  }, []);

  const resolveContradiction = useCallback((id: string) => {
    setScanResult((prev) => {
      const updated = prev.contradictions.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      );
      const fatal = updated.filter((c) => c.severity === 'fatal');
      const major = updated.filter((c) => c.severity === 'major');
      const totalFM = fatal.length + major.length;
      const resolvedFM =
        fatal.filter((c) => c.resolved).length + major.filter((c) => c.resolved).length;
      const score = totalFM > 0 ? (resolvedFM / totalFM) * 100 : 100;
      return { ...prev, contradictions: updated, confidenceScore: Math.round(score * 10) / 10 };
    });
  }, []);

  return { scanResult, isScanning, runScan, resolveContradiction };
}
