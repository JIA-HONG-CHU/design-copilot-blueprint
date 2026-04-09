/**
 * DifferentialAnalysisPanel — v7 Tab ① 區塊 B 的 differential_analysis 面板.
 *
 * Shows three pairwise comparisons (L1↔L2 / L1↔L3 / L2↔L3) plus the LLM-recommended
 * drill-down route, fallback route, rationale, and three adoption buttons:
 *   [採納推薦路線]  — primary route
 *   [自訂組合]      — opens a dialog to cherry-pick L1/L2/L3 subset
 *   [只採 L1 快速路線] — fallback shortcut
 *
 * Refs:
 *   - docs/diagrams/create-ux-spec.md v7 §Tab ① 區塊 B + 採納三按鈕
 *   - docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §5 (differential_analysis)
 *   - src/types/layeredTriz.ts
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Rocket, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AdoptedLayerId,
  DifferentialAnalysis,
  DifferentialPairAnalysis,
} from '@/types/layeredTriz';
import { LAYER_COLOR, LAYER_LABEL } from '@/types/layeredTriz';
import type { AdoptionMode } from './LayeredSolutionCard';

interface Props {
  analysis: DifferentialAnalysis;
  onAdopt?: (mode: AdoptionMode, layers: AdoptedLayerId[]) => void;
  /** Which layers are actually available (skipped layers should not be selectable). */
  availableLayers?: AdoptedLayerId[];
}

function PairRow({
  title,
  pair,
}: {
  title: string;
  pair: DifferentialPairAnalysis;
}) {
  // Not every pair will have every field — show whatever the LLM populated.
  const rows: Array<[string, string]> = [];
  if (pair.on_solving_degree) rows.push(['解決度', pair.on_solving_degree]);
  if (pair.on_effort) rows.push(['工程成本', pair.on_effort]);
  if (pair.on_risk) rows.push(['風險', pair.on_risk]);
  if (pair.orthogonality) rows.push(['正交性', pair.orthogonality]);
  if (pair.synergy) rows.push(['綜效', pair.synergy]);
  if (!rows.length) return null;
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="text-[11px] leading-snug">
          <span className="font-semibold">{k}：</span>
          <span className="text-muted-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function DifferentialAnalysisPanel({
  analysis,
  onAdopt,
  availableLayers = ['L1', 'L2', 'L3'],
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customSelection, setCustomSelection] = useState<Set<AdoptedLayerId>>(
    new Set(analysis.recommended_route.adopted_layers),
  );

  const route = analysis.recommended_route;
  const hasL2 = availableLayers.includes('L2');

  const toggleLayer = (layer: AdoptedLayerId) => {
    setCustomSelection((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const confirmCustom = () => {
    const layers: AdoptedLayerId[] = (['L1', 'L2', 'L3'] as const).filter((l) =>
      customSelection.has(l),
    );
    if (layers.length === 0) return;
    onAdopt?.('custom', layers);
    setCustomOpen(false);
  };

  return (
    <div
      className="rounded-md border bg-muted/30 p-3 space-y-3"
      data-testid="differential-analysis-panel"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          differential_analysis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <PairRow title="L1 vs L2" pair={analysis.l1_vs_l2} />
        <PairRow title="L1 vs L3" pair={analysis.l1_vs_l3} />
        <PairRow title="L2 vs L3" pair={analysis.l2_vs_l3} />
      </div>

      {/* Recommended route block */}
      <div className="rounded-md border border-primary/30 bg-background p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Rocket className="h-3.5 w-3.5 text-primary" />
          <span>🎯 推薦路線</span>
          <Badge variant="default" className="text-[10px]">
            {route.primary || '(未產出)'}
          </Badge>
          {route.adopted_layers.length > 0 && (
            <div className="flex items-center gap-0.5">
              {route.adopted_layers.map((l) => (
                <Badge
                  key={l}
                  variant="outline"
                  className={cn('text-[9px] font-mono', LAYER_COLOR[l])}
                >
                  {l}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {route.fallback && (
          <div className="text-[11px]">
            <span className="font-semibold">fallback：</span>
            <span className="text-muted-foreground">{route.fallback}</span>
          </div>
        )}
        {route.rationale && (
          <div className="text-[11px] text-muted-foreground leading-snug italic">
            {route.rationale}
          </div>
        )}
      </div>

      {/* Three adoption buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="text-[11px]"
          onClick={() => onAdopt?.('recommended', route.adopted_layers)}
          disabled={route.adopted_layers.length === 0}
          data-testid="adopt-recommended-btn"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          採納推薦路線
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[11px]"
          onClick={() => setCustomOpen(true)}
          data-testid="adopt-custom-btn"
        >
          <Settings2 className="h-3 w-3 mr-1" />
          自訂組合
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px]"
          onClick={() => onAdopt?.('fallback', ['L1'])}
          data-testid="adopt-fallback-btn"
        >
          只採 L1 快速路線
        </Button>
      </div>

      {/* Custom combination dialog */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自訂採納組合</DialogTitle>
            <DialogDescription>
              勾選要採納的層。同一個 LayeredTrizSolution 內的跨層組合會被 Phase B 掃描自動 SKIP 互斥檢查。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(['L1', 'L2', 'L3'] as const).map((l) => {
              const disabled = !availableLayers.includes(l);
              const checked = customSelection.has(l);
              return (
                <label
                  key={l}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-2',
                    disabled && 'opacity-40',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleLayer(l)}
                  />
                  <span className={cn('text-sm font-semibold', LAYER_COLOR[l])}>{l}</span>
                  <span className="text-xs text-muted-foreground">{LAYER_LABEL[l]}</span>
                  {disabled && (
                    <Badge variant="outline" className="ml-auto text-[9px]">
                      unavailable
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
          {!hasL2 && (
            <p className="text-[11px] text-muted-foreground">
              ⓘ L2 未觸發（條件未達或 quick_mode）。若要納入 L2，請先回到 L1 區塊按「🔽 深挖 L2」。
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCustomOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={confirmCustom} disabled={customSelection.size === 0}>
              確認採納
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
