/**
 * SpatialOverlayDialog — Create Tab ② 區塊 C (What-if Overlay).
 *
 * Stateless relative to the main discovery flow: opening, submitting, and
 * closing this dialog NEVER mutates the parent Package Map. The parent
 * injects `onSubmit` so we can unit-test with a mock, and so the dialog does
 * not import the API wrapper directly.
 *
 * UX contract (ref: docs/e2e §Discovery vs Overlay):
 * - Discovery Package Map → neutral slate palette.
 * - Overlay result        → red / amber / green coming straight from the
 *   backend-rendered SVG. The FE MUST NOT recolor nodes.
 */

import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PackageMap } from '@/types/generated/subsystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverlayZoneInput {
  name: string;
  bbox_mm: [number, number, number];
  origin_mm?: [number, number, number];
}

export interface OverlayModuleBudgetInput {
  name: string;
  max_mass_g: number;
}

export interface OverlayPayload {
  subsystems: unknown;
  zones: OverlayZoneInput[];
  module_mass_budgets: OverlayModuleBudgetInput[];
}

/**
 * Overlay result mirrors PackageMap but guarantees the two fields the
 * what-if flow always returns non-null.
 */
export type OverlayResult = Omit<PackageMap, 'overlay_violations' | 'svg'> & {
  overlay_violations: string[];
  svg: string;
};

export interface SpatialOverlayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current subsystems passed straight to the API call. */
  subsystems: unknown;
  /** Call the backend API. Inject from parent so we can mock in tests. */
  onSubmit: (payload: OverlayPayload) => Promise<OverlayResult>;
}

// ---------------------------------------------------------------------------
// Local editable form state
// ---------------------------------------------------------------------------

interface ZoneRow {
  name: string;
  w: string;
  h: string;
  d: string;
  ox: string;
  oy: string;
  oz: string;
}

interface ModuleBudgetRow {
  name: string;
  max_mass_g: string;
}

const emptyZone = (): ZoneRow => ({
  name: '',
  w: '',
  h: '',
  d: '',
  ox: '0',
  oy: '0',
  oz: '0',
});

const emptyBudget = (): ModuleBudgetRow => ({ name: '', max_mass_g: '' });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpatialOverlayDialog({
  open,
  onOpenChange,
  subsystems,
  onSubmit,
}: SpatialOverlayDialogProps) {
  const [zones, setZones] = useState<ZoneRow[]>([emptyZone()]);
  const [budgets, setBudgets] = useState<ModuleBudgetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OverlayResult | null>(null);

  // -- zone mutators --------------------------------------------------------
  const updateZone = (idx: number, patch: Partial<ZoneRow>) =>
    setZones((prev) => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
  const addZone = () => setZones((prev) => [...prev, emptyZone()]);
  const removeZone = (idx: number) =>
    setZones((prev) => prev.filter((_, i) => i !== idx));

  // -- budget mutators ------------------------------------------------------
  const updateBudget = (idx: number, patch: Partial<ModuleBudgetRow>) =>
    setBudgets((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const addBudget = () => setBudgets((prev) => [...prev, emptyBudget()]);
  const removeBudget = (idx: number) =>
    setBudgets((prev) => prev.filter((_, i) => i !== idx));

  // -- submit ---------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    setError(null);

    // Serialize form state into API payload.
    const zonePayload: OverlayZoneInput[] = [];
    for (const z of zones) {
      const w = Number(z.w);
      const h = Number(z.h);
      const d = Number(z.d);
      if (!z.name.trim()) {
        setError('每個區域都需要名稱');
        return;
      }
      if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) {
        setError(`區域「${z.name}」的 W/H/D 必須是數字`);
        return;
      }
      const ox = Number(z.ox) || 0;
      const oy = Number(z.oy) || 0;
      const oz = Number(z.oz) || 0;
      zonePayload.push({
        name: z.name.trim(),
        bbox_mm: [w, h, d],
        origin_mm: [ox, oy, oz],
      });
    }

    const budgetPayload: OverlayModuleBudgetInput[] = [];
    for (const b of budgets) {
      if (!b.name.trim() && !b.max_mass_g.trim()) continue;
      const mass = Number(b.max_mass_g);
      if (!b.name.trim()) {
        setError('模組預算需要名稱');
        return;
      }
      if (!Number.isFinite(mass)) {
        setError(`模組「${b.name}」的 max_mass_g 必須是數字`);
        return;
      }
      budgetPayload.push({ name: b.name.trim(), max_mass_g: mass });
    }

    setLoading(true);
    try {
      const res = await onSubmit({
        subsystems,
        zones: zonePayload,
        module_mass_budgets: budgetPayload,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '試算失敗，請重試');
    } finally {
      setLoading(false);
    }
  }, [zones, budgets, onSubmit, subsystems]);

  const clearOverlay = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>空間 Overlay 試算 (What-if)</DialogTitle>
          <DialogDescription>
            輸入候選空間區域與模組質量預算，檢查 fits / tight / clash。
          </DialogDescription>
        </DialogHeader>

        {/* Discovery vs Overlay separation hint */}
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50',
            'px-3 py-2 text-xs text-amber-900',
          )}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>此為 What-if 試算，不影響主 Package Map。</span>
        </div>

        {/* ----- Zone inputs ------------------------------------------- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">候選區域 (Zones)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addZone}
              className="h-7"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              新增區域
            </Button>
          </div>

          <div className="space-y-3">
            {zones.map((z, i) => (
              <div
                key={i}
                className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`zone-name-${i}`} className="text-xs">
                      名稱
                    </Label>
                    <Input
                      id={`zone-name-${i}`}
                      value={z.name}
                      onChange={(e) => updateZone(i, { name: e.target.value })}
                      placeholder="e.g. down-tube"
                      className="h-8"
                    />
                  </div>
                  {zones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeZone(i)}
                      className="h-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      移除
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`zone-w-${i}`} className="text-xs">
                      W (mm)
                    </Label>
                    <Input
                      id={`zone-w-${i}`}
                      type="number"
                      value={z.w}
                      onChange={(e) => updateZone(i, { w: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`zone-h-${i}`} className="text-xs">
                      H (mm)
                    </Label>
                    <Input
                      id={`zone-h-${i}`}
                      type="number"
                      value={z.h}
                      onChange={(e) => updateZone(i, { h: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`zone-d-${i}`} className="text-xs">
                      D (mm)
                    </Label>
                    <Input
                      id={`zone-d-${i}`}
                      type="number"
                      value={z.d}
                      onChange={(e) => updateZone(i, { d: e.target.value })}
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`zone-ox-${i}`} className="text-xs text-slate-500">
                      origin X (mm)
                    </Label>
                    <Input
                      id={`zone-ox-${i}`}
                      type="number"
                      value={z.ox}
                      onChange={(e) => updateZone(i, { ox: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`zone-oy-${i}`} className="text-xs text-slate-500">
                      origin Y (mm)
                    </Label>
                    <Input
                      id={`zone-oy-${i}`}
                      type="number"
                      value={z.oy}
                      onChange={(e) => updateZone(i, { oy: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`zone-oz-${i}`} className="text-xs text-slate-500">
                      origin Z (mm)
                    </Label>
                    <Input
                      id={`zone-oz-${i}`}
                      type="number"
                      value={z.oz}
                      onChange={(e) => updateZone(i, { oz: e.target.value })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ----- Module mass budgets ----------------------------------- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              模組質量預算 (選填)
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBudget}
              className="h-7"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              新增模組預算
            </Button>
          </div>

          {budgets.length === 0 ? (
            <p className="text-xs text-slate-500">尚未設定任何模組預算。</p>
          ) : (
            <div className="space-y-2">
              {budgets.map((b, i) => (
                <div
                  key={i}
                  className="flex items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                >
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`budget-name-${i}`} className="text-xs">
                      模組名稱
                    </Label>
                    <Input
                      id={`budget-name-${i}`}
                      value={b.name}
                      onChange={(e) => updateBudget(i, { name: e.target.value })}
                      placeholder="e.g. battery-pack"
                      className="h-8"
                    />
                  </div>
                  <div className="w-36 space-y-1">
                    <Label htmlFor={`budget-mass-${i}`} className="text-xs">
                      max_mass_g
                    </Label>
                    <Input
                      id={`budget-mass-${i}`}
                      type="number"
                      value={b.max_mass_g}
                      onChange={(e) =>
                        updateBudget(i, { max_mass_g: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBudget(i)}
                    className="h-8 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    移除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ----- Error strip ------------------------------------------- */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ----- Result ------------------------------------------------ */}
        {result && (
          <section className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">試算結果</h3>

            {/* SVG carries fits/tight/clash colors from backend. DO NOT recolor. */}
            <div
              className="overflow-auto rounded-md border border-slate-200 bg-white p-2"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />

            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Overlay Violations ({result.overlay_violations.length})
              </h4>
              {result.overlay_violations.length === 0 ? (
                <p className="text-xs text-emerald-700">沒有違規，所有模組皆 fits。</p>
              ) : (
                <ul className="space-y-1">
                  {result.overlay_violations.map((v, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-800"
                    >
                      <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
                        aria-hidden="true"
                      />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={clearOverlay}
            disabled={loading || !result}
          >
            清除 Overlay
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            關閉
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                試算中…
              </>
            ) : (
              '試算'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SpatialOverlayDialog;
