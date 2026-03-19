/**
 * useContradictionScan — WBS 2.2.1
 * After each TRIZ solution adoption, scan CLD/Interface Contract
 * to classify secondary contradictions as Fatal/Major/Minor.
 */
import { useState, useCallback } from 'react';
import type { ContradictionSeverity } from '@/types/contradiction';
import { convergenceScan } from '@/lib/api';

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

interface ContradictionScanOptions {
  mission?: string;
  constraints?: string[];
  kpis?: string[];
  contradictions?: Record<string, unknown>[];
  alternatives?: Record<string, unknown>[];
}

export function useContradictionScan() {
  const [scanResult, setScanResult] = useState<ContradictionScanResult>({
    contradictions: [],
    nodeCount: 0,
    hasCircular: false,
    confidenceScore: 100,
  });
  const [isScanning, setIsScanning] = useState(false);

  const runScan = useCallback(async (solutionId: string, projectId?: string, options?: ContradictionScanOptions) => {
    setIsScanning(true);

    try {
      const result = await convergenceScan({
        project_id: projectId || '',
        alternatives: options?.alternatives || [{ id: solutionId }],
        contradictions: options?.contradictions || [],
        mission: options?.mission,
        constraints: options?.constraints,
        kpis: options?.kpis,
      });

      const scanned: SecondaryContradiction[] = result.new_contradictions.map((c, i) => ({
        id: `sc-${Date.now()}-${i}`,
        description: c.description,
        severity: c.severity as ContradictionSeverity,
        resolved: false,
        sourceSolutionId: solutionId,
      }));

      const fatal = scanned.filter((c) => c.severity === 'fatal');
      const major = scanned.filter((c) => c.severity === 'major');
      const totalFM = fatal.length + major.length;
      const resolvedFM = 0;
      const score = totalFM > 0 ? (resolvedFM / totalFM) * 100 : 100;

      setScanResult({
        contradictions: scanned,
        nodeCount: scanned.length + 1,
        hasCircular: false,
        confidenceScore: Math.round(score * 10) / 10,
      });

      setIsScanning(false);
      return scanned;
    } catch {
      // Fallback to mock data if backend unavailable
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
        nodeCount: mockContradictions.length + 1,
        hasCircular: false,
        confidenceScore: Math.round(score * 10) / 10,
      });

      setIsScanning(false);
      return mockContradictions;
    }
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
