import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, Plus, AlertTriangle, Undo2 } from "lucide-react";
import { AiButton } from "@/components/ui/ai-button";
import { trizParameters } from "@/data/trizParameters";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/api/useQueryConfig";
import { contradictionFormalize } from "@/lib/api";
import { DEFAULT_SEVERITY } from "@/types/contradiction";
import type { ExploreContradiction, ContradictionType } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import { useAiOperationGuard } from "@/hooks/useAiOperationGuard";

interface ContradictionTabProps {
  contradictions: ExploreContradiction[];
  onUpdateContradictions: (contradictions: ExploreContradiction[]) => void;
  hasAnswers: boolean;
  projectId: string;
  mission?: string;
  constraints?: string[];
  kpis?: string[];
  socraticAnswers?: string[];
}

export function ContradictionTab({ contradictions, onUpdateContradictions, hasAnswers, projectId, mission, constraints, kpis, socraticAnswers }: ContradictionTabProps) {
  const qc = useQueryClient();
  const [aiLoadingType, setAiLoadingType] = useState<ContradictionType | null>(null);
  const { runGuarded, isMountedRef } = useAiOperationGuard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExploreContradiction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<ContradictionType | null>(null);
  const [revertConfirmId, setRevertConfirmId] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(projectId) });

  const tcList = contradictions.filter((c) => c.type === 'TC');
  const pcList = contradictions.filter((c) => c.type === 'PC');
  const sfList = contradictions.filter((c) => c.type === 'SF');
  const confirmedCount = contradictions.filter((c) => c.status === 'confirmed').length;

  const getParamLabel = (paramId: number | null) => {
    if (!paramId) return '—';
    const p = trizParameters.find((t) => t.id === paramId);
    return p ? `#${p.id} ${p.nameZh}` : '—';
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────

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
    if (editForm.pcAttributeA !== undefined || editForm.pcAttributeNotA !== undefined) {
      updateData.physical_contradiction = `${editForm.pcAttributeA ?? ''} | ${editForm.pcAttributeNotA ?? ''}`;
    }
    // Su-Field fields
    if (editForm.sfSubstance1 !== undefined) updateData.sf_substance_1 = editForm.sfSubstance1;
    if (editForm.sfSubstance2 !== undefined) updateData.sf_substance_2 = editForm.sfSubstance2;
    if (editForm.sfField !== undefined) updateData.sf_field = editForm.sfField;
    if (editForm.sfInteraction !== undefined) updateData.sf_interaction = editForm.sfInteraction;
    if (editForm.sfCompleteness !== undefined) updateData.sf_completeness = editForm.sfCompleteness;

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
    // Delete dependent triz_solutions first to avoid FK constraint violation
    const { error: trizErr } = await supabase
      .from('triz_solutions')
      .delete()
      .eq('contradiction_id', id);
    if (trizErr) { toast.error(`刪除關聯 TRIZ 解法失敗：${trizErr.message}`); return; }

    const { error } = await supabase
      .from('contradictions')
      .delete()
      .eq('id', id);
    if (error) { toast.error(`刪除失敗：${error.message}`); return; }
    setDeleteConfirmId(null);
    invalidate();
    toast.success('矛盾及關聯 TRIZ 解法已刪除');
  };

  const handleAddManual = async (type: ContradictionType) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('contradictions')
      .insert({
        project_id: projectId,
        type,
        natural_description: '',
        severity: DEFAULT_SEVERITY,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) { toast.error(`新增失敗：${error.message}`); return; }
    setAddingType(null);
    invalidate();
    setEditingId(data.id);
    setEditForm({
      id: data.id, projectId, type,
      improvingParam: null, worseningParam: null,
      pcAttributeA: null, pcAttributeNotA: null,
      sfSubstance1: null, sfSubstance2: null, sfField: null,
      sfInteraction: null, sfCompleteness: null,
      description: '', status: 'draft' as const,
      source: 'manual' as const,
      createdAt: now, updatedAt: now,
    });
  };

  // ── AI re-identify (per type) ─────────────────────────────────────────

  const handleAiReidentify = (type: ContradictionType) => {
    setAiLoadingType(type);
    runGuarded(async () => {
    try {
      const subset = contradictions.filter((c) => c.type === type);
      const targets = subset.filter(
        (c) => c.description && !c.improvingParam && !c.worseningParam && !c.pcAttributeA && !c.sfSubstance1
      );

      if (targets.length > 0) {
        let count = 0;
        for (const c of targets) {
          try {
            const result = await contradictionFormalize({
              project_id: projectId,
              contradiction_id: c.id,
              natural_description: c.description,
              mission, constraints, kpis, socraticAnswers,
            });
            await supabase
              .from('contradictions')
              .update({
                type: result.type,
                improving_param: result.improving_param,
                worsening_param: result.worsening_param,
                engineering_statement: result.engineering_statement,
                physical_contradiction: result.pc_attribute_a && result.pc_attribute_not_a
                  ? `${result.pc_attribute_a} | ${result.pc_attribute_not_a}`
                  : result.physical_contradiction,
                sf_substance_1: result.sf_substance_1,
                sf_substance_2: result.sf_substance_2,
                sf_field: result.sf_field,
                sf_interaction: result.sf_interaction,
                sf_completeness: result.sf_completeness,
                updated_at: new Date().toISOString(),
              })
              .eq('id', c.id);
            count++;
          } catch { /* continue */ }
        }
        invalidate();
        toast.success(`AI 已形式化 ${count} 個 ${type} 矛盾`);
      } else {
        // Create new contradiction of this specific type
        const typeLabel = type === 'TC' ? 'technical' : type === 'PC' ? 'physical' : 'su-field';
        const desc = mission
          ? `Based on mission "${mission}", identify a key ${typeLabel} contradiction.`
          : `Identify a key ${typeLabel} design contradiction from the project context.`;

        const now = new Date().toISOString();
        const { data: draft, error: insertErr } = await supabase
          .from('contradictions')
          .insert({
            project_id: projectId,
            type,
            natural_description: desc,
            severity: DEFAULT_SEVERITY,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;

        const result = await contradictionFormalize({
          project_id: projectId,
          contradiction_id: draft.id,
          natural_description: desc,
          mission, constraints, kpis, socraticAnswers,
        });

        await supabase
          .from('contradictions')
          .update({
            type: result.type,
            improving_param: result.improving_param,
            worsening_param: result.worsening_param,
            engineering_statement: result.engineering_statement,
            physical_contradiction: result.physical_contradiction,
            sf_substance_1: result.sf_substance_1,
            sf_substance_2: result.sf_substance_2,
            sf_field: result.sf_field,
            sf_interaction: result.sf_interaction,
            sf_completeness: result.sf_completeness,
            natural_description: result.engineering_statement || desc,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id);

        invalidate();
        toast.success(`AI 已識別新 ${type} 矛盾`);
      }
    } catch (err) {
      console.error('AI re-identify failed:', err);
      toast.error('AI 識別失敗，請稍後重試');
    } finally {
      if (isMountedRef.current) setAiLoadingType(null);
    }
    }, '矛盾 AI 識別');
  };

  // ── Render a single contradiction card ────────────────────────────────

  const renderCard = (c: ExploreContradiction) => {
    const isEditing = editingId === c.id;
    const isConfirmed = c.status === 'confirmed';

    return (
      <Card
        key={c.id}
        className={`transition-colors ${isConfirmed ? 'border-l-[3px] border-l-green-600' : ''}`}
      >
        <CardContent className="p-4 space-y-3">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className="text-xs text-white"
              style={{ backgroundColor: c.type === 'TC' ? '#3B82F6' : c.type === 'SF' ? '#10B981' : '#F59E0B' }}
            >
              {c.type}
            </Badge>
            {c.source === 'ai' && !isConfirmed && (
              <Badge variant="secondary" className="text-[10px]">AI</Badge>
            )}
            {isConfirmed && (
              <Badge className="bg-green-600 text-white text-[10px]">已確認</Badge>
            )}
          </div>

          {isEditing ? (
            /* Edit mode */
            <div className="space-y-3">
              {editForm.type === 'TC' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">改善參數 *</span>
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
                    <span className="text-xs text-muted-foreground">惡化參數 *</span>
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
              ) : editForm.type === 'SF' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">S1 工具物質 *</span>
                      <Input
                        value={editForm.sfSubstance1 ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, sfSubstance1: e.target.value }))}
                        placeholder="例：軸承"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">S2 產品物質 *</span>
                      <Input
                        value={editForm.sfSubstance2 ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, sfSubstance2: e.target.value }))}
                        placeholder="例：轉子"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">場 (Field) *</span>
                      <Input
                        value={editForm.sfField ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, sfField: e.target.value }))}
                        placeholder="例：機械場"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">交互作用</span>
                      <Select
                        value={editForm.sfInteraction ?? ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, sfInteraction: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="useful">有用 (useful)</SelectItem>
                          <SelectItem value="harmful">有害 (harmful)</SelectItem>
                          <SelectItem value="insufficient">不足 (insufficient)</SelectItem>
                          <SelectItem value="missing">缺失 (missing)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Su-Field 完整性</span>
                      <Select
                        value={editForm.sfCompleteness ?? ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, sfCompleteness: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complete">完整 (complete)</SelectItem>
                          <SelectItem value="incomplete">不完整 (incomplete)</SelectItem>
                          <SelectItem value="harmful_complete">有害完整 (harmful)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">需要的屬性 A *</span>
                    <Input
                      value={editForm.pcAttributeA ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, pcAttributeA: e.target.value }))}
                      placeholder="例：高轉速"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">同時需要非 A *</span>
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
                <span className="text-xs text-muted-foreground">矛盾描述 *</span>
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
              {/* Statement — shared by TC and PC */}
              <p className="text-sm">{c.description}</p>

              {/* Type-specific parameters */}
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
              ) : c.type === 'SF' ? (
                c.sfSubstance1 ? (
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-muted rounded px-2 py-1 text-xs">
                      <span className="text-muted-foreground">S1: </span>
                      <span className="font-medium">{c.sfSubstance1}</span>
                    </div>
                    <span className="text-muted-foreground text-xs self-center">⟶</span>
                    <div className="bg-muted rounded px-2 py-1 text-xs">
                      <span className="text-muted-foreground">F: </span>
                      <span className="font-medium">{c.sfField || '—'}</span>
                    </div>
                    <span className="text-muted-foreground text-xs self-center">⟶</span>
                    <div className="bg-muted rounded px-2 py-1 text-xs">
                      <span className="text-muted-foreground">S2: </span>
                      <span className="font-medium">{c.sfSubstance2 || '—'}</span>
                    </div>
                    {c.sfInteraction && (
                      <Badge variant="outline" className="text-[10px]">{c.sfInteraction}</Badge>
                    )}
                    {c.sfCompleteness && (
                      <Badge variant="outline" className="text-[10px]">{c.sfCompleteness}</Badge>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted rounded px-2 py-1 text-xs text-muted-foreground">
                    Su-Field 模型細節待補充 — 點擊上方「識別 SF」自動填入，或手動編輯 S1/F/S2
                  </div>
                )
              ) : c.pcAttributeA && c.pcAttributeNotA ? (
                /* Structured PC: user-defined A / non-A pair */
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
              ) : c.pcAttributeA ? (
                /* AI-generated PC: single descriptive text */
                <div className="bg-muted rounded p-2 text-xs">
                  <span className="text-muted-foreground">物理矛盾: </span>
                  <span className="font-medium">{c.pcAttributeA}</span>
                </div>
              ) : (
                <div className="bg-muted rounded px-2 py-1 text-xs text-muted-foreground">
                  物理矛盾細節待補充 — 點擊上方「識別 PC」自動填入，或手動編輯
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!isConfirmed ? (
                  <>
                    <Button size="sm" onClick={() => handleConfirm(c.id)}>
                      <Check className="h-3 w-3 mr-1" /> 確認 *
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
  };

  // ── Render a type section (TC or PC) ──────────────────────────────────

  const renderSection = (type: ContradictionType, list: ExploreContradiction[]) => {
    const color = type === 'TC' ? '#3B82F6' : type === 'SF' ? '#10B981' : '#F59E0B';
    const label = type === 'TC' ? '技術矛盾 (TC)' : type === 'SF' ? 'Su-Field 問題 (SF)' : '物理矛盾 (PC)';
    const help = type === 'TC'
      ? 'TC（技術矛盾）：改善參數 A 會惡化參數 B，Step 5a 路徑 → 矛盾矩陣 → 40 原理。'
      : type === 'SF'
      ? 'SF（Su-Field 問題）：物質-場交互作用不完整/有害/不足，Step 5a 路徑 → 76 標準解。'
      : 'PC（物理矛盾）：同一物件需要同時滿足相反屬性，Step 5a 路徑 → 分離原則。';
    const isLoading = aiLoadingType === type;
    const confirmed = list.filter((c) => c.status === 'confirmed').length;

    return (
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-base font-semibold">{label}</h3>
            <HelpTooltip text={help} />
            <Badge className="text-white text-[10px]" style={{ backgroundColor: color }}>{list.length}</Badge>
            {confirmed > 0 && (
              <Badge className="bg-green-600 text-white text-[10px]">已確認 {confirmed}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAddingType(type)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> 新增
            </Button>
            <AiButton size="sm" loading={isLoading} onClick={() => handleAiReidentify(type)}>
              識別 {type}
            </AiButton>
          </div>
        </div>

        {/* Cards */}
        {list.length > 0 ? (
          <div className="space-y-3">
            {list.map(renderCard)}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              尚無{type === 'TC' ? '技術矛盾' : type === 'SF' ? 'Su-Field 問題' : '物理矛盾'} — 點擊「AI 識別 {type}」讓 AI 分析，或手動新增
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────

  if (contradictions.length === 0 && !hasAnswers) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground font-medium">尚無矛盾</p>
        <p className="text-sm text-muted-foreground">請先完成索克拉底問答，AI 將自動識別矛盾</p>
        <div className="flex justify-center gap-3">
          <Button variant="ghost" onClick={() => setAddingType('TC')}>
            <Plus className="h-4 w-4 mr-1" /> 新增 TC
          </Button>
          <Button variant="ghost" onClick={() => setAddingType('PC')}>
            <Plus className="h-4 w-4 mr-1" /> 新增 PC
          </Button>
          <Button variant="ghost" onClick={() => setAddingType('SF')}>
            <Plus className="h-4 w-4 mr-1" /> 新增 SF
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Purpose intro */}
      <SectionIntro text="根據問答結果，AI 會自動識別三種問題類型：技術矛盾 (TC) — 改善一個參數會惡化另一個；物理矛盾 (PC) — 同一物件需要同時具備矛盾屬性；Su-Field 問題 (SF) — 物質-場交互作用不完整/有害/不足。每種類型在 Step 5a 走各自對應的解法路徑。" />

      {/* Summary stats */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-blue-500 text-white text-xs">TC: {tcList.length}</Badge>
        <Badge className="bg-amber-500 text-white text-xs">PC: {pcList.length}</Badge>
        <Badge className="bg-emerald-500 text-white text-xs">SF: {sfList.length}</Badge>
        <Badge variant="secondary" className="text-xs">總計: {contradictions.length}</Badge>
        <Badge className="bg-green-600 text-white text-xs">已確認: {confirmedCount}</Badge>
      </div>

      {/* TC Section */}
      {renderSection('TC', tcList)}

      {/* Divider */}
      <div className="border-t" />

      {/* PC Section */}
      {renderSection('PC', pcList)}

      {/* Divider */}
      <div className="border-t" />

      {/* SF Section */}
      {renderSection('SF', sfList)}

      {/* Add new — direct type (no type selection dialog needed) */}
      <Dialog open={!!addingType} onOpenChange={() => setAddingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增{addingType === 'TC' ? '技術矛盾' : addingType === 'SF' ? 'Su-Field 問題' : '物理矛盾'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {addingType === 'TC'
              ? '技術矛盾 (TC)：改善一個參數會導致另一個參數惡化。建立後可編輯改善/惡化參數。Step 5a → 矛盾矩陣 → 40 原理。'
              : addingType === 'SF'
              ? 'Su-Field 問題 (SF)：物質-場交互作用不完整、有害或不足。建立後可編輯 S1/S2/F。Step 5a → 76 標準解。'
              : '物理矛盾 (PC)：同一屬性需要同時滿足相反需求。建立後可編輯屬性 A / 非 A。Step 5a → 分離原則。'}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingType(null)}>取消</Button>
            <Button onClick={() => addingType && handleAddManual(addingType)}>建立</Button>
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
