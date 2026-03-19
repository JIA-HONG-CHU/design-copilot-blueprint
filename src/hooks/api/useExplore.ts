/**
 * API hooks for the Explore page (Step 1.2–1.3)
 *
 * Covers Socratic Questions, CLD Nodes, CLD Edges,
 * and Explore-level Contradictions.
 *
 * All hooks perform snake_case (DB) <-> camelCase (frontend) mapping
 * so consuming components work with the canonical frontend types.
 */

import { useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys, defaultQueryOptions } from '@/hooks/api/useQueryConfig';
import type {
  SocraticQuestion,
  QuestionCategory,
  ExploreContradiction,
  ContradictionType,
  ContradictionStatus,
  CausalNode,
  CausalEdge,
} from '@/types/explore';

// ---------------------------------------------------------------------------
// Row ↔ Frontend mappers — Socratic Questions
// ---------------------------------------------------------------------------

interface SocraticQuestionRow {
  id: string;
  project_id: string;
  category: string;
  text: string;
  answer: string | null;
  tagged_as_assumption: boolean;
  tagged_as_contradiction: boolean;
  ai_suggested_tag: string | null;
  created_at: string;
}

const mapSocraticRow = (r: SocraticQuestionRow): SocraticQuestion => ({
  id: r.id,
  category: r.category as QuestionCategory,
  text: r.text,
  answer: r.answer,
  taggedAsAssumption: r.tagged_as_assumption,
  taggedAsContradiction: r.tagged_as_contradiction,
  aiSuggestedTag: r.ai_suggested_tag as SocraticQuestion['aiSuggestedTag'],
  // DB has no columns for these — derive from tag state
  aiTagConfirmed: !!(r.ai_suggested_tag && (r.tagged_as_assumption || r.tagged_as_contradiction)),
  aiTagDismissed: false,
});

// ---------------------------------------------------------------------------
// Row ↔ Frontend mappers — Explore Contradictions
// ---------------------------------------------------------------------------

interface ExploreContradictionRow {
  id: string;
  project_id: string;
  type: string | null;
  improving_param: number | null;
  worsening_param: number | null;
  natural_description: string | null;
  physical_contradiction: string | null;
  engineering_statement: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

const mapExploreContradictionRow = (r: ExploreContradictionRow): ExploreContradiction => {
  // Parse PC attributes from physical_contradiction field
  // Format from manual edit: "A | notA", from AI: free-text description
  let pcA: string | null = null;
  let pcNotA: string | null = null;
  if (r.physical_contradiction) {
    const parts = r.physical_contradiction.split(' | ');
    if (parts.length === 2) {
      pcA = parts[0].trim() || null;
      pcNotA = parts[1].trim() || null;
    } else {
      // AI returns a descriptive sentence — show as attribute A
      pcA = r.physical_contradiction;
    }
  }

  return {
    id: r.id,
    projectId: r.project_id,
    type: (r.type as ContradictionType) ?? 'TC',
    improvingParam: r.improving_param,
    worseningParam: r.worsening_param,
    pcAttributeA: pcA,
    pcAttributeNotA: pcNotA,
    description: r.engineering_statement || r.natural_description || '',
    engineeringStatement: r.engineering_statement ?? null,
    status: (r.resolved ? 'confirmed' : 'draft') as ContradictionStatus,
    source: r.engineering_statement ? 'ai' : 'manual',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

// ---------------------------------------------------------------------------
// Row ↔ Frontend mappers — CLD Nodes
// ---------------------------------------------------------------------------

interface CldNodeRow {
  id: string;
  project_id: string;
  label: string;
  x: number;
  y: number;
  node_type: string;
  assumption_id: string | null;
  is_leverage: boolean;
}

const mapCldNodeRow = (r: CldNodeRow): CausalNode => ({
  id: r.id,
  label: r.label,
  position: { x: r.x, y: r.y },
  isBreakpoint: r.is_leverage,
  breakpointReason: null, // not stored in DB yet
  relatedContradictions: [], // populated client-side if needed
});

// ---------------------------------------------------------------------------
// Row ↔ Frontend mappers — CLD Edges
// ---------------------------------------------------------------------------

interface CldEdgeRow {
  id: string;
  project_id: string;
  from_node: string;
  to_node: string;
  polarity: string;
}

const mapCldEdgeRow = (r: CldEdgeRow): CausalEdge => ({
  id: r.id,
  source: r.from_node,
  target: r.to_node,
  feedbackType: r.polarity === 'negative' ? 'negative' : 'positive',
});

// =========================================================================
// Socratic Questions hooks
// =========================================================================

export function useSocraticQuestions(projectId: string | undefined) {
  return useQuery<SocraticQuestion[], Error>({
    queryKey: queryKeys.socratic_questions.byProject(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('socratic_questions')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as SocraticQuestionRow[]).map(mapSocraticRow);
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
}

export function useCreateSocraticQuestion() {
  const qc = useQueryClient();
  return useMutation<
    SocraticQuestion,
    Error,
    { projectId: string; category: QuestionCategory; text: string }
  >({
    mutationFn: async (vars) => {
      const { data, error } = await supabase
        .from('socratic_questions')
        .insert({
          project_id: vars.projectId,
          category: vars.category,
          text: vars.text,
        })
        .select()
        .single();
      if (error) throw error;
      return mapSocraticRow(data as SocraticQuestionRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.socratic_questions.byProject(vars.projectId) });
      toast.success('問題已新增');
    },
    onError: (err) => {
      toast.error(`新增問題失敗：${err.message}`);
    },
  });
}

export function useUpdateSocraticQuestion() {
  const qc = useQueryClient();
  return useMutation<
    SocraticQuestion,
    Error,
    {
      id: string;
      projectId: string;
      answer?: string | null;
      taggedAsAssumption?: boolean;
      taggedAsContradiction?: boolean;
      aiSuggestedTag?: string | null;
    }
  >({
    mutationFn: async (vars) => {
      const updateData: Record<string, unknown> = {};
      if (vars.answer !== undefined) updateData.answer = vars.answer;
      if (vars.taggedAsAssumption !== undefined) updateData.tagged_as_assumption = vars.taggedAsAssumption;
      if (vars.taggedAsContradiction !== undefined) updateData.tagged_as_contradiction = vars.taggedAsContradiction;
      if (vars.aiSuggestedTag !== undefined) updateData.ai_suggested_tag = vars.aiSuggestedTag;

      const { data, error } = await supabase
        .from('socratic_questions')
        .update(updateData)
        .eq('id', vars.id)
        .select()
        .single();
      if (error) throw error;
      return mapSocraticRow(data as SocraticQuestionRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.socratic_questions.byProject(vars.projectId) });
    },
    onError: (err) => {
      toast.error(`更新問題失敗：${err.message}`);
    },
  });
}

// =========================================================================
// Explore Contradictions hooks (uses the shared `contradictions` table)
// =========================================================================

export function useExploreContradictions(projectId: string | undefined) {
  return useQuery<ExploreContradiction[], Error>({
    queryKey: queryKeys.contradictions.byProject(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contradictions')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as ExploreContradictionRow[]).map(mapExploreContradictionRow);
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
}

// =========================================================================
// CLD Nodes hooks
// =========================================================================

export function useCldNodes(projectId: string | undefined) {
  return useQuery<CausalNode[], Error>({
    queryKey: queryKeys.cld_nodes.byProject(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cld_nodes')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data as CldNodeRow[]).map(mapCldNodeRow);
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
}

export function useMutateCldNode() {
  const qc = useQueryClient();

  const insertMutation = useMutation<CausalNode, Error, { projectId: string; label: string; x: number; y: number; isBreakpoint?: boolean }>({
    mutationFn: async (vars) => {
      const { data, error } = await supabase
        .from('cld_nodes')
        .insert({
          project_id: vars.projectId,
          label: vars.label,
          x: vars.x,
          y: vars.y,
          is_leverage: vars.isBreakpoint ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return mapCldNodeRow(data as CldNodeRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_nodes.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 節點操作失敗：${err.message}`),
  });

  const updateMutation = useMutation<CausalNode, Error, { id: string; projectId: string; label?: string; x?: number; y?: number; isBreakpoint?: boolean }>({
    mutationFn: async (vars) => {
      const updateData: Record<string, unknown> = {};
      if (vars.label !== undefined) updateData.label = vars.label;
      if (vars.x !== undefined) updateData.x = vars.x;
      if (vars.y !== undefined) updateData.y = vars.y;
      if (vars.isBreakpoint !== undefined) updateData.is_leverage = vars.isBreakpoint;

      const { data, error } = await supabase
        .from('cld_nodes')
        .update(updateData)
        .eq('id', vars.id)
        .select()
        .single();
      if (error) throw error;
      return mapCldNodeRow(data as CldNodeRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_nodes.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 節點更新失敗：${err.message}`),
  });

  const deleteMutation = useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async (vars) => {
      const { error } = await supabase
        .from('cld_nodes')
        .delete()
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_nodes.byProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.cld_edges.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 節點刪除失敗：${err.message}`),
  });

  return { insert: insertMutation, update: updateMutation, remove: deleteMutation };
}

// =========================================================================
// CLD Edges hooks
// =========================================================================

export function useCldEdges(projectId: string | undefined) {
  return useQuery<CausalEdge[], Error>({
    queryKey: queryKeys.cld_edges.byProject(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cld_edges')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data as CldEdgeRow[]).map(mapCldEdgeRow);
    },
    enabled: !!projectId,
    ...defaultQueryOptions,
  });
}

export function useMutateCldEdge() {
  const qc = useQueryClient();

  const insertMutation = useMutation<CausalEdge, Error, { projectId: string; source: string; target: string; feedbackType: 'positive' | 'negative' }>({
    mutationFn: async (vars) => {
      const { data, error } = await supabase
        .from('cld_edges')
        .insert({
          project_id: vars.projectId,
          from_node: vars.source,
          to_node: vars.target,
          polarity: vars.feedbackType,
        })
        .select()
        .single();
      if (error) throw error;
      return mapCldEdgeRow(data as CldEdgeRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_edges.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 邊操作失敗：${err.message}`),
  });

  const updateMutation = useMutation<CausalEdge, Error, { id: string; projectId: string; source?: string; target?: string; feedbackType?: 'positive' | 'negative' }>({
    mutationFn: async (vars) => {
      const updateData: Record<string, unknown> = {};
      if (vars.source !== undefined) updateData.from_node = vars.source;
      if (vars.target !== undefined) updateData.to_node = vars.target;
      if (vars.feedbackType !== undefined) updateData.polarity = vars.feedbackType;

      const { data, error } = await supabase
        .from('cld_edges')
        .update(updateData)
        .eq('id', vars.id)
        .select()
        .single();
      if (error) throw error;
      return mapCldEdgeRow(data as CldEdgeRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_edges.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 邊更新失敗：${err.message}`),
  });

  const deleteMutation = useMutation<void, Error, { id: string; projectId: string }>({
    mutationFn: async (vars) => {
      const { error } = await supabase
        .from('cld_edges')
        .delete()
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.cld_edges.byProject(vars.projectId) });
    },
    onError: (err) => toast.error(`CLD 邊刪除失敗：${err.message}`),
  });

  return { insert: insertMutation, update: updateMutation, remove: deleteMutation };
}
