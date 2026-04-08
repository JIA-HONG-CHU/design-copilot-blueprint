/**
 * useSubsystemSuggestion — Stage 3 extraction.
 *
 * Owns the end-to-end flow for AI subsystem suggestion:
 *   clear existing AI subsystems → call backend → flatten tree →
 *   insert each node (preserving parent chain) → invalidate query.
 *
 * The page component retains only the button-disabled state and
 * toast feedback (via onSuccess / onError callbacks).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scamperSubsystemSuggest } from '@/lib/api';
import type { SuggestedSubsystem, PackageMap } from '@/types/generated/subsystem';
import { queryKeys } from './useQueryConfig';

export interface SubsystemSuggestionVariables {
  mission: string;
  contradictions: string[];
}

export interface SubsystemSuggestionResult {
  created: number;
  packageMap?: PackageMap | null;
}

export function useSubsystemSuggestion(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<SubsystemSuggestionResult, Error, SubsystemSuggestionVariables>({
    mutationFn: async ({ mission, contradictions }) => {
      if (!projectId) throw new Error('projectId is required');

      // 1) Clear existing AI-produced subsystems (preserve manual ones).
      const { error: delErr } = await supabase
        .from('subsystems')
        .delete()
        .eq('project_id', projectId)
        .eq('source', 'ai');
      if (delErr) console.warn('Failed to clear subsystems:', delErr.message);

      // 2) Call backend suggestion API.
      const resp = await scamperSubsystemSuggest({
        project_id: projectId,
        mission,
        contradictions,
        existing_subsystems: [],
      });

      // 3) Flatten tree → sequential inserts preserving parent chain.
      const tree = resp.subsystems ?? [];
      let created = 0;

      const insertTree = async (nodes: SuggestedSubsystem[], parentId: string | null) => {
        for (const node of nodes) {
          const insertData: Record<string, unknown> = {
            project_id: projectId,
            name: node.name,
            level: node.level ?? 'module',
            reason: node.reason ?? '',
            related_contradictions: node.related_contradictions ?? [],
            confirmed: false,
            source: 'ai',
            parent_id: parentId,
            interfaces: node.interface_contracts ? Object.keys(node.interface_contracts).join(', ') : null,
            interface_contracts: node.interface_contracts ?? null,
          };

          const { data, error } = await supabase
            .from('subsystems')
            .insert(insertData)
            .select('id')
            .single();

          if (error) {
            console.error('[useSubsystemSuggestion] insert error:', error);
            continue;
          }
          created++;

          if (node.children?.length && data?.id) {
            await insertTree(node.children, data.id);
          }
        }
      };

      await insertTree(tree, null);

      return { created, packageMap: resp.package_map ?? null };
    },
    onSuccess: () => {
      // 4) Invalidate so the page refetches the new rows.
      queryClient.invalidateQueries({ queryKey: queryKeys.subsystems.all });
    },
  });
}
