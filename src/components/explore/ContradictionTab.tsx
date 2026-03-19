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
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, Plus, Sparkles, Loader2, AlertTriangle, Undo2 } from "lucide-react";
import { trizParameters } from "@/data/trizParameters";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/api/useQueryConfig";
import { contradictionFormalize } from "@/lib/api";
import type { ExploreContradiction, ContradictionType } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";

interface ContradictionTabProps {
  contradictions: ExploreContradiction[];
  onUpdateContradictions: (contradictions: ExploreContradiction[]) => void;
  hasAnswers: boolean;
  projectId: string;
  mission?: string;
  constraints?: string[];
  kpis?: string[];
}

export function ContradictionTab({ contradictions, onUpdateContradictions, hasAnswers, projectId, mission, constraints, kpis }: ContradictionTabProps) {
  const qc = useQueryClient();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExploreContradiction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newType, setNewType] = useState<ContradictionType>('TC');
  const [revertConfirmId, setRevertConfirmId] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(projectId) });

  const tcCount = contradictions.filter((c) => c.type === 'TC').length;
  const pcCount = contradictions.filter((c) => c.type === 'PC').length;
  const confirmedCount = contradictions.filter((c) => c.status === 'confirmed').length;

  const getParamLabel = (paramId: number | null) => {
    if (!paramId) return '—';
    const p = trizParameters.find((t) => t.id === paramId);
    return p ? `#${p.id} ${p.nameZh}` : '—';
  };

  const handleConfirm = async (id: string) => {
    const { error } = await supabase
      .from('contradictions')
      .update({ resolved: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(`確認失敗：${error.message}`); return; }
    invalidate();
    toast.success('矛盾已確認');
  };

  const handleRevertToDraft = async (id: string) => {
    const { error } = await supabase
      .from('contradictions')
      .update({ resolved: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(`撤回失敗：${error.message}`); return; }
    setRevertConfirmId(null);
    invalidate();
    toast.info('已恢復為草稿狀態');
  };

  const handleStartEdit = (c: ExploreContradiction) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (editForm.description !== undefined) updateData.natural_description = editForm.description;
    if (editForm.improvingParam !== undefined) updateData.improving_param = editForm.improvingParam;
    if (editForm.worseningParam !== undefined) updateData.worsening_param = editForm.worseningParam;
    if (editForm.type !== undefined) updateData.type = editForm.type;
    // PC attributes stored in physical_contradiction as "A | notA"
    if (editForm.pcAttributeA !== undefined || editForm.pcAttributeNotA !== undefined) {
      updateData.physical_contradiction = `${editForm.pcAttributeA ?? ''} | ${editForm.pcAttributeNotA ?? ''}`;
    }

    const { error } = await supabase
      .from('contradictions')
      .update(updateData)
      .eq('id', editingId);
    if (error) { toast.error(`更新失敗：${error.message}`); return; }
    setEditingId(null);
    setEditForm({});
    invalidate();
    toast.success('矛盾已更新');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('contradictions')
      .delete()
      .eq('id', id);
    if (error) { toast.error(`刪除失敗：${error.message}`); return; }
    setDeleteConfirmId(null);
    invalidate();
    toast.success('矛盾已刪除');
  };

  const handleAddManual = async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('contradictions')
      .insert({
        project_id: projectId,
        type: newType,
        natural_description: '',
        severity: 'minor',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) { toast.error(`新增失敗：${error.message}`); return; }
    setAddingNew(false);
    invalidate();
    // Enter edit mode for the new contradiction
    setEditingId(data.id);
    setEditForm({
      id: data.id,
      projectId,
      type: newType,
      improvingParam: null,
      worseningParam: null,
      pcAttributeA: null,
      pcAttributeNotA: null,
      description: '',
      status: 'draft' as const,
      source: 'manual' as const,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleAiReidentify = async () => {
    setIsAiLoading(true);
    try {
      // Collect unformalized contradictions (have description but no TRIZ params)
      const targets = contradictions.filter(
        (c) => c.description && !c.improvingParam && !c.worseningParam
      );

      if (targets.length > 0) {
        // Formalize existing contradictions via AI
        let count = 0;
        for (const c of targets) {
          try {
            const result = await contradictionFormalize({
              project_id: projectId,
              contradiction_id: c.id,
              natural_description: c.description,
              mission,
              constraints,
              kpis,
            });
            await supabase
              .from('contradictions')
              .update({
                type: result.type,
                improving_param: result.improving_param,
                worsening_param: result.worsening_param,
                engineering_statement: result.engineering_statement,
                physical_contradiction: result.physical_contradiction,
                updated_at: new Date().toISOString(),
              })
              .eq('id', c.id);
            count++;
          } catch {
            // Continue with next contradiction
          }
        }
        invalidate();
        toast.success(`AI 已形式化 ${count} 個矛盾`);
      } else {
        // No existing unformalized contradictions — create a new one via AI
        const desc = mission
          ? `Based on mission "${mission}", identify a key technical or physical contradiction.`
          : 'Identify a key design contradiction from the project context.';

        // Insert a draft contradiction first
        const now = new Date().toISOString();
        const { data: draft, error: insertErr } = await supabase
          .from('contradictions')
          .insert({
            project_id: projectId,
            natural_description: desc,
            severity: 'minor',
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;

        // Call AI formalize
        const result = await contradictionFormalize({
          project_id: projectId,
          contradiction_id: draft.id,
          natural_description: desc,
          mission,
          constraints,
          kpis,
        });

        // Update with AI results
        await supabase
          .from('contradictions')
          .update({
            type: result.type,
            improving_param: result.improving_param,
            worsening_param: result.worsening_param,
            engineering_statement: result.engineering_statement,
            physical_contradiction: result.physical_contradiction,
            natural_description: result.engineering_statement || desc,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id);

        invalidate();
        toast.success('AI 已識別新矛盾');
      }
    } catch (err) {
      console.error('AI re-identify failed:', err);
      toast.error('AI 識別失敗，請稍後重試');
    } finally {
      setIsAiLoading(false);
    }
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
      {/* Purpose intro */}
      <SectionIntro text="根據問答結果，AI 會自動識別設計中的技術矛盾 (TC) 與物理矛盾 (PC)。TC 表示改善一個參數會惡化另一個參數；PC 表示同一物件需要同時具備矛盾的屬性。確認矛盾後仍可撤回修改。" />

      {/* Header + stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">矛盾識別 — 技術矛盾 (TC) 與物理矛盾 (PC)</h2>
          <HelpTooltip text="TC（技術矛盾）：改善參數 A 會惡化參數 B，可用 TRIZ 矛盾矩陣解法。PC（物理矛盾）：同一物件需要同時滿足相反屬性，可用分離原理解法。" />
        </div>
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
                    <div className="flex gap-2">
                      {!isConfirmed ? (
                        <>
                          <Button size="sm" onClick={() => handleConfirm(c.id)}>
                            <Check className="h-3 w-3 mr-1" /> 確認 ★
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(c)}>
                            <Pencil className="h-3 w-3 mr-1" /> 編輯
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirmId(c.id)}>
                            <Trash2 className="h-3 w-3 mr-1" /> 刪除
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setRevertConfirmId(c.id)}>
                            <Undo2 className="h-3 w-3 mr-1" /> 撤回確認
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(c)}>
                            <Pencil className="h-3 w-3 mr-1" /> 編輯
                          </Button>
                        </>
                      )}
                    </div>
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

      {/* Revert confirmation */}
      <Dialog open={!!revertConfirmId} onOpenChange={() => setRevertConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-muted-foreground" />
              確定要撤回確認？
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">此矛盾將恢復為草稿狀態，您可以重新編輯後再次確認。</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevertConfirmId(null)}>取消</Button>
            <Button variant="outline" onClick={() => revertConfirmId && handleRevertToDraft(revertConfirmId)}>撤回確認</Button>
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
