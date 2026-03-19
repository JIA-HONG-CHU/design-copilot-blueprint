/**
 * Track page API hooks
 *
 * Provides hooks for the Track Kanban board (assumptions in Kanban view)
 * and Unknown Factors management.
 *
 * The Track page reads from the same `assumptions` table as the Assumption Ledger,
 * but maps to a different frontend type (TrackAssumption) with Kanban-specific fields.
 *
 * Unknown Factors: No dedicated DB table exists yet. Uses localStorage as interim
 * storage with TODO markers for future migration.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { queryKeys } from './useQueryConfig';
import type {
  TrackAssumption,
  VerificationStatus,
  RiskLevel,
  AssumptionSource,
  UnknownFactor,
  Experiment,
  ExperimentStatus,
} from '@/types/track';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// DB Row types
// ---------------------------------------------------------------------------

type AssumptionRow = Database['public']['Tables']['assumptions']['Row'];
type AssumptionInsert = Database['public']['Tables']['assumptions']['Insert'];
type AssumptionUpdate = Database['public']['Tables']['assumptions']['Update'];
type ExperimentRow = Database['public']['Tables']['experiments']['Row'];

// ---------------------------------------------------------------------------
// Mappers: DB Row -> Track Frontend Types
// ---------------------------------------------------------------------------

/**
 * Map an assumptions DB row to the Track-specific TrackAssumption type.
 *
 * Key differences from AssumptionLedger's Assumption type:
 * - `verificationStatus` maps from `verification_stage` (Track uses it as Kanban column)
 * - `riskLevel` derived from `worst_severity`
 * - `experimentCount` is 0 by default (enriched separately)
 * - `source` maps from `source_type`
 */
function mapRowToTrackAssumption(row: AssumptionRow, experimentCount: number = 0): TrackAssumption {
  // Map verification_stage to VerificationStatus
  const stageToStatus: Record<string, VerificationStatus> = {
    unplanned: 'unverified',
    planned: 'unverified',
    in_progress: 'verifying',
    completed: 'verified',
    negated: 'negated',
  };

  // Map worst_severity to RiskLevel
  const severityToRisk: Record<string, RiskLevel> = {
    low: 'L',
    medium: 'M',
    high: 'H',
    critical: 'H*',
  };

  // Also accept direct status values (for rows updated via Track)
  const directStatus: Record<string, VerificationStatus> = {
    unverified: 'unverified',
    verifying: 'verifying',
    verified: 'verified',
    negated: 'negated',
  };

  const verificationStatus: VerificationStatus =
    directStatus[row.status] ??
    stageToStatus[row.verification_stage] ??
    'unverified';

  return {
    id: row.id,
    assumptionCode: row.code,
    description: row.content,
    riskLevel: severityToRisk[row.worst_severity ?? ''] ?? null,
    verificationStatus,
    experimentCount,
    source: (row.source_type as AssumptionSource) ?? 'manual',
    linkedContradictionId: null, // TODO: join with contradictions if needed
    aiChallenge: null, // TODO: store in a dedicated column or separate table
    worstConsequence: row.worst_consequence ?? '',
    verificationCost: row.validation_cost ?? '',
    verificationDuration: row.estimated_days ? `${row.estimated_days} days` : '',
    sourceArtifactId: row.source ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExperimentRow(row: ExperimentRow): Experiment {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ExperimentStatus,
    result: row.result ?? null,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// useTrackAssumptions — SELECT assumptions by project_id (Track/Kanban view)
// ---------------------------------------------------------------------------

export function useTrackAssumptions(projectId: string | undefined) {
  const query = useSupabaseQuery<AssumptionRow[]>({
    table: 'assumptions',
    queryKey: queryKeys.track.assumptions(projectId),
    filters: projectId
      ? [{ column: 'project_id', operator: 'eq', value: projectId }]
      : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...query,
    data: query.data?.map((row) => mapRowToTrackAssumption(row)) ?? [],
  };
}

// ---------------------------------------------------------------------------
// useUpdateTrackAssumptionStatus — UPDATE verification status (Kanban drag)
// ---------------------------------------------------------------------------

export function useUpdateTrackAssumptionStatus(projectId: string | undefined) {
  const mutation = useSupabaseMutation<
    AssumptionRow,
    AssumptionUpdate & { id: string }
  >({
    table: 'assumptions',
    type: 'update',
    invalidateKeys: [
      queryKeys.track.assumptions(projectId),
      queryKeys.assumptions.byProject(projectId),
    ],
    successMessage: false,
  });

  return {
    ...mutation,
    /** Update verification status by assumption id */
    mutate: (id: string, newStatus: VerificationStatus) => {
      // Map Track VerificationStatus back to DB fields
      const statusToStage: Record<VerificationStatus, string> = {
        unverified: 'unplanned',
        verifying: 'in_progress',
        verified: 'completed',
        negated: 'negated',
      };
      mutation.mutate({
        id,
        status: newStatus,
        verification_stage: statusToStage[newStatus],
        updated_at: new Date().toISOString(),
      });
    },
    mutateAsync: async (id: string, newStatus: VerificationStatus) => {
      const statusToStage: Record<VerificationStatus, string> = {
        unverified: 'unplanned',
        verifying: 'in_progress',
        verified: 'completed',
        negated: 'negated',
      };
      return mutation.mutateAsync({
        id,
        status: newStatus,
        verification_stage: statusToStage[newStatus],
        updated_at: new Date().toISOString(),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Unknown Factors — localStorage-based (no DB table yet)
// ---------------------------------------------------------------------------

const UNKNOWN_FACTORS_STORAGE_KEY = 'track_unknown_factors';

function loadUnknownFactors(projectId: string): UnknownFactor[] {
  try {
    const raw = localStorage.getItem(`${UNKNOWN_FACTORS_STORAGE_KEY}_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnknownFactors(projectId: string, factors: UnknownFactor[]): void {
  localStorage.setItem(
    `${UNKNOWN_FACTORS_STORAGE_KEY}_${projectId}`,
    JSON.stringify(factors),
  );
}

/**
 * useUnknownFactors — Read unknown factors for a project.
 *
 * TODO: Migrate to Supabase when `unknown_factors` table is created.
 * Currently uses localStorage as interim storage.
 */
export function useUnknownFactors(projectId: string | undefined) {
  const [data, setData] = useState<UnknownFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setData([]);
      setIsLoading(false);
      return;
    }
    // Simulate async load from localStorage
    const factors = loadUnknownFactors(projectId);
    setData(factors);
    setIsLoading(false);
  }, [projectId]);

  const refetch = useCallback(() => {
    if (projectId) {
      setData(loadUnknownFactors(projectId));
    }
  }, [projectId]);

  return { data, isLoading, isError: false, refetch };
}

/**
 * useCreateUnknownFactor — Add a new unknown factor.
 *
 * TODO: Migrate to Supabase INSERT when `unknown_factors` table is created.
 */
export function useCreateUnknownFactor(projectId: string | undefined) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    (factor: Omit<UnknownFactor, 'id' | 'unknownCode' | 'createdAt'>) => {
      if (!projectId) return;
      setIsPending(true);

      const existing = loadUnknownFactors(projectId);
      const nextCode = `U-${String(existing.length + 1).padStart(2, '0')}`;
      const newFactor: UnknownFactor = {
        ...factor,
        id: `uf-${Date.now()}`,
        unknownCode: nextCode,
        createdAt: new Date().toISOString(),
      };
      const updated = [...existing, newFactor];
      saveUnknownFactors(projectId, updated);

      setIsPending(false);
      toast.success('未知因素已新增');
      return newFactor;
    },
    [projectId],
  );

  return { mutate, isPending };
}

/**
 * useUpdateUnknownFactor — Update an unknown factor (status, note, etc.).
 *
 * TODO: Migrate to Supabase UPDATE when `unknown_factors` table is created.
 */
export function useUpdateUnknownFactor(projectId: string | undefined) {
  const mutate = useCallback(
    (id: string, updates: Partial<UnknownFactor>) => {
      if (!projectId) return;

      const existing = loadUnknownFactors(projectId);
      const updated = existing.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      );
      saveUnknownFactors(projectId, updated);
    },
    [projectId],
  );

  return { mutate, isPending: false };
}

/**
 * useSaveUnknownFactors — Bulk save unknown factors (used by onUpdateFactors).
 *
 * TODO: Migrate to Supabase when `unknown_factors` table is created.
 */
export function useSaveUnknownFactors(projectId: string | undefined) {
  const mutate = useCallback(
    (factors: UnknownFactor[]) => {
      if (!projectId) return;
      saveUnknownFactors(projectId, factors);
    },
    [projectId],
  );

  return { mutate, isPending: false };
}

// ---------------------------------------------------------------------------
// useConvertUnknownToAssumption — Convert unknown factor to assumption
// ---------------------------------------------------------------------------

export function useConvertUnknownToAssumption(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const insertMutation = useSupabaseMutation<AssumptionRow, AssumptionInsert>({
    table: 'assumptions',
    type: 'insert',
    invalidateKeys: [
      queryKeys.track.assumptions(projectId),
      queryKeys.assumptions.byProject(projectId),
    ],
    successMessage: '已轉化為假設',
  });

  const convert = useCallback(
    async (factor: UnknownFactor, assumptionCount: number) => {
      if (!projectId) return;

      const code = `A-${String(assumptionCount + 1).padStart(3, '0')}`;
      const riskMap: Record<string, string> = {
        high: 'high',
        medium: 'medium',
        low: 'low',
      };

      const insertData: AssumptionInsert = {
        project_id: projectId,
        code,
        content: factor.description,
        source_type: 'unknown_convert',
        worst_severity: riskMap[factor.impact] ?? 'medium',
        status: 'unverified',
        verification_stage: 'unplanned',
      };

      const result = await insertMutation.mutateAsync(insertData);

      // Update the unknown factor in localStorage to mark as converted
      const existing = loadUnknownFactors(projectId);
      const updated = existing.map((f) =>
        f.id === factor.id
          ? { ...f, status: 'converted' as const, linkedAssumptionId: result.id }
          : f,
      );
      saveUnknownFactors(projectId, updated);

      return result;
    },
    [projectId, insertMutation],
  );

  return {
    convert,
    isPending: insertMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useTrackExperiments — SELECT experiments by assumption_code
// ---------------------------------------------------------------------------

export function useTrackExperiments(assumptionCode: string | undefined) {
  const query = useSupabaseQuery<ExperimentRow[]>({
    table: 'experiments',
    queryKey: queryKeys.experiments.byAssumptionCode(assumptionCode),
    filters: assumptionCode
      ? [{ column: 'assumption_code', operator: 'eq', value: assumptionCode }]
      : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!assumptionCode,
  });

  return {
    ...query,
    data: query.data?.map(mapExperimentRow) ?? [],
  };
}
