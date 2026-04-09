/**
 * DecomposedPCCard — single child PC card for the Phase 6.2 decomposition UI.
 *
 * Refs:
 *   - docs/e2e/module/Explore_TC_to_MultiPC_Decomposition_WBS.md §6.2
 *   - src/lib/triz/separationPrinciples.ts (category colour/label + principle lookup)
 *
 * Renders one row from the contradictions table whose `parentContradictionId`
 * points at a parent TC. The component is intentionally presentational — all
 * edit/delete actions are delegated via callbacks so the future wiring work
 * (Phase 6.1) can plug it into ContradictionTab without coupling.
 *
 * NOTE ON `confidence`:
 *   `ExploreContradiction` does not currently carry a `confidence` column.
 *   To avoid editing the shared type (guardrail), this card accepts an
 *   optional `confidence` prop that the caller can pass alongside the row.
 *   When `< 0.5` the card renders a yellow warning icon and greys itself out.
 */

import { useState, type JSX } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL_ZH,
  getSeparationPrinciple,
  type SeparationCategory,
} from '@/lib/triz/separationPrinciples';
import type { ExploreContradiction } from '@/types/explore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DecomposedPCCardProps {
  /** Child PC row (parent_contradiction_id set). */
  pc: ExploreContradiction;
  /** Optional callback for edit action. Omit to hide the edit button. */
  onEdit?: (pc: ExploreContradiction) => void;
  /** Optional callback for delete action. Omit to hide the delete button. */
  onDelete?: (pcId: string) => void;
  /** Visual density. Default 'comfortable'. */
  density?: 'compact' | 'comfortable';
  /**
   * Optional confidence score (0..1) associated with this child PC.
   * When < 0.5 the card greys out and shows a warning icon.
   * Kept as a prop (rather than on the row itself) because
   * `ExploreContradiction` does not currently carry this field.
   */
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Tailwind colour mapping
//
// `CATEGORY_COLOR` in separationPrinciples.ts stores Tailwind colour *keys*
// (e.g. "blue") rather than full class names. Tailwind's JIT compiler cannot
// see dynamically constructed class names, so we hard-code the mapping here
// with an explicit reference back to the canonical map.
// ---------------------------------------------------------------------------

const CATEGORY_BAR_CLASS: Record<SeparationCategory, string> = {
  time: 'bg-blue-500', // CATEGORY_COLOR.time === 'blue'
  space: 'bg-green-500', // CATEGORY_COLOR.space === 'green'
  condition: 'bg-orange-500', // CATEGORY_COLOR.condition === 'orange'
  whole_part: 'bg-purple-500', // CATEGORY_COLOR.whole_part === 'purple'
};

const CATEGORY_BADGE_CLASS: Record<SeparationCategory, string> = {
  time: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  space:
    'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  condition:
    'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
  whole_part:
    'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200',
};

function barClassFor(cat: SeparationCategory | null | undefined): string {
  if (!cat) return 'bg-slate-400';
  return CATEGORY_BAR_CLASS[cat] ?? 'bg-slate-400';
}

function badgeClassFor(cat: SeparationCategory | null | undefined): string {
  if (!cat) return 'border-slate-300 bg-slate-50 text-slate-700';
  return CATEGORY_BADGE_CLASS[cat] ?? 'border-slate-300 bg-slate-50 text-slate-700';
}

// Sanity reference so tree-shaking keeps the import meaningful and
// future maintainers notice the parity contract.
void CATEGORY_COLOR;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DecomposedPCCard({
  pc,
  onEdit,
  onDelete,
  density = 'comfortable',
  confidence,
}: DecomposedPCCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const category = pc.separationCategory ?? null;
  const categoryLabel = category ? CATEGORY_LABEL_ZH[category] : '未分類';
  const principle = pc.separationPrincipleId
    ? getSeparationPrinciple(pc.separationPrincipleId)
    : undefined;

  const lowConfidence = confidence !== undefined && confidence < 0.5;
  const isCompact = density === 'compact';

  return (
    <Card
      data-testid="decomposed-pc-card"
      className={cn(
        'relative flex gap-2 overflow-hidden border',
        isCompact ? 'p-2' : 'p-3',
        lowConfidence && 'opacity-70',
      )}
    >
      {/* Left colour bar */}
      <div
        aria-hidden="true"
        data-testid="pc-category-bar"
        className={cn('absolute left-0 top-0 h-full w-1', barClassFor(category))}
      />

      <div className="flex-1 pl-2 space-y-1.5">
        {/* Top row: category badge + subsystem chip + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn('text-[10px]', badgeClassFor(category))}
              data-testid="pc-category-label"
            >
              {categoryLabel}
            </Badge>
            {pc.subsystemHint && (
              <Badge
                variant="secondary"
                className="text-[10px]"
                data-testid="pc-subsystem-hint"
              >
                {pc.subsystemHint}
              </Badge>
            )}
            {lowConfidence && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="img"
                      aria-label="低信心，建議驗證"
                      data-testid="low-confidence-warning"
                      className="inline-flex text-amber-600"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>低信心，建議驗證</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  aria-label="編輯"
                  data-testid="pc-edit-btn"
                  onClick={() => onEdit(pc)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive"
                  aria-label="刪除"
                  data-testid="pc-delete-btn"
                  onClick={() => onDelete(pc.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Title: derived parameter */}
        <div
          className="text-sm font-semibold leading-tight"
          data-testid="pc-derived-parameter"
        >
          {pc.derivedParameter || '(未命名物理量)'}
        </div>

        {/* Attribute pair: A ⟷ ¬A */}
        {(pc.pcAttributeA || pc.pcAttributeNotA) && (
          <div
            className="flex flex-wrap items-center gap-1.5 text-xs"
            data-testid="pc-attribute-pair"
          >
            <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {pc.pcAttributeA || '?'}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ⟷
            </span>
            <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {pc.pcAttributeNotA || '?'}
            </span>
          </div>
        )}

        {/* Separation principle */}
        {principle && (
          <div
            className="flex items-center gap-1.5 text-xs"
            data-testid="pc-principle"
          >
            <span className="font-medium">{principle.nameZh}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {principle.id}
            </span>
          </div>
        )}

        {/* Collapsible rationale */}
        {pc.separationRationale && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              data-testid="pc-rationale-toggle"
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              <span>{expanded ? '收起理由' : '查看分離理由'}</span>
            </button>
            {expanded && (
              <p
                className="mt-1 rounded-md border bg-muted/40 p-2 text-[11px] leading-snug text-muted-foreground"
                data-testid="pc-rationale-body"
              >
                {pc.separationRationale}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default DecomposedPCCard;
