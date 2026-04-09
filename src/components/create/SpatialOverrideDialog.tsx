/**
 * SpatialOverrideDialog — Tab ② "我來給數字" (WBS 7.5).
 *
 * Inline RD override flow: RD provides authoritative spatial dimensions for a
 * specific component within the current project. The submission writes into
 * `project_component_overrides`, after which the layered spatial resolver
 * (Layer 1) returns this number directly with `confidence: rd_confirmed` for
 * subsequent Suggest Subsystems calls.
 *
 * Stateless w.r.t. the API: the parent injects `onSubmit` so this dialog can
 * be unit-tested with a mock and so we don't import the API wrapper here.
 */

import { useCallback, useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { BBox } from '@/types/generated/subsystem';

export interface SpatialOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from the current LLM estimate. */
  initial: {
    componentKey: string;
    displayName: string;
    currentBbox?: BBox | null;
    currentMassG?: number | null;
    currentNote?: string;
  };
  /** Parent-injected. Should call spatialComponentOverride and handle refetch. */
  onSubmit: (payload: {
    component_key: string;
    bbox: BBox;
    mass_g: number;
    category?: string;
    note?: string;
  }) => Promise<void>;
}

export function SpatialOverrideDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: SpatialOverrideDialogProps) {
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [massG, setMassG] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset / prefill whenever the dialog is (re-)opened with new initial data.
  useEffect(() => {
    if (!open) return;
    setW(initial.currentBbox ? String(initial.currentBbox.x_mm) : '');
    setH(initial.currentBbox ? String(initial.currentBbox.y_mm) : '');
    setD(initial.currentBbox ? String(initial.currentBbox.z_mm) : '');
    setMassG(initial.currentMassG != null ? String(initial.currentMassG) : '');
    setCategory('');
    setNote(initial.currentNote ?? '');
    setError(null);
    setLoading(false);
  }, [open, initial]);

  const wn = Number(w);
  const hn = Number(h);
  const dn = Number(d);
  const massN = Number(massG);
  const valid =
    Number.isFinite(wn) && wn > 0 &&
    Number.isFinite(hn) && hn > 0 &&
    Number.isFinite(dn) && dn > 0 &&
    Number.isFinite(massN) && massN >= 0;

  const handleSubmit = useCallback(async () => {
    if (!valid) {
      setError('請確認 W/H/D 皆為正數，mass_g 為非負數');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        component_key: initial.componentKey,
        bbox: {
          x_mm: wn,
          y_mm: hn,
          z_mm: dn,
          anchor: initial.currentBbox?.anchor,
        },
        mass_g: massN,
        category: category.trim() || undefined,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '寫入 override 失敗');
    } finally {
      setLoading(false);
    }
  }, [valid, wn, hn, dn, massN, category, note, initial, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            我來給數字 — {initial.displayName}
          </DialogTitle>
          <DialogDescription>
            覆寫後會寫入 project_component_overrides，下次 Suggest 會從 L1 直接採用此數字。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">component_key</Label>
            <p className="font-mono text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5 break-all">
              {initial.componentKey}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ovr-w" className="text-xs">寬 x_mm</Label>
              <Input
                id="ovr-w"
                type="number"
                value={w}
                onChange={(e) => setW(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovr-h" className="text-xs">深 y_mm</Label>
              <Input
                id="ovr-h"
                type="number"
                value={h}
                onChange={(e) => setH(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovr-d" className="text-xs">高 z_mm</Label>
              <Input
                id="ovr-d"
                type="number"
                value={d}
                onChange={(e) => setD(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ovr-mass" className="text-xs">mass_g</Label>
            <Input
              id="ovr-mass"
              type="number"
              value={massG}
              onChange={(e) => setMassG(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ovr-cat" className="text-xs">category（選填）</Label>
            <Input
              id="ovr-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. battery / motor / controller"
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ovr-note" className="text-xs">note（選填）</Label>
            <Textarea
              id="ovr-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="來源 / 量測方式 / 備註"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !valid}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                寫入中…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                寫入 override
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SpatialOverrideDialog;
