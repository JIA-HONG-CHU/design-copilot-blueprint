/**
 * LayeredSolutionCard — Tab ① 區塊 B 分層診斷卡 (v7).
 *
 * Refs:
 *   - docs/diagrams/create-ux-spec.md v7 §Tab ① 區塊 B
 *   - docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §4–§7
 *   - src/types/layeredTriz.ts
 *
 * One contradiction → one card → vertical stack of L1 / L2 / L3 sections
 * followed by a DifferentialAnalysisPanel + three adoption buttons.
 *
 * Colour theme:
 *   L1 = blue   (phenomenon, always runs)
 *   L2 = amber  (root cause, conditional)
 *   L3 = green  (structural lens, always runs)
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Target,
  Zap,
  Activity,
  ArrowRight,
  Gauge,
  Wrench,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AdoptedLayerId,
  L1Surface,
  L2RootCause,
  L3StructuralCheck,
  LayeredTrizSolution,
  LayeredTrizSuggestion,
  SeparationCandidate,
  DeepenLink,
} from '@/types/layeredTriz';
import { SEVERITY_BADGE } from '@/types/layeredTriz';
import { DifferentialAnalysisPanel } from './DifferentialAnalysisPanel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AdoptionMode = 'recommended' | 'custom' | 'fallback';

export interface DeepenLinkEdits {
  derivedParameter: string;
  separationType: 'time' | 'space' | 'condition' | 'whole_part';
}

export interface LayeredSolutionCardProps {
  solution: LayeredTrizSolution;
  /** Called when RD adopts a route. `layers` is the final L1/L2/L3 subset. */
  onAdopt?: (mode: AdoptionMode, layers: AdoptedLayerId[]) => void;
  /** Called when RD manually triggers L2 deepen (force_l2 re-fetch). */
  onForceDeepenL2?: () => void;
  /** Called when RD edits the deepen_link derived parameter or separation type (WBS 8.7). */
  onEditDeepenLink?: (edits: DeepenLinkEdits) => void;
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

function SuggestionList({ items }: { items: LayeredTrizSuggestion[] }) {
  if (!items.length) {
    return <p className="text-xs italic text-muted-foreground">（無具體建議）</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={`${s.principle_name}-${i}`} className="rounded-md border bg-background/60 p-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            {s.principle_number != null && (
              <Badge variant="outline" className="text-[10px] font-mono">
                #{s.principle_number}
              </Badge>
            )}
            <span className="text-xs font-semibold">{s.principle_name || '(未命名原理)'}</span>
            {s.separation_principle && (
              <Badge variant="secondary" className="text-[9px]">
                {s.separation_principle}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{s.suggestion}</p>
          {s.affected_modules?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {s.affected_modules.map((m) => (
                <Badge key={m} variant="outline" className="text-[9px]">
                  {m}
                </Badge>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// L1 Critic badge
// ---------------------------------------------------------------------------

export function L1CriticBadge({ layer }: { layer: L1Surface }) {
  if (!layer.critic_trigger_l2) {
    return null;
  }
  const lowConfidence = layer.critic_confidence < 0.5;
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md border px-2 py-1 text-[11px]',
        lowConfidence
          ? 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
          : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
      )}
      data-testid="l1-critic-badge"
    >
      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <div className="font-semibold">
          {lowConfidence
            ? `critic 低信心 (${layer.critic_confidence.toFixed(2)}) — 建議 RD 手動判斷`
            : 'critic：trade-off 折衷 → 建議深挖 L2'}
        </div>
        {layer.critic_reason && (
          <div className="text-[10px] text-muted-foreground">{layer.critic_reason}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeepenLink visualization (ARIZ L1 → L2)
// ---------------------------------------------------------------------------

const SEP_LABEL: Record<SeparationCandidate['type'], string> = {
  time: '⏱ 時間分離',
  space: '🗺 空間分離',
  condition: '🎚 條件分離',
  whole_part: '🧩 整體-局部',
};

export function DeepenLinkVisualization({ link }: { link: DeepenLink }) {
  if (!link.derived_physical_parameter && !link.contradiction_statement) {
    return null;
  }
  const [improving, worsening] = link.from_tc_pair;
  return (
    <div
      className="rounded-md border border-dashed border-amber-300 bg-amber-50/60 p-2 space-y-2 dark:border-amber-800 dark:bg-amber-950/30"
      data-testid="deepen-link"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <Badge variant="outline" className="text-[9px]">
          TC
        </Badge>
        <span>
          (#{improving ?? '?'}, #{worsening ?? '?'})
        </span>
        <ArrowRight className="h-3 w-3 text-amber-600" />
        <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
          ARIZ 深挖
        </span>
        <ArrowRight className="h-3 w-3 text-amber-600" />
        <Badge variant="outline" className="text-[9px]">
          PC
        </Badge>
        <span className="font-semibold">{link.derived_physical_parameter || '(未知物理量)'}</span>
      </div>
      {link.contradiction_statement && (
        <p className="text-[11px] leading-snug text-amber-900 dark:text-amber-200">
          {link.contradiction_statement}
        </p>
      )}
      {link.separation_type_candidates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {link.separation_type_candidates.map((c, i) => (
            <span
              key={`${c.type}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                i === 0
                  ? 'border-amber-400 bg-amber-100 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100'
                  : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
              )}
              title={c.rationale}
            >
              {SEP_LABEL[c.type] ?? c.type} ({c.confidence.toFixed(2)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// L1 Section
// ---------------------------------------------------------------------------

function LayerHeader({
  label,
  icon: Icon,
  color,
  statusBadge,
  expanded,
  onToggle,
}: {
  label: string;
  icon: typeof Target;
  color: string;
  statusBadge: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition hover:bg-muted/40',
          color,
        )}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{label}</span>
          {statusBadge}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
    </CollapsibleTrigger>
  );
}

export function L1SurfaceSection({
  layer,
  onForceDeepenL2,
}: {
  layer: L1Surface;
  onForceDeepenL2?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="l1-section">
      <LayerHeader
        label="L1 — 現象層 (TC)"
        icon={Target}
        color="border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
        statusBadge={
          <Badge variant="secondary" className="text-[9px]">
            {layer.status === 'ran' ? '必跑 ✓' : `status: ${layer.status}`}
          </Badge>
        }
        expanded={open}
        onToggle={() => setOpen(!open)}
      />
      <CollapsibleContent className="pt-2 pl-2 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            查表 (#{layer.improving_param ?? '?'} × #{layer.worsening_param ?? '?'}) → 原理 [
            {layer.candidate_principles.join(', ') || '無'}]
          </span>
          <Badge variant="outline" className="text-[9px]">
            depth: {layer.depth_indicator}
          </Badge>
        </div>
        <L1CriticBadge layer={layer} />
        <SuggestionList items={layer.suggestions} />
        {layer.critic_trigger_l2 && onForceDeepenL2 && (
          <Button size="sm" variant="outline" className="text-[11px]" onClick={onForceDeepenL2}>
            <Zap className="h-3 w-3 mr-1" />
            🔽 深挖 L2
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// L2 Section
// ---------------------------------------------------------------------------

function L2StatusBadge({ layer }: { layer: L2RootCause | null }) {
  if (!layer) {
    return (
      <Badge variant="outline" className="text-[9px]">
        條件未達 ⊘
      </Badge>
    );
  }
  if (layer.status === 'skipped_quick_mode') {
    return (
      <Badge variant="outline" className="text-[9px]">
        quick_mode 跳過 ⊘
      </Badge>
    );
  }
  if (layer.status === 'skipped_condition') {
    return (
      <Badge variant="outline" className="text-[9px]">
        條件未達 ⊘
      </Badge>
    );
  }
  if (layer.status === 'error') {
    return (
      <Badge variant="destructive" className="text-[9px]">
        error
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500 text-[9px] text-white hover:bg-amber-600">已觸發 ✓</Badge>
  );
}

// ---------------------------------------------------------------------------
// L2 Deepen-link edit dialog (WBS 8.7)
// ---------------------------------------------------------------------------

const SEP_OPTIONS: { value: SeparationCandidate['type']; label: string }[] = [
  { value: 'time', label: '⏱ 時間分離' },
  { value: 'space', label: '🗺 空間分離' },
  { value: 'condition', label: '🎚 條件分離' },
  { value: 'whole_part', label: '🧩 整體-局部' },
];

function EditDeepenLinkDialog({
  link,
  onSave,
}: {
  link: DeepenLink;
  onSave: (edits: DeepenLinkEdits) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [param, setParam] = useState(link.derived_physical_parameter);
  const topSep = link.separation_type_candidates[0]?.type ?? 'time';
  const [sepType, setSepType] = useState<SeparationCandidate['type']>(topSep);

  const handleSave = () => {
    onSave({ derivedParameter: param.trim(), separationType: sepType });
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-[11px] gap-1" data-testid="edit-deepen-link-btn">
          <Pencil className="h-3 w-3" />
          RD 手動編輯
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">編輯 Deepen Link 參數</DialogTitle>
          <DialogDescription className="text-xs">
            修改 L2 推導物理量與分離類型後，將以修正值重新 fetch L2 結果。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">推導物理量 (derived_parameter)</label>
            <input
              type="text"
              value={param}
              onChange={(e) => setParam(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="例: 瞬時功率 P(t)"
              data-testid="edit-derived-parameter"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">分離類型 (separation_type)</label>
            <select
              value={sepType}
              onChange={(e) => setSepType(e.target.value as SeparationCandidate['type'])}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="edit-separation-type"
            >
              {SEP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!param.trim()} data-testid="edit-deepen-link-save">
            儲存並重新 fetch L2
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function L2RootCauseSection({
  layer,
  onForceDeepenL2,
  onEditDeepenLink,
}: {
  layer: L2RootCause | null;
  onForceDeepenL2?: () => void;
  onEditDeepenLink?: (edits: DeepenLinkEdits) => void;
}) {
  const [open, setOpen] = useState(Boolean(layer && layer.status === 'ran'));
  const hasRun = layer && layer.status === 'ran';
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="l2-section">
      <LayerHeader
        label="L2 — 根因層 (PC)"
        icon={FlaskConical}
        color="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        statusBadge={<L2StatusBadge layer={layer} />}
        expanded={open}
        onToggle={() => setOpen(!open)}
      />
      <CollapsibleContent className="pt-2 pl-2 space-y-2">
        {layer?.trigger_reason && (
          <div className="text-[10px] text-muted-foreground italic">
            trigger_reason: {layer.trigger_reason}
          </div>
        )}
        {hasRun && layer.deepen_link && <DeepenLinkVisualization link={layer.deepen_link} />}
        {hasRun && (
          <>
            <SuggestionList items={layer.suggestions} />
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">
                depth: {layer.depth_indicator}
              </Badge>
              {layer.deepen_link && onEditDeepenLink && (
                <EditDeepenLinkDialog link={layer.deepen_link} onSave={onEditDeepenLink} />
              )}
            </div>
          </>
        )}
        {!hasRun && onForceDeepenL2 && (
          <Button size="sm" variant="outline" className="text-[11px]" onClick={onForceDeepenL2}>
            <Zap className="h-3 w-3 mr-1" />
            RD 手動觸發 L2 深挖
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// L3 Section
// ---------------------------------------------------------------------------

const SF_STATE_BADGE: Record<string, string> = {
  insufficient: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  harmful: 'bg-red-100 text-red-800 border-red-300',
  incomplete: 'bg-orange-100 text-orange-800 border-orange-300',
  effective: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  unknown: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function L3StructuralSection({ layer }: { layer: L3StructuralCheck }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="l3-section">
      <LayerHeader
        label="L3 — 結構層 (SF)"
        icon={Wrench}
        color="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        statusBadge={
          <Badge variant="secondary" className="text-[9px]">
            必跑 ✓ 旁路
          </Badge>
        }
        expanded={open}
        onToggle={() => setOpen(!open)}
      />
      <CollapsibleContent className="pt-2 pl-2 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">
            S1={layer.su_field_model.S1 || '?'} │ S2={layer.su_field_model.S2 || '?'} │ F=
            {layer.su_field_model.F || '?'}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[9px] border', SF_STATE_BADGE[layer.su_field_model.state])}
          >
            state: {layer.su_field_model.state}
          </Badge>
        </div>
        {layer.matched_standard_solutions.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            matched standards: {layer.matched_standard_solutions.join(', ')}
          </div>
        )}
        <SuggestionList items={layer.suggestions} />
        {/* L3 永遠呈現的 relationship bridge text — 即使 L1/L2 已採納 */}
        {(layer.supports_l1 || layer.supports_l2 || layer.standalone_value) && (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2 space-y-0.5 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/30"
            data-testid="l3-bridge"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              relationship to other layers
            </div>
            {layer.supports_l1 && (
              <div>
                <span className="font-semibold">supports L1:</span> {layer.supports_l1}
              </div>
            )}
            {layer.supports_l2 && (
              <div>
                <span className="font-semibold">supports L2:</span> {layer.supports_l2}
              </div>
            )}
            {layer.standalone_value && (
              <div>
                <span className="font-semibold">standalone:</span> {layer.standalone_value}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Top-level card
// ---------------------------------------------------------------------------

export function LayeredSolutionCard({
  solution,
  onAdopt,
  onForceDeepenL2,
  onEditDeepenLink,
}: LayeredSolutionCardProps) {
  return (
    <Card className="border-primary/20" data-testid="layered-solution-card">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <CardTitle className="text-sm font-mono">{solution.id}</CardTitle>
          <Badge
            variant="outline"
            className={cn('text-[10px] border', SEVERITY_BADGE[solution.severity])}
          >
            severity: {solution.severity}
          </Badge>
          <Badge variant="outline" className="text-[9px]">
            C: {solution.contradiction_id}
          </Badge>
        </div>
        {solution.contradiction_natural_description && (
          <p className="text-xs text-muted-foreground leading-snug">
            {solution.contradiction_natural_description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <L1SurfaceSection layer={solution.l1_surface} onForceDeepenL2={onForceDeepenL2} />
        <L2RootCauseSection layer={solution.l2_root_cause} onForceDeepenL2={onForceDeepenL2} onEditDeepenLink={onEditDeepenLink} />
        <L3StructuralSection layer={solution.l3_structural_check} />
        <DifferentialAnalysisPanel
          analysis={solution.differential_analysis}
          onAdopt={onAdopt}
        />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
          <Gauge className="h-3 w-3" />
          <span>
            phase_b_directive: intra-LTS cross-layer{' '}
            <span className="font-semibold">
              {solution.phase_b_directive.same_contradiction_intra_layer_conflict}
            </span>{' '}
            · cross-contradiction{' '}
            <span className="font-semibold">
              {solution.phase_b_directive.cross_contradiction_conflict}
            </span>
          </span>
          <Activity className="h-3 w-3 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

export default LayeredSolutionCard;
