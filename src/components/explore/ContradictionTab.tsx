import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Plus, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { trizParameters } from "@/data/trizParameters";
import type { ExploreContradiction, ContradictionType } from "@/types/explore";

interface ContradictionTabProps {
  contradictions: ExploreContradiction[];
  onUpdateContradictions: (contradictions: ExploreContradiction[]) => void;
  hasAnswers: boolean;
  projectId: string;
}

export function ContradictionTab({ contradictions, onUpdateContradictions, hasAnswers, projectId }: ContradictionTabProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExploreContradiction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newType, setNewType] = useState<ContradictionType>('TC');

  const tcCount = contradictions.filter((c) => c.type === 'TC').length;
  const pcCount = contradictions.filter((c) => c.type === 'PC').length;
  const confirmedCount = contradictions.filter((c) => c.status === 'confirmed').length;

  const getParamLabel = (paramId: number | null) => {
    if (!paramId) return '—';
    const p = trizParameters.find((t) => t.id === paramId);
    return p ? `#${p.id} ${p.nameZh}` : '—';
  };

  const handleConfirm = (id: string) => {
    onUpdateContradictions(
      contradictions.map((c) => (c.id === id ? { ...c, status: 'confirmed' as const, updatedAt: new Date().toISOString() } : c))
    );
    toast.success('矛盾已確認');
  };

  const handleStartEdit = (c: ExploreContradiction) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdateContradictions(
      contradictions.map((c) => (c.id === editingId ? { ...c, ...editForm, updatedAt: new Date().toISOString() } : c))
    );
    setEditingId(null);
    setEditForm({});
    toast.success('矛盾已更新');
  };

  const handleDelete = (id: string) => {
    onUpdateContradictions(contradictions.filter((c) => c.id !== id));
    setDeleteConfirmId(null);
    toast.success('矛盾已刪除');
  };

  const handleAddManual = () => {
    const now = new Date().toISOString();
    const newC: ExploreContradiction = {
      id: `ec-${Date.now()}`,
      projectId,
      type: newType,
      improvingParam: null,
      worseningParam: null,
      pcAttributeA: null,
      pcAttributeNotA: null,
      description: '',
      status: 'draft',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    };
    onUpdateContradictions([...contradictions, newC]);
    setAddingNew(false);
    setEditingId(newC.id);
    setEditForm(newC);
  };

  const handleAiReidentify = async () => {
    setIsAiLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    // Mock: add a new AI-identified contradiction
    const now = new Date().toISOString();
    const newC: ExploreContradiction = {
      id: `ec-ai-${Date.now()}`,
      projectId,
      type: 'TC',
      improvingParam: 21,
      worseningParam: 37,
      pcAttributeA: null,
      pcAttributeNotA: null,
      description: 'AI 新識別：當提升系統自動化程度時，複雜度隨之增加，維護難度上升。',
      status: 'draft',
      source: 'ai',
      createdAt: now,
      updatedAt: now,
    };
    onUpdateContradictions([...contradictions, newC]);
    setIsAiLoading(false);
    toast.success('AI 已重新識別矛盾');
  };

  if (contradictions.length === 0 && !hasAnswers) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground font-medium">尚無矛盾</p>
        <p className="text-sm text-muted-foreground">請先完成索克拉底問答，AI 將自動識別矛盾</p>
        <Button variant="ghost" onClick={() => setAddingNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> 手動新增矛盾
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">矛盾識別 — 技術矛盾 (TC) 與物理矛盾 (PC)</h2>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-[#3B82F6] text-white text-xs">TC: {tcCount}</Badge>
          <Badge className="bg-[#F59E0B] text-white text-xs">PC: {pcCount}</Badge>
          <Badge variant="secondary" className="text-xs">總計: {contradictions.length}</Badge>
          <Badge className="bg-[#28a745] text-white text-xs">已確認: {confirmedCount}</Badge>
        </div>
      </div>

      {/* Contradiction cards */}
      <div className="space-y-4">
        {contradictions.map((c) => {
          const isEditing = editingId === c.id;
          const isConfirmed = c.status === 'confirmed';

          return (
            <Card
              key={c.id}
              className={`transition-colors ${isConfirmed ? 'border-l-[3px] border-l-[#28a745]' : ''}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Type badge + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className="text-xs text-white"
                    style={{ backgroundColor: c.type === 'TC' ? '#3B82F6' : '#F59E0B' }}
                  >
                    {c.type}
                  </Badge>
                  {c.source === 'ai' && !isConfirmed && (
                    <Badge variant="secondary" className="text-[10px]">AI</Badge>
                  )}
                  {isConfirmed && (
                    <Badge className="bg-[#28a745] text-white text-[10px]">已確認</Badge>
                  )}
                </div>

                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    {editForm.type === 'TC' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">改善參數 ★</span>
                          <Select
                            value={editForm.improvingParam?.toString() ?? ''}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, improvingParam: Number(v) }))}
                          >
                            <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                            <SelectContent>
                              {trizParameters.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  #{p.id} {p.nameZh}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">惡化參數 ★</span>
                          <Select
                            value={editForm.worseningParam?.toString() ?? ''}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, worseningParam: Number(v) }))}
                          >
                            <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                            <SelectContent>
                              {trizParameters.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  #{p.id} {p.nameZh}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">需要的屬性 A ★</span>
                          <Input
                            value={editForm.pcAttributeA ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, pcAttributeA: e.target.value }))}
                            placeholder="例：高轉速"
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">同時需要非 A ★</span>
                          <Input
                            value={editForm.pcAttributeNotA ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, pcAttributeNotA: e.target.value }))}
                            placeholder="例：低轉速"
                            maxLength={100}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">矛盾描述 ★</span>
                      <Textarea
                        value={editForm.description ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        maxLength={500}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>儲存</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm({}); }}>取消</Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    {c.type === 'TC' ? (
                      <div className="flex flex-wrap gap-2">
                        <div className="bg-muted rounded px-2 py-1 text-xs">
                          <span className="text-muted-foreground">改善: </span>
                          <span className="font-medium">{getParamLabel(c.improvingParam)}</span>
                        </div>
                        <span className="text-muted-foreground text-xs self-center">→</span>
                        <div className="bg-muted rounded px-2 py-1 text-xs">
                          <span className="text-muted-foreground">惡化: </span>
                          <span className="font-medium">{getParamLabel(c.worseningParam)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <div className="bg-muted rounded px-2 py-1 text-xs">
                          <span className="text-muted-foreground">需要: </span>
                          <span className="font-medium">{c.pcAttributeA}</span>
                        </div>
                        <span className="text-muted-foreground text-xs self-center">⟷</span>
                        <div className="bg-muted rounded px-2 py-1 text-xs">
                          <span className="text-muted-foreground">同時需要: </span>
                          <span className="font-medium">{c.pcAttributeNotA}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-sm">{c.description}</p>

                    {/* Actions */}
                    {!isConfirmed && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleConfirm(c.id)}>
                          <Check className="h-3 w-3 mr-1" /> 確認 ★
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit(c)}>
                          <Pencil className="h-3 w-3 mr-1" /> 編輯
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirmId(c.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> 刪除
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => setAddingNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> 手動新增矛盾
        </Button>
        <Button variant="secondary" onClick={handleAiReidentify} disabled={isAiLoading}>
          {isAiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          AI 重新識別
          <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
        </Button>
      </div>

      {/* Add new type selection dialog */}
      <Dialog open={addingNew} onOpenChange={setAddingNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選擇矛盾類型</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant={newType === 'TC' ? 'default' : 'outline'}
              onClick={() => setNewType('TC')}
              className="flex-1"
            >
              TC — 技術矛盾
            </Button>
            <Button
              variant={newType === 'PC' ? 'default' : 'outline'}
              onClick={() => setNewType('PC')}
              className="flex-1"
            >
              PC — 物理矛盾
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={handleAddManual}>建立</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              確定刪除此矛盾？
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">此操作不可復原。</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
