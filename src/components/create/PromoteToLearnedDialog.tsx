/**
 * PromoteToLearnedDialog — Tab ② "推升至 learned" (WBS 7.6).
 *
 * Promote a confirmed-enough spatial estimate into the org-wide learned
 * components table (Layer 2 of the spatial resolver). After promotion, future
 * Suggest Subsystems calls in OTHER projects can hit this fact directly
 * without having to scrape the web or fall back to LLM estimates.
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
import { TrendingUp, Library, Loader2, AlertTriangle } from 'lucide-react';
import type { BBox } from '@/types/generated/subsystem';

export interface PromoteToLearnedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: {
    key: string;
    displayName: string;
    currentBbox?: BBox | null;
    currentMassG?: number | null;
    originProjectId?: string;
  };
  onSubmit: (payload: {
    key: string;
    bbox: BBox;
    mass_g: number;
    category?: string;
    origin?: string;
    origin_project_id?: string;
    source_url?: string;
    source_text?: string;
  }) => Promise<void>;
}

export function PromoteToLearnedDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: PromoteToLearnedDialogProps) {
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [massG, setMassG] = useState('');
  const [category, setCategory] = useState('');
  const [origin, setOrigin] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setW(initial.currentBbox ? String(initial.currentBbox.x_mm) : '');
    setH(initial.currentBbox ? String(initial.currentBbox.y_mm) : '');
    setD(initial.currentBbox ? String(initial.currentBbox.z_mm) : '');
    setMassG(initial.currentMassG != null ? String(initial.currentMassG) : '');
    setCategory('');
    setOrigin('');
    setSourceUrl('');
    setSourceText('');
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
        key: initial.key,
        bbox: {
          x_mm: wn,
          y_mm: hn,
          z_mm: dn,
          anchor: initial.currentBbox?.anchor,
        },
        mass_g: massN,
        category: category.trim() || undefined,
        origin: origin.trim() || undefined,
        origin_project_id: initial.originProjectId,
        source_url: sourceUrl.trim() || undefined,
        source_text: sourceText.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '推升至 learned 失敗');
    } finally {
      setLoading(false);
    }
  }, [valid, wn, hn, dn, massN, category, origin, sourceUrl, sourceText, initial, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            推升至 learned — {initial.displayName}
          </DialogTitle>
          <DialogDescription>
            推升後這筆將成為組織級 learned 元件，其他專案的 Suggest 可直接命中 L2。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">key</Label>
            <p className="font-mono text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5 break-all">
              {initial.key}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="prm-w" className="text-xs">寬 x_mm</Label>
              <Input
                id="prm-w"
                type="number"
                value={w}
                onChange={(e) => setW(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prm-h" className="text-xs">深 y_mm</Label>
              <Input
                id="prm-h"
                type="number"
                value={h}
                onChange={(e) => setH(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prm-d" className="text-xs">高 z_mm</Label>
              <Input
                id="prm-d"
                type="number"
                value={d}
                onChange={(e) => setD(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prm-mass" className="text-xs">mass_g</Label>
            <Input
              id="prm-mass"
              type="number"
              value={massG}
              onChange={(e) => setMassG(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prm-cat" className="text-xs">category（選填）</Label>
            <Input
              id="prm-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. battery / motor / controller"
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prm-origin" className="text-xs">origin（選填）</Label>
            <Input
              id="prm-origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. vendor datasheet / bench measurement"
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prm-url" className="text-xs">source_url（選填）</Label>
            <Input
              id="prm-url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prm-stext" className="text-xs">source_text（選填）</Label>
            <Textarea
              id="prm-stext"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={3}
              placeholder="貼上來源摘要 / 數據出處片段"
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
                推升中…
              </>
            ) : (
              <>
                <Library className="mr-2 h-4 w-4" />
                推升至 learned
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromoteToLearnedDialog;
