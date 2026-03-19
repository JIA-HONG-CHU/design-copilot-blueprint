/**
 * API hooks for the Contradiction Identification page
 *
 * CRUD operations on the `contradictions` table, mapping
 * snake_case DB columns to the camelCase `Contradiction` frontend type.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys, defaultQueryOptions } from '@/hooks/api/useQueryConfig';
import { CONTRADICTION_SEVERITIES, DEFAULT_SEVERITY } from '@/types/contradiction';
import type { Contradiction, ContradictionSeverity } from '@/types/contradiction';

// ---------------------------------------------------------------------------
// Row type & mapper
// ---------------------------------------------------------------------------

interface ContradictionRow {
  id: string;
  project_id: string;
  natural_description: string | null;
  improving_param: number | null;
  worsening_param: number | null;
  engineering_statement: string | null;
  physical_contradiction: string | null;
  type: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

const validSeverities: ReadonlySet<string> = new Set(CONTRADICTION_SEVERITIES);

const mapRow = (r: ContradictionRow): Contradiction => ({
  id: r.id,
  projectId: r.project_id,
  naturalDescription: r.natural_description ?? '',
  improvingParam: r.improving_param,
  worseningParam: r.worsening_param,
  engineeringStatement: r.engineering_statement ?? '',
  physicalContradiction: r.physical_contradiction ?? '',
  severity: (validSeverities.has(r.severity) ? r.severity : DEFAULT_SEVERITY) as ContradictionSeverity,
  resolved: (r as any).resolved ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

export function useContradictions(projectId: string | undefined) {
  return useQuery<Contradiction[], Error>({
    queryKey: queryKeys.contradictions.byProject(projectId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contradictions')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as ContradictionRow[]).map(mapRow);
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateContradiction() {
  const qc = useQueryClient();
  return useMutation<
    Contradiction,
    Error,
    {
      projectId: string;
      naturalDescription: string;
      improvingParam: number | null;
      worseningParam: number | null;
      engineeringStatement: string;
      physicalContradiction?: string;
      severity: ContradictionSeverity;
    }
  >({
    mutationFn: async (vars) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('contradictions')
        .insert({
          project_id: vars.projectId,
          natural_description: vars.naturalDescription,
          improving_param: vars.improvingParam,
          worsening_param: vars.worseningParam,
          engineering_statement: vars.engineeringStatement,
          physical_contradiction: vars.physicalContradiction ?? '',
          severity: vars.severity,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data as ContradictionRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(vars.projectId) });
      toast.success('矛盾已新增');
    },
    onError: (err) => {
      toast.error(`新增矛盾失敗：${err.message}`);
    },
  });
}

export function useUpdateContradiction() {
  const qc = useQueryClient();
  return useMutation<
    Contradiction,
    Error,
    {
      id: string;
      projectId: string;
      naturalDescription?: string;
      improvingParam?: number | null;
      worseningParam?: number | null;
      engineeringStatement?: string;
      physicalContradiction?: string;
      severity?: ContradictionSeverity;
    }
  >({
    mutationFn: async (vars) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (vars.naturalDescription !== undefined) updateData.natural_description = vars.naturalDescription;
      if (vars.improvingParam !== undefined) updateData.improving_param = vars.improvingParam;
      if (vars.worseningParam !== undefined) updateData.worsening_param = vars.worseningParam;
      if (vars.engineeringStatement !== undefined) updateData.engineering_statement = vars.engineeringStatement;
      if (vars.physicalContradiction !== undefined) updateData.physical_contradiction = vars.physicalContradiction;
      if (vars.severity !== undefined) updateData.severity = vars.severity;

      const { data, error } = await supabase
        .from('contradictions')
        .update(updateData)
        .eq('id', vars.id)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data as ContradictionRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(vars.projectId) });
      toast.success('矛盾已更新');
    },
    onError: (err) => {
      toast.error(`更新矛盾失敗：${err.message}`);
    },
  });
}

export function useDeleteContradiction() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async (vars) => {
      const { error } = await supabase
        .from('contradictions')
        .delete()
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(vars.projectId) });
      toast.success('矛盾已刪除');
    },
    onError: (err) => {
      toast.error(`刪除矛盾失敗：${err.message}`);
    },
  });
}
