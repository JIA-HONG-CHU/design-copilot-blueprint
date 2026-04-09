/**
 * DecomposedChildrenList — container for multiple child PCs under a parent TC.
 *
 * Refs:
 *   - docs/e2e/module/Explore_TC_to_MultiPC_Decomposition_WBS.md §6.3
 *
 * Renders a collapsible, indented list of `DecomposedPCCard`s sorted by
 * separation category (time → space → condition → whole_part). This is a
 * pure presentational container — no data fetching.
 */

import { useState, type JSX } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExploreContradiction } from '@/types/explore';
import type { SeparationCategory } from '@/lib/triz/separationPrinciples';
import { DecomposedPCCard } from './DecomposedPCCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DecomposedChildrenListProps {
  /** All child PC rows (already filtered by parent_contradiction_id). */
  children: ExploreContradiction[];
  /** Parent TC id, for reference / empty-state labeling. */
  parentId: string;
  onEditPC?: (pc: ExploreContradiction) => void;
  onDeletePC?: (pcId: string) => void;
  /** Whether the list is expanded by default. Default true. */
  defaultExpanded?: boolean;
  /** When true, show a yellow banner indicating parent TC has changed. */
  stale?: boolean;
  /** Callback to re-run PC decomposition for this parent. */
  onReDecompose?: () => void;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: Record<SeparationCategory, number> = {
  time: 0,
  space: 1,
  condition: 2,
  whole_part: 3,
};

function categoryRank(cat: SeparationCategory | null | undefined): number {
  if (!cat) return 99;
  return CATEGORY_ORDER[cat] ?? 99;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DecomposedChildrenList({
  children,
  parentId,
  onEditPC,
  onDeletePC,
  defaultExpanded = true,
  stale,
  onReDecompose,
}: DecomposedChildrenListProps): JSX.Element | null {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (children.length === 0) {
    return null;
  }

  const sorted = [...children].sort((a, b) => {
    const ra = categoryRank(a.separationCategory);
    const rb = categoryRank(b.separationCategory);
    if (ra !== rb) return ra - rb;
    // stable-ish secondary sort by derivedParameter for determinism
    return (a.derivedParameter ?? '').localeCompare(b.derivedParameter ?? '');
  });

  return (
    <div
      data-testid="decomposed-children-list"
      data-parent-id={parentId}
      className="pl-8 border-l-2 border-dashed border-muted ml-2 space-y-2"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
        data-testid="decomposed-children-toggle"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>已深挖 {sorted.length} 個物理矛盾</span>
      </button>
      {stale && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>父矛盾參數已更新，建議重新深挖</span>
          {onReDecompose && (
            <button
              onClick={onReDecompose}
              className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              重新深挖
            </button>
          )}
        </div>
      )}
      <div className={cn('space-y-2', !expanded && 'hidden')}>
        {sorted.map((child) => (
          <DecomposedPCCard
            key={child.id}
            pc={child}
            onEdit={onEditPC}
            onDelete={onDeletePC}
          />
        ))}
      </div>
    </div>
  );
}

export default DecomposedChildrenList;
