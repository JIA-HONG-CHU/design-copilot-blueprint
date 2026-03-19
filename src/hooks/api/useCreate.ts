/**
 * API hooks for Create page (Step 2 — Solution Exploration)
 *
 * Covers: Anti-Anchor Routes, TRIZ Solutions, Subsystems,
 * SCAMPER Variants, and Alternatives.
 *
 * All hooks use the generic useSupabaseQuery / useSupabaseMutation
 * helpers and perform snake_case → camelCase mapping at the hook layer.
 */

import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { queryKeys } from './useQueryConfig';
import type {
  AntiAnchorRoute,
  TrizSolution,
  TrizPath,
  TrizActionStatus,
  Subsystem,
  SubsystemSource,
  ScamperVariant,
  ScamperAction,
  ScamperNewContradiction,
  Alternative,
  AlternativeSource,
  InterfaceContract,
} from '@/types/create';
import type { Json } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Row types (DB snake_case)
// ---------------------------------------------------------------------------

interface AntiAnchorRouteRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  is_non_typical: boolean;
  source: string | null;
  created_at: string;
}

interface TrizSolutionRow {
  id: string;
  project_id: string;
  contradiction_id: string | null;
  path: string;
  principle_number: number | null;
  principle_name: string | null;
  suggestion: string | null;
  status: string;
  created_at: string;
}

interface SubsystemRow {
  id: string;
  project_id: string;
  name: string;
  reason: string | null;
  related_contradictions: string[] | null;
  confirmed: boolean;
  parent_id: string | null;
  interfaces: string | null;
  source: string;
  created_at: string;
}

interface ScamperVariantRow {
  id: string;
  project_id: string;
  subsystem_id: string | null;
  action: string;
  description: string | null;
  adopted: boolean;
  new_contradictions: Json | null;
  created_at: string;
}

interface AlternativeRow {
  id: string;
  project_id: string;
  name: string;
  mechanism: string | null;
  source: string | null;
  key_assumption_ids: string[] | null;
  must_scores: Json | null;
  interface_contract: Json | null;
  pre_cad_scores: Json | null;
  overall_pass: boolean | null;
  cad_status: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mappers: DB row → frontend type
// ---------------------------------------------------------------------------

function mapAntiAnchorRoute(row: AntiAnchorRouteRow): AntiAnchorRoute {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdAt: row.created_at,
  };
}

function mapTrizSolution(row: TrizSolutionRow): TrizSolution {
  return {
    id: row.id,
    contradictionId: row.contradiction_id ?? '',
    path: row.path as TrizPath,
    principleNumber: row.principle_number,
    principleName: row.principle_name ?? '',
    suggestion: row.suggestion ?? '',
    status: row.status as TrizActionStatus,
    createdAt: row.created_at,
  };
}

function mapSubsystem(row: SubsystemRow): Subsystem {
  return {
    id: row.id,
    name: row.name,
    reason: row.reason ?? '',
    relatedContradictions: row.related_contradictions ?? [],
    confirmed: row.confirmed,
    parentId: row.parent_id,
    interfaces: row.interfaces ? row.interfaces.split(',').map(s => s.trim()).filter(Boolean) : [],
    source: row.source as SubsystemSource,
    createdAt: row.created_at,
  };
}

function mapScamperVariant(row: ScamperVariantRow): ScamperVariant {
  return {
    id: row.id,
    subsystemId: row.subsystem_id ?? '',
    action: row.action as ScamperAction,
    description: row.description ?? '',
    adopted: row.adopted,
    newContradictions: (row.new_contradictions as ScamperNewContradiction[] | null) ?? undefined,
    createdAt: row.created_at,
  };
}

function mapAlternative(row: AlternativeRow): Alternative {
  const defaultMust: Record<string, 'pass' | 'fail' | 'marginal' | null> = {
    M1: null, M2: null, M3: null, M4: null, M5: null, M6: null,
  };
  const defaultPreCad = {
    must: null as number | null,
    decoupling: null as number | null,
    testability: null as number | null,
    failureMech: null as number | null,
    mvpCadEffort: null as number | null,
  };
  const defaultContract: InterfaceContract = {
    envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '',
  };

  return {
    id: row.id,
    name: row.name,
    mechanism: row.mechanism ?? '',
    source: (row.source ?? 'manual') as AlternativeSource,
    keyAssumptionIds: row.key_assumption_ids ?? [],
    mustScores: row.must_scores ? { ...defaultMust, ...(row.must_scores as Record<string, 'pass' | 'fail' | 'marginal' | null>) } : defaultMust,
    interfaceContract: row.interface_contract ? { ...defaultContract, ...(row.interface_contract as Partial<InterfaceContract>) } : defaultContract,
    preCadScores: row.pre_cad_scores ? { ...defaultPreCad, ...(row.pre_cad_scores as Partial<typeof defaultPreCad>) } : defaultPreCad,
    overallPass: row.overall_pass,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Anti-Anchor Routes
// ---------------------------------------------------------------------------

export function useAntiAnchorRoutes(projectId: string | undefined) {
  const result = useSupabaseQuery<AntiAnchorRouteRow[]>({
    table: 'anti_anchor_routes',
    queryKey: queryKeys.anti_anchor_routes.byProject(projectId ?? ''),
    filters: projectId ? [{ column: 'project_id', operator: 'eq', value: projectId }] : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapAntiAnchorRoute) ?? [],
  };
}

export function useCreateAntiAnchorRoute() {
  return useSupabaseMutation<AntiAnchorRouteRow, {
    project_id: string;
    name: string;
    description?: string;
    is_non_typical?: boolean;
    source?: string;
  }>({
    table: 'anti_anchor_routes',
    type: 'insert',
    invalidateKeys: [queryKeys.anti_anchor_routes.all],
    successMessage: '已新增 Anti-Anchor 路線',
  });
}

export function useUpdateAntiAnchorRoute() {
  return useSupabaseMutation<AntiAnchorRouteRow, {
    id: string;
    name?: string;
    description?: string;
    is_non_typical?: boolean;
    source?: string;
  }>({
    table: 'anti_anchor_routes',
    type: 'update',
    invalidateKeys: [queryKeys.anti_anchor_routes.all],
    successMessage: 'Anti-Anchor 路線已更新',
  });
}

// ---------------------------------------------------------------------------
// TRIZ Solutions
// ---------------------------------------------------------------------------

export function useTrizSolutions(projectId: string | undefined) {
  const result = useSupabaseQuery<TrizSolutionRow[]>({
    table: 'triz_solutions',
    queryKey: queryKeys.triz_solutions.byProject(projectId ?? ''),
    filters: projectId ? [{ column: 'project_id', operator: 'eq', value: projectId }] : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapTrizSolution) ?? [],
  };
}

export function useCreateTrizSolution() {
  return useSupabaseMutation<TrizSolutionRow, {
    project_id: string;
    contradiction_id?: string;
    path: string;
    principle_number?: number | null;
    principle_name?: string;
    suggestion?: string;
    status?: string;
  }>({
    table: 'triz_solutions',
    type: 'insert',
    invalidateKeys: [queryKeys.triz_solutions.all],
    successMessage: '已新增 TRIZ 解法',
  });
}

export function useUpdateTrizSolution() {
  return useSupabaseMutation<TrizSolutionRow, {
    id: string;
    status?: string;
    suggestion?: string;
    principle_name?: string;
  }>({
    table: 'triz_solutions',
    type: 'update',
    invalidateKeys: [queryKeys.triz_solutions.all],
    successMessage: 'TRIZ 解法已更新',
  });
}

// ---------------------------------------------------------------------------
// Subsystems
// ---------------------------------------------------------------------------

export function useSubsystems(projectId: string | undefined) {
  const result = useSupabaseQuery<SubsystemRow[]>({
    table: 'subsystems',
    queryKey: queryKeys.subsystems.byProject(projectId ?? ''),
    filters: projectId ? [{ column: 'project_id', operator: 'eq', value: projectId }] : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapSubsystem) ?? [],
  };
}

export function useCreateSubsystem() {
  return useSupabaseMutation<SubsystemRow, {
    project_id: string;
    name: string;
    reason?: string;
    related_contradictions?: string[];
    confirmed?: boolean;
    parent_id?: string | null;
    interfaces?: string;
    source?: string;
  }>({
    table: 'subsystems',
    type: 'insert',
    invalidateKeys: [queryKeys.subsystems.all],
    successMessage: '已新增子系統',
  });
}

export function useUpdateSubsystem() {
  return useSupabaseMutation<SubsystemRow, {
    id: string;
    name?: string;
    reason?: string;
    related_contradictions?: string[];
    confirmed?: boolean;
    parent_id?: string | null;
    interfaces?: string;
    source?: string;
  }>({
    table: 'subsystems',
    type: 'update',
    invalidateKeys: [queryKeys.subsystems.all],
    successMessage: '子系統已更新',
  });
}

export function useDeleteSubsystem() {
  return useSupabaseMutation<unknown, { id: string }>({
    table: 'subsystems',
    type: 'delete',
    invalidateKeys: [queryKeys.subsystems.all],
    successMessage: '已刪除子系統',
  });
}

// ---------------------------------------------------------------------------
// SCAMPER Variants
// ---------------------------------------------------------------------------

export function useScamperVariants(projectId: string | undefined) {
  const result = useSupabaseQuery<ScamperVariantRow[]>({
    table: 'scamper_variants',
    queryKey: queryKeys.scamper_variants.byProject(projectId ?? ''),
    filters: projectId ? [{ column: 'project_id', operator: 'eq', value: projectId }] : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapScamperVariant) ?? [],
  };
}

export function useCreateScamperVariant() {
  return useSupabaseMutation<ScamperVariantRow, {
    project_id: string;
    subsystem_id?: string;
    action: string;
    description?: string;
    adopted?: boolean;
    new_contradictions?: Json;
  }>({
    table: 'scamper_variants',
    type: 'insert',
    invalidateKeys: [queryKeys.scamper_variants.all],
    successMessage: '已新增 SCAMPER 變形',
  });
}

export function useUpdateScamperVariant() {
  return useSupabaseMutation<ScamperVariantRow, {
    id: string;
    adopted?: boolean;
    description?: string;
    new_contradictions?: Json;
  }>({
    table: 'scamper_variants',
    type: 'update',
    invalidateKeys: [queryKeys.scamper_variants.all],
    successMessage: 'SCAMPER 變形已更新',
  });
}

// ---------------------------------------------------------------------------
// Alternatives
// ---------------------------------------------------------------------------

export function useAlternatives(projectId: string | undefined) {
  const result = useSupabaseQuery<AlternativeRow[]>({
    table: 'alternatives',
    queryKey: queryKeys.alternatives.byProject(projectId ?? ''),
    filters: projectId ? [{ column: 'project_id', operator: 'eq', value: projectId }] : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapAlternative) ?? [],
  };
}

export function useCreateAlternative() {
  return useSupabaseMutation<AlternativeRow, {
    project_id: string;
    name: string;
    mechanism?: string;
    source?: string;
    key_assumption_ids?: string[];
    must_scores?: Json;
    interface_contract?: Json;
    pre_cad_scores?: Json;
    overall_pass?: boolean | null;
    cad_status?: string;
  }>({
    table: 'alternatives',
    type: 'insert',
    invalidateKeys: [queryKeys.alternatives.all],
    successMessage: '已新增方案',
  });
}

export function useUpdateAlternative() {
  return useSupabaseMutation<AlternativeRow, {
    id: string;
    name?: string;
    mechanism?: string;
    source?: string;
    key_assumption_ids?: string[];
    must_scores?: Json;
    interface_contract?: Json;
    pre_cad_scores?: Json;
    overall_pass?: boolean | null;
    cad_status?: string;
  }>({
    table: 'alternatives',
    type: 'update',
    invalidateKeys: [queryKeys.alternatives.all],
    successMessage: '方案已更新',
  });
}
