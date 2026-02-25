import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Plus, Sparkles, Loader2, Check,
  CheckCircle, XCircle, Flag, FileDown, FileJson, FileText,
  Trophy, Trash2, AlertTriangle
} from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList
} from "recharts";
import type {
  WantCriterion, WantScore, KtDecision, Signature, ActionItem, DecideGateItem, SignatureStatus
} from "@/types/decisionRecord";
import { DEFAULT_WANT_TEMPLATE } from "@/types/decisionRecord";
import {
  mockDecideAlternatives, mockWantCriteria, mockWantScores, mockKtDecision, mockSignatures
} from "@/data/mockDecisionRecord";

export default function DecisionRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const alternatives = mockDecideAlternatives;

  const [activeTab, setActiveTab] = useState("want");
  const [criteria, setCriteria] = useState<WantCriterion[]>(mockWantCriteria);
  const [scores, setScores] = useState<WantScore[]>(mockWantScores);
  const [decision, setDecision] = useState<KtDecision>({ ...mockKtDecision });
  const [signatures, setSignatures] = useState<Signature[]>([...mockSignatures]);
  const [exported, setExported] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // --- WANT helpers ---
  const calcWeightedTotal = useCallback((altScores: Record<string, number>) => {
    return criteria.reduce((sum, c) => sum + (altScores[c.id] || 0) * c.weight, 0);
  }, [criteria]);

  const rankedScores = useMemo(() => {
    const updated = scores.map(s => ({ ...s, weightedTotal: calcWeightedTotal(s.scores) }));
    return updated.sort((a, b) => b.weightedTotal - a.weightedTotal);
  }, [scores, calcWeightedTotal]);

  const topAlt = rankedScores[0];

  const updateScore = (altId: string, critId: string, value: number) => {
    setScores(prev => prev.map(s =>
      s.alternativeId === altId ? { ...s, scores: { ...s.scores, [critId]: Math.min(10, Math.max(1, value)) } } : s
    ));
  };

  const updateCriterion = (cId: string, field: keyof WantCriterion, value: string | number) => {
    setCriteria(prev => prev.map(c => c.id === cId ? { ...c, [field]: value } : c));
  };

  const addCriterion = () => {
    const newC: WantCriterion = { id: `w-${Date.now()}`, name: '', weight: 5, description: '' };
    setCriteria(prev => [...prev, newC]);
  };

  const removeCriterion = (cId: string) => {
    if (criteria.length <= 3) { toast.error("至少保留 3 項標準"); return; }
    setCriteria(prev => prev.filter(c => c.id !== cId));
  };

  const loadTemplate = () => {
    if (criteria.length > 0) {
      if (!confirm("將覆蓋現有條件，確定？")) return;
    }
    const templated = DEFAULT_WANT_TEMPLATE.map((t, i) => ({ ...t, id: `wt-${i}` }));
    setCriteria(templated);
    // init scores for new criteria
    setScores(prev => prev.map(s => ({
      ...s, scores: Object.fromEntries(templated.map(c => [c.id, s.scores[c.id] || 5]))
    })));
    toast.success("已載入標準模板 W1-W6");
  };

  // --- KT Decision helpers ---
  const updateDecision = (field: keyof KtDecision, value: string) => {
    setDecision(prev => ({ ...prev, [field]: value }));
  };

  const addAction = () => {
    const newA: ActionItem = { id: `act-${Date.now()}`, description: '', assignee: '', dueDate: '' };
    setDecision(prev => ({ ...prev, actionItems: [...prev.actionItems, newA] }));
  };

  const updateAction = (aId: string, field: keyof ActionItem, value: string) => {
    setDecision(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(a => a.id === aId ? { ...a, [field]: value } : a),
    }));
  };

  const removeAction = (aId: string) => {
    setDecision(prev => ({ ...prev, actionItems: prev.actionItems.filter(a => a.id !== aId) }));
  };

  const confirmDecision = () => {
    if (!decision.selectedAlternativeId) { toast.error("請選擇方案"); return; }
    if (decision.rationale.length < 20) { toast.error("決策理由至少 20 字元"); return; }
    if (decision.actionItems.length === 0) { toast.error("至少 1 項行動計畫"); return; }
    setConfirmModalOpen(true);
  };

  const doConfirm = () => {
    setDecision(prev => ({ ...prev, status: 'confirmed' }));
    setConfirmModalOpen(false);
    toast.success("決策已確認");
  };

  const revertDraft = () => {
    setDecision(prev => ({ ...prev, status: 'draft' }));
    toast.info("已恢復為草稿");
  };

  // --- Export helpers ---
  const handleExport = async (format: 'pdf' | 'json') => {
    setAiLoading(p => ({ ...p, [format]: true }));
    await new Promise(r => setTimeout(r, 1500));
    setAiLoading(p => ({ ...p, [format]: false }));
    setExported(true);
    toast.success(`${format.toUpperCase()} 已匯出`);
  };

  // --- Signature helpers ---
  const addSignature = () => {
    setSignatures(prev => [...prev, { name: '', role: 'RD 工程師', status: 'pending', signedAt: null, note: '' }]);
  };

  const updateSignature = (idx: number, field: keyof Signature, value: string) => {
    setSignatures(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const signSignature = (idx: number) => {
    setSignatures(prev => prev.map((s, i) =>
      i === idx ? { ...s, status: 'signed' as SignatureStatus, signedAt: new Date().toISOString() } : s
    ));
    toast.success("簽核完成");
  };

  const signedCount = signatures.filter(s => s.status === 'signed').length;
  const hasSigned = signedCount > 0;

  // --- AI mock ---
  const handleAiAction = async () => {
    setAiLoading(p => ({ ...p, action: true }));
    await new Promise(r => setTimeout(r, 1800));
    const newActions: ActionItem[] = [
      { id: `act-ai-1-${Date.now()}`, description: '完成磁力耦合器熱退磁驗證實驗', assignee: '李工程師', dueDate: '2026-03-15' },
      { id: `act-ai-2-${Date.now()}`, description: '建立碳纖維殼體疲勞測試計畫', assignee: '張工程師', dueDate: '2026-03-20' },
    ];
    setDecision(prev => ({ ...prev, actionItems: [...prev.actionItems, ...newActions] }));
    setAiLoading(p => ({ ...p, action: false }));
    toast.success("AI 已建議 2 項行動");
  };

  // --- Gates ---
  const allScored = scores.every(s => criteria.every(c => s.scores[c.id] && s.scores[c.id] >= 1));
  
  const gate32Items: DecideGateItem[] = useMemo(() => [
    { label: 'WANT 評分已完成', passed: allScored && criteria.length >= 3 },
    { label: '決策方案已選擇', passed: !!decision.selectedAlternativeId },
    { label: '決策理由已填寫 (≥20 字元)', passed: decision.rationale.length >= 20 },
    { label: '至少 1 項行動計畫', passed: decision.actionItems.length >= 1 },
  ], [allScored, criteria, decision]);

  const gate32Passed = gate32Items.every(i => i.passed);

  const phaseGate3Items: DecideGateItem[] = useMemo(() => [
    { label: 'Gate 3.2 已通過', passed: gate32Passed },
    { label: '決策已確認 (Confirmed)', passed: decision.status === 'confirmed' || decision.status === 'signed' },
    { label: '決策報告已匯出', passed: exported },
  ], [gate32Passed, decision.status, exported]);

  const phaseGate3Passed = phaseGate3Items.every(i => i.passed);

  const isLocked = decision.status === 'confirmed' || decision.status === 'signed';

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return <Badge className="bg-[#28a745] text-white text-xs">已確認</Badge>;
    if (status === 'signed') return <Badge className="bg-[#3B82F6] text-white text-xs">已簽核</Badge>;
    return <Badge variant="secondary" className="text-xs">草稿</Badge>;
  };

  // Bar chart data
  const chartData = rankedScores.map((s, i) => ({
    name: s.alternativeName.length > 12 ? s.alternativeName.slice(0, 12) + '...' : s.alternativeName,
    total: s.weightedTotal,
    isTop: i === 0,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Phase header */}
      <div className="h-1 w-full rounded-full bg-[#10B981]" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> 返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Decide — 最終決策
              <HelpTooltip text="此階段使用 WANT 加權評分選出最優方案，透過 KT 決策分析記錄決策理由與行動計畫，最後匯出報告並完成簽核。" className="ml-2 align-middle" />
            </h1>
            <p className="text-sm text-muted-foreground">Phase 3: Converge &gt; Step 3.2-3.3</p>
          </div>
        </div>
        {statusBadge(decision.status)}
      </div>

      {/* Purpose intro */}
      <SectionIntro text="先在 WANT 評分中為各方案打分（1-10 分 × 權重），系統自動排名；再於 KT 決策記錄中選定方案、填寫理由與行動計畫；最後匯出報告並完成團隊簽核。確認後仍可撤回修改。" />

      {/* 3 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="want" className="text-xs sm:text-sm">
            <Trophy className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> WANT 評分
          </TabsTrigger>
          <TabsTrigger value="kt" className="text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> KT 決策記錄
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs sm:text-sm">
            <FileDown className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> 匯出與簽核
          </TabsTrigger>
        </TabsList>

        {/* Tab A: WANT Scoring */}
        <TabsContent value="want" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <Button size="sm" variant="secondary" onClick={loadTemplate}>載入標準模板 (W1-W6)</Button>
            <Button size="sm" variant="ghost" onClick={addCriterion}><Plus className="h-3 w-3 mr-1" /> 新增標準</Button>
          </div>

          {criteria.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              尚無評分條件，點擊「載入標準模板」快速開始
            </CardContent></Card>
          ) : (
            <>
              {/* Desktop scoring table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground w-[160px]">條件 ★</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground w-16">權重 ★</th>
                      {alternatives.map(a => (
                        <th key={a.id} className="text-center py-2 px-2 text-xs text-muted-foreground min-w-[100px]">{a.name.length > 10 ? a.name.slice(0, 10) + '...' : a.name}</th>
                      ))}
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map(c => (
                      <tr key={c.id} className="border-b">
                        <td className="py-1.5 px-2">
                          <Input value={c.name} onChange={e => updateCriterion(c.id, 'name', e.target.value)} className="text-xs h-7" maxLength={80} />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <Input type="number" min={1} max={10} value={c.weight} onChange={e => updateCriterion(c.id, 'weight', parseInt(e.target.value) || 1)} className="text-xs h-7 w-14 text-center mx-auto" />
                        </td>
                        {alternatives.map(a => {
                          const sc = scores.find(s => s.alternativeId === a.id);
                          const raw = sc?.scores[c.id] || 0;
                          const weighted = raw * c.weight;
                          return (
                            <td key={a.id} className="py-1.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Input type="number" min={1} max={10} value={raw || ''} onChange={e => updateScore(a.id, c.id, parseInt(e.target.value) || 0)} className="text-xs h-7 w-12 text-center" />
                                <span className="text-[10px] text-muted-foreground">({weighted})</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeCriterion(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-muted/50 font-semibold border-t-2">
                      <td className="py-2 px-2 text-xs">加權總分</td>
                      <td></td>
                      {alternatives.map(a => {
                        const sc = rankedScores.find(s => s.alternativeId === a.id);
                        const isTop = sc?.alternativeId === topAlt?.alternativeId;
                        return (
                          <td key={a.id} className="py-2 px-2 text-center text-sm">
                            {sc?.weightedTotal || 0} {isTop && <span className="text-[#10B981]">★</span>}
                          </td>
                        );
                      })}
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {rankedScores.map((s, i) => (
                  <Card key={s.alternativeId} className={i === 0 ? 'border-l-[3px] border-l-[#10B981]' : ''}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.alternativeName}</span>
                        <Badge className={i === 0 ? 'bg-[#10B981] text-white' : ''} variant={i === 0 ? 'default' : 'secondary'}>{s.weightedTotal} 分</Badge>
                      </div>
                      {criteria.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{c.name} (×{c.weight})</span>
                          <Input type="number" min={1} max={10} value={s.scores[c.id] || ''} onChange={e => updateScore(s.alternativeId, c.id, parseInt(e.target.value) || 0)} className="w-14 h-6 text-xs text-center" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bar chart */}
              {rankedScores.some(s => s.weightedTotal > 0) && (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="total" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={d.isTop ? '#10B981' : '#D1D5DB'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {topAlt && topAlt.weightedTotal > 0 && (
                <div className="bg-[#ECFDF5] border border-[#10B981]/30 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#10B981] shrink-0" />
                  <span>推薦方案：<span className="font-semibold">{topAlt.alternativeName}</span> (總分: {topAlt.weightedTotal})</span>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab B: KT Decision Record */}
        <TabsContent value="kt" className="space-y-4 mt-4">
          {/* 選擇 */}
          <Card className="border-t-[4px] border-t-[#10B981]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">選擇</h3>
              <div className="space-y-2">
                <Label>選定方案 ★</Label>
                <Select value={decision.selectedAlternativeId} onValueChange={v => {
                  const alt = alternatives.find(a => a.id === v);
                  setDecision(prev => ({ ...prev, selectedAlternativeId: v, selectedAlternativeName: alt?.name || '' }));
                }} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="選擇方案" /></SelectTrigger>
                  <SelectContent>
                    {rankedScores.map((s, i) => (
                      <SelectItem key={s.alternativeId} value={s.alternativeId}>
                        {s.alternativeName} ({s.weightedTotal} 分) {i === 0 ? '★' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>決策日期 ★</Label>
                <Input type="date" value={decision.decisionDate} onChange={e => updateDecision('decisionDate', e.target.value)} disabled={isLocked} className="w-40" />
              </div>
            </CardContent>
          </Card>

          {/* 理由 */}
          <Card className="border-t-[4px] border-t-[#10B981]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">理由</h3>
              <div className="space-y-2">
                <Label>選擇理由 ★ <span className="text-xs text-muted-foreground">(至少 20 字元)</span></Label>
                <Textarea value={decision.rationale} onChange={e => updateDecision('rationale', e.target.value)}
                  disabled={isLocked} rows={4} maxLength={2000} placeholder="闡述選擇該方案的理由..." />
                <p className="text-[10px] text-muted-foreground text-right">{decision.rationale.length}/2000</p>
              </div>
            </CardContent>
          </Card>

          {/* 行動 */}
          <Card className="border-t-[4px] border-t-[#10B981]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">行動</h3>
              {decision.actionItems.length === 0 && (
                <p className="text-sm text-muted-foreground">尚無行動計畫</p>
              )}
              {decision.actionItems.map(a => (
                <div key={a.id} className="flex gap-2 items-start border rounded-lg p-2">
                  <div className="flex-1 space-y-1.5">
                    <Input placeholder="行動描述 ★" value={a.description} onChange={e => updateAction(a.id, 'description', e.target.value)} disabled={isLocked} className="text-xs h-7" maxLength={300} />
                    <div className="flex gap-2">
                      <Input placeholder="負責人 ★" value={a.assignee} onChange={e => updateAction(a.id, 'assignee', e.target.value)} disabled={isLocked} className="text-xs h-7 flex-1" maxLength={50} />
                      <Input type="date" value={a.dueDate} onChange={e => updateAction(a.id, 'dueDate', e.target.value)} disabled={isLocked} className="text-xs h-7 w-36" />
                    </div>
                  </div>
                  {!isLocked && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => removeAction(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {!isLocked && (
                <div className="flex gap-3">
                  <Button size="sm" variant="ghost" onClick={addAction}><Plus className="h-3 w-3 mr-1" /> 新增行動</Button>
                  <Button size="sm" variant="secondary" onClick={handleAiAction} disabled={aiLoading.action}>
                    {aiLoading.action ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    AI 建議行動 <Badge variant="secondary" className="text-[9px] ml-1">AI</Badge>
                  </Button>
                </div>
              )}

              <Separator />
              <div className="space-y-2">
                <Label>風險接受聲明 ★ <span className="text-xs text-muted-foreground">(至少 10 字元)</span></Label>
                <Textarea value={decision.riskAcceptance} onChange={e => updateDecision('riskAcceptance', e.target.value)}
                  disabled={isLocked} rows={3} maxLength={1000} placeholder="確認已識別風險及其緩解措施..." />
              </div>
            </CardContent>
          </Card>

          {/* Confirm / Revert */}
          <div className="flex gap-3">
            {!isLocked ? (
              <Button onClick={confirmDecision} className="bg-[#10B981] hover:bg-[#059669] text-white">
                <Check className="h-4 w-4 mr-1" /> 確認決策
              </Button>
            ) : (
              <Button variant="outline" onClick={revertDraft}>回到草稿</Button>
            )}
          </div>
        </TabsContent>

        {/* Tab C: Export & Sign */}
        <TabsContent value="export" className="space-y-4 mt-4">
          {/* Export buttons */}
          <div className="flex flex-wrap gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span><Button onClick={() => handleExport('pdf')} disabled={!isLocked || aiLoading.pdf}>
                  {aiLoading.pdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                  匯出 PDF
                </Button></span>
              </TooltipTrigger>
              {!isLocked && <TooltipContent><p>請先確認決策</p></TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span><Button variant="secondary" onClick={() => handleExport('json')} disabled={!isLocked || aiLoading.json}>
                  {aiLoading.json ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileJson className="h-4 w-4 mr-1" />}
                  匯出 JSON
                </Button></span>
              </TooltipTrigger>
              {!isLocked && <TooltipContent><p>請先確認決策</p></TooltipContent>}
            </Tooltip>
          </div>

          {exported && (
            <div className="bg-[#D1FAE5] border border-[#28a745]/30 rounded-lg p-3 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#28a745]" /> 報告已匯出
            </div>
          )}

          <Separator />

          {/* Signatures */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">審查人簽核</h3>
            {signatures.length === 0 && (
              <p className="text-sm text-muted-foreground">尚無簽核人</p>
            )}
            {signatures.map((s, idx) => (
              <Card key={idx}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="姓名 ★" value={s.name} onChange={e => updateSignature(idx, 'name', e.target.value)}
                      disabled={s.status === 'signed'} className="text-xs h-7 flex-1" maxLength={50} />
                    <Select value={s.role} onValueChange={v => updateSignature(idx, 'role', v)} disabled={s.status === 'signed'}>
                      <SelectTrigger className="text-xs h-7 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['RD 工程師', 'RD 主管', 'PM', '品質工程師', '其他'].map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    {s.status === 'signed' ? (
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-[#28a745] text-white text-[10px]"><Check className="h-3 w-3 mr-0.5" /> 已簽核</Badge>
                        <span className="text-[10px] text-muted-foreground">{s.signedAt ? new Date(s.signedAt).toLocaleDateString('zh-TW') : ''}</span>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => signSignature(idx)}
                        disabled={!s.name || s.name.length < 2}>簽核</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button size="sm" variant="ghost" onClick={addSignature}><Plus className="h-3 w-3 mr-1" /> 新增簽核人</Button>
            {signatures.length > 0 && (
              <p className="text-xs text-muted-foreground">{signedCount}/{signatures.length} 已簽核</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Gate 3.2 */}
      <Separator />
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-[#10B981]" />
          <h3 className="text-sm font-semibold">Gate 3.2 — 決策記錄完整性檢查</h3>
          <Badge className={`text-xs text-white ${gate32Passed ? 'bg-[#28a745]' : 'bg-[#dc3545]'}`}>
            {gate32Passed ? 'Gate 3.2 Passed' : 'Gate 3.2 未通過'}
          </Badge>
        </div>
        <div className="space-y-2">
          {gate32Items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.passed ? <CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Gate 3 */}
      <div className="rounded-lg border-2 border-[#10B981] bg-[#ECFDF5] p-4 space-y-3" style={{ borderStyle: 'double' }}>
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 text-[#10B981] shrink-0" />
          <h3 className="text-sm font-semibold">Phase Gate 3 — Converge 階段完成檢查</h3>
          <Badge className={`text-xs text-white ${phaseGate3Passed ? 'bg-[#28a745]' : 'bg-[#dc3545]'}`}>
            {phaseGate3Passed ? 'Phase 3 Passed — 專案完成 ★' : 'Phase 3 未通過'}
          </Badge>
        </div>
        <div className="space-y-2">
          {phaseGate3Items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.passed ? <CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
        {phaseGate3Passed ? (
          <Button onClick={() => { toast.success("🎉 專案已完成！"); navigate(`/projects/${id}`); }}
            className="bg-[#10B981] hover:bg-[#059669] text-white text-base px-6 py-2">
            🏁 Phase Gate 3 通過 → 專案完成 <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block"><Button disabled className="opacity-50">專案完成 → <ArrowRight className="h-4 w-4 ml-1" /></Button></span>
            </TooltipTrigger>
            <TooltipContent><p>請完成所有條件</p></TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Confirm Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>確認決策</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確認後決策記錄將鎖定，是否繼續？</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>取消</Button>
            <Button onClick={doConfirm} className="bg-[#10B981] hover:bg-[#059669] text-white">確認</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
