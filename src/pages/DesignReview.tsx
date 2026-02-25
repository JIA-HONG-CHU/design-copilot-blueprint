import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Plus, Sparkles, Loader2, AlertTriangle,
  CheckCircle, XCircle, Flag, Beaker, ShieldAlert, BarChart3
} from "lucide-react";
import type {
  EvidenceLevel, EvidenceMatrixRow, RiskItem, Experiment, ExperimentStatus, Gate31Item
} from "@/types/designReview";
import { EVIDENCE_LEVELS, getRiskScore, getRiskLevel, getRiskColor, EXP_STATUS_COLOR } from "@/types/designReview";
import { mockEvidenceMatrix, mockRisks, mockExperiments } from "@/data/mockDesignReview";

export default function DesignReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("evidence");
  const [evidenceRows, setEvidenceRows] = useState<EvidenceMatrixRow[]>(mockEvidenceMatrix[id ?? ""] ?? []);
  const [risks, setRisks] = useState<RiskItem[]>(mockRisks[id ?? ""] ?? []);
  const [experiments, setExperiments] = useState<Experiment[]>(mockExperiments[id ?? ""] ?? []);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experiment | null>(null);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // --- Evidence Matrix helpers ---
  const gapCount = useMemo(() => evidenceRows.filter(r => r.currentLevel === 'E0' || r.currentLevel === 'E1').length, [evidenceRows]);
  const hasGap = gapCount > 0;

  const levelIndex = (l: EvidenceLevel) => EVIDENCE_LEVELS.findIndex(e => e.value === l);

  // --- Risk helpers ---
  const addRisk = () => {
    const newR: RiskItem = {
      id: `R-${String(risks.length + 1).padStart(3, '0')}`,
      description: '', failureMode: '', probability: 1, severity: 1, mitigation: '',
    };
    setRisks(prev => [...prev, newR]);
  };

  const updateRisk = (rId: string, field: keyof RiskItem, value: string | number) => {
    setRisks(prev => prev.map(r => r.id === rId ? { ...r, [field]: value } : r));
  };

  const highRisksWithoutMitigation = useMemo(() =>
    risks.filter(r => {
      const level = getRiskLevel(getRiskScore(r));
      return (level === 'H' || level === 'H*') && !r.mitigation.trim();
    }).length
  , [risks]);

  // --- Experiment helpers ---
  const openNewExp = () => {
    setEditingExp({
      id: `Exp-${String(experiments.length + 1).padStart(3, '0')}`,
      name: '', linkedAssumptions: [], evidenceLevel: 'E1',
      method: '', successCriteria: '', status: 'Plan', result: '',
    });
    setExpModalOpen(true);
  };

  const saveExp = () => {
    if (!editingExp) return;
    if (!editingExp.name || editingExp.name.length < 3) { toast.error("實驗名稱至少 3 字元"); return; }
    if (editingExp.status === 'Done' && editingExp.result.length < 10) { toast.error("已完成實驗需填寫結果 (≥10 字元)"); return; }
    setExperiments(prev => {
      const exists = prev.find(e => e.id === editingExp.id);
      if (exists) return prev.map(e => e.id === editingExp.id ? editingExp : e);
      return [...prev, editingExp];
    });
    // Update evidence matrix if done
    if (editingExp.status === 'Done') {
      setEvidenceRows(prev => prev.map(row => {
        if (editingExp.linkedAssumptions.includes(row.assumptionCode)) {
          const newLevel = levelIndex(editingExp.evidenceLevel) > levelIndex(row.currentLevel) ? editingExp.evidenceLevel : row.currentLevel;
          return { ...row, currentLevel: newLevel };
        }
        return row;
      }));
    }
    setExpModalOpen(false);
    setEditingExp(null);
    toast.success("實驗已儲存");
  };

  const completedExpCount = experiments.filter(e => e.status === 'Done').length;

  // --- Gate 3.1 ---
  const gate31Items: Gate31Item[] = useMemo(() => [
    { label: '證據矩陣已建立 (≥1 假設有實驗)', passed: evidenceRows.some(r => r.experiments.length > 0) || experiments.length > 0 },
    { label: '所有 H*/H 風險有 mitigation', passed: highRisksWithoutMitigation === 0 },
  ], [evidenceRows, experiments, highRisksWithoutMitigation]);

  const gate31Passed = gate31Items.every(i => i.passed);

  // --- AI mock actions ---
  const handleAiRisk = async () => {
    setAiLoading(p => ({ ...p, risk: true }));
    await new Promise(r => setTimeout(r, 1800));
    const newR: RiskItem = {
      id: `R-${String(risks.length + 1).padStart(3, '0')}`,
      description: '磁力耦合器軸向間隙變化導致效率波動',
      failureMode: '效率降至 <85%，低於設計目標',
      probability: 3, severity: 4, mitigation: '',
    };
    setRisks(prev => [...prev, newR]);
    setAiLoading(p => ({ ...p, risk: false }));
    toast.success("AI 已識別 1 項潛在風險");
  };

  const handleAiExp = async () => {
    setAiLoading(p => ({ ...p, exp: true }));
    await new Promise(r => setTimeout(r, 1800));
    const gapAssumptions = evidenceRows.filter(r => r.currentLevel === 'E0' || r.currentLevel === 'E1');
    if (gapAssumptions.length === 0) {
      toast.info("無證據缺口，不需要新增實驗");
      setAiLoading(p => ({ ...p, exp: false }));
      return;
    }
    const target = gapAssumptions[0];
    const newExp: Experiment = {
      id: `Exp-${String(experiments.length + 1).padStart(3, '0')}`,
      name: `驗證 ${target.summary.slice(0, 20)}`,
      linkedAssumptions: [target.assumptionCode],
      evidenceLevel: 'E2', method: 'FEA 仿真分析', successCriteria: '指標達成設計目標',
      status: 'Plan', result: '',
    };
    setExperiments(prev => [...prev, newExp]);
    setAiLoading(p => ({ ...p, exp: false }));
    toast.success("AI 已建議 1 項實驗");
  };

  // P x S matrix renderer
  const renderPSMatrix = () => {
    const grid: Record<string, string[]> = {};
    risks.forEach(r => {
      const key = `${r.probability}-${r.severity}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(r.id);
    });

    return (
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1 text-muted-foreground">P＼S</th>
              {[1,2,3,4,5].map(s => <th key={s} className="p-1 w-12 text-center text-muted-foreground">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {[5,4,3,2,1].map(p => (
              <tr key={p}>
                <td className="p-1 font-medium text-muted-foreground text-center">{p}</td>
                {[1,2,3,4,5].map(s => {
                  const score = p * s;
                  const level = getRiskLevel(score);
                  const color = getRiskColor(level);
                  const ids = grid[`${p}-${s}`] || [];
                  return (
                    <td key={s} className="p-0.5">
                      <div className="w-12 h-10 rounded flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ backgroundColor: color, opacity: ids.length > 0 ? 1 : 0.25 }}>
                        {ids.length > 0 ? ids.join(', ') : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Review — 設計審查</h1>
            <p className="text-sm text-muted-foreground">Phase 3: Converge &gt; Step 3.1</p>
          </div>
        </div>
      </div>

      {/* 3 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="evidence" className="text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> 證據矩陣
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm">
            <ShieldAlert className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> 風險登錄
          </TabsTrigger>
          <TabsTrigger value="experiment" className="text-xs sm:text-sm">
            <Beaker className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" /> 最小實驗
            {hasGap && <AlertTriangle className="h-3 w-3 ml-1 text-[#F59E0B]" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Evidence Matrix */}
        <TabsContent value="evidence" className="space-y-4 mt-4">
          {evidenceRows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <p>尚無數據，請先在 Track 頁建立假設</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/projects/${id}/track`)}>前往 Track</Button>
            </CardContent></Card>
          ) : (
            <>
              {/* Desktop heatmap table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-[200px]">假設</th>
                      {EVIDENCE_LEVELS.map(l => (
                        <th key={l.value} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-16">{l.value}<br/><span className="text-[10px]">{l.label}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceRows.map(row => (
                      <tr key={row.assumptionCode} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs"><span className="font-medium">{row.assumptionCode}</span> {row.summary.length > 40 ? row.summary.slice(0, 40) + '...' : row.summary}</span>
                            </TooltipTrigger>
                            <TooltipContent><p className="max-w-xs text-xs">{row.summary}</p></TooltipContent>
                          </Tooltip>
                        </td>
                        {EVIDENCE_LEVELS.map((l, li) => {
                          const isCurrent = l.value === row.currentLevel;
                          const hasExp = row.experiments.some(e => e.level === l.value);
                          return (
                            <td key={l.value} className="text-center py-2 px-2">
                              {isCurrent ? (
                                <div className="w-6 h-6 rounded-full mx-auto" style={{ backgroundColor: l.color }} 
                                  title={`${l.value} ${l.label}`} />
                              ) : hasExp ? (
                                <div className="w-3 h-3 rounded-full mx-auto border-2" style={{ borderColor: l.color }} />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {evidenceRows.map(row => {
                  const li = levelIndex(row.currentLevel);
                  return (
                    <Card key={row.assumptionCode}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{row.assumptionCode}</span>
                          <Badge style={{ backgroundColor: EVIDENCE_LEVELS[li]?.color, color: '#fff' }} className="text-[10px]">{row.currentLevel}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{row.summary}</p>
                        <div className="flex gap-0.5">
                          {EVIDENCE_LEVELS.map((l, i) => (
                            <div key={l.value} className="flex-1 h-2 rounded-sm" style={{ backgroundColor: i <= li ? l.color : '#e5e7eb' }} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Gap summary */}
              <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${hasGap ? 'bg-[#FFF7ED] border border-[#fd7e14]/30' : 'bg-[#D1FAE5] border border-[#28a745]/30'}`}>
                {hasGap ? (
                  <><AlertTriangle className="h-4 w-4 text-[#fd7e14] shrink-0" /><span>{gapCount} 項假設仍處於 E0/E1，存在證據缺口</span></>
                ) : (
                  <><CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /><span>所有假設已有充足證據 ✅</span></>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 2: Risk Register */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          {/* P x S matrix */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="shrink-0">
              <p className="text-xs font-medium text-muted-foreground mb-2">P × S 風險矩陣</p>
              {renderPSMatrix()}
            </div>

            {/* Risk table (desktop) */}
            <div className="flex-1 hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground">ID</th>
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground">描述 ★</th>
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground">失效模式 ★</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground">P ★</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground">S ★</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground">RPN</th>
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground">緩解措施</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map(r => {
                    const score = getRiskScore(r);
                    const level = getRiskLevel(score);
                    const color = getRiskColor(level);
                    const needsMitigation = (level === 'H' || level === 'H*') && !r.mitigation.trim();
                    return (
                      <tr key={r.id} className={`border-b ${needsMitigation ? 'bg-[#FEE2E2]/50' : ''}`}>
                        <td className="py-1.5 px-2 text-xs font-medium">{r.id}</td>
                        <td className="py-1.5 px-2"><Input value={r.description} onChange={e => updateRisk(r.id, 'description', e.target.value)} className="text-xs h-7" /></td>
                        <td className="py-1.5 px-2"><Input value={r.failureMode} onChange={e => updateRisk(r.id, 'failureMode', e.target.value)} className="text-xs h-7" /></td>
                        <td className="py-1.5 px-2">
                          <Select value={String(r.probability)} onValueChange={v => updateRisk(r.id, 'probability', parseInt(v))}>
                            <SelectTrigger className="text-xs h-7 w-14"><SelectValue /></SelectTrigger>
                            <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-2">
                          <Select value={String(r.severity)} onValueChange={v => updateRisk(r.id, 'severity', parseInt(v))}>
                            <SelectTrigger className="text-xs h-7 w-14"><SelectValue /></SelectTrigger>
                            <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-[10px]">{score} ({level})</Badge>
                        </td>
                        <td className="py-1.5 px-2"><Input value={r.mitigation} onChange={e => updateRisk(r.id, 'mitigation', e.target.value)} className="text-xs h-7" placeholder={needsMitigation ? '⚠ 需填寫' : ''} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile risk cards */}
          <div className="md:hidden space-y-3">
            {risks.map(r => {
              const score = getRiskScore(r);
              const level = getRiskLevel(score);
              const color = getRiskColor(level);
              const needsMitigation = (level === 'H' || level === 'H*') && !r.mitigation.trim();
              return (
                <Card key={r.id} className={needsMitigation ? 'border-[#dc3545]/40' : ''}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{r.id}</span>
                      <Badge style={{ backgroundColor: color, color: '#fff' }} className="text-[10px]">{score} ({level})</Badge>
                    </div>
                    <Input value={r.description} onChange={e => updateRisk(r.id, 'description', e.target.value)} className="text-xs h-7" placeholder="風險描述 ★" />
                    <Input value={r.failureMode} onChange={e => updateRisk(r.id, 'failureMode', e.target.value)} className="text-xs h-7" placeholder="失效模式 ★" />
                    <div className="flex gap-2">
                      <Select value={String(r.probability)} onValueChange={v => updateRisk(r.id, 'probability', parseInt(v))}>
                        <SelectTrigger className="text-xs h-7 flex-1"><SelectValue placeholder="P" /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>P={n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={String(r.severity)} onValueChange={v => updateRisk(r.id, 'severity', parseInt(v))}>
                        <SelectTrigger className="text-xs h-7 flex-1"><SelectValue placeholder="S" /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>S={n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input value={r.mitigation} onChange={e => updateRisk(r.id, 'mitigation', e.target.value)} className="text-xs h-7" placeholder={needsMitigation ? '⚠ 緩解措施 (必要)' : '緩解措施'} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {risks.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              尚無風險，建議使用 AI 識別潛在風險
            </CardContent></Card>
          )}

          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={addRisk}><Plus className="h-3 w-3 mr-1" /> 新增風險</Button>
            <Button size="sm" variant="secondary" onClick={handleAiRisk} disabled={aiLoading.risk}>
              {aiLoading.risk ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              AI 識別風險 <Badge variant="secondary" className="text-[9px] ml-1">AI</Badge>
            </Button>
          </div>
        </TabsContent>

        {/* Tab 3: Minimum Experiments */}
        <TabsContent value="experiment" className="space-y-4 mt-4">
          {experiments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              尚無實驗，查看證據矩陣確認缺口後規劃實驗
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {experiments.map(exp => (
                <Card key={exp.id} className={`${exp.status === 'Done' ? 'border-l-[3px] border-l-[#10B981]' : ''}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{exp.id}</span>
                      <div className="flex gap-1.5">
                        <Badge style={{ backgroundColor: EVIDENCE_LEVELS.find(l => l.value === exp.evidenceLevel)?.color, color: '#fff' }} className="text-[10px]">{exp.evidenceLevel}</Badge>
                        <Badge style={{ backgroundColor: EXP_STATUS_COLOR[exp.status], color: '#fff' }} className="text-[10px]">{exp.status === 'Plan' ? '計畫' : exp.status === 'Running' ? '執行中' : '已完成'}</Badge>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{exp.name}</p>
                    {exp.linkedAssumptions.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {exp.linkedAssumptions.map(a => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                      </div>
                    )}
                    {exp.method && <p className="text-xs text-muted-foreground">方法: {exp.method}</p>}
                    {exp.successCriteria && <p className="text-xs text-muted-foreground">成功標準: {exp.successCriteria}</p>}
                    {exp.status === 'Done' && exp.result && (
                      <p className="text-xs bg-[#D1FAE5]/50 p-2 rounded">結果: {exp.result}</p>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setEditingExp({...exp}); setExpModalOpen(true); }}>
                      編輯
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={openNewExp}><Plus className="h-3 w-3 mr-1" /> 新增實驗</Button>
            <Button size="sm" variant="secondary" onClick={handleAiExp} disabled={aiLoading.exp}>
              {aiLoading.exp ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              AI 建議實驗 <Badge variant="secondary" className="text-[9px] ml-1">AI</Badge>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Gate 3.1 */}
      <Separator />
      <div className="rounded-lg border-2 border-[#10B981] bg-[#ECFDF5] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 text-[#10B981] shrink-0" />
          <h3 className="text-sm font-semibold">Gate 3.1 — 設計審查完整性檢查</h3>
          <Badge className={`text-xs text-white ${gate31Passed ? 'bg-[#28a745]' : 'bg-[#dc3545]'}`}>
            {gate31Passed ? 'Gate 3.1 Passed' : 'Gate 3.1 未通過'}
          </Badge>
        </div>
        <div className="space-y-2">
          {gate31Items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.passed ? <CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
        {gate31Passed ? (
          <Button onClick={() => navigate(`/projects/${id}/decision-record`)} className="bg-[#10B981] hover:bg-[#059669] text-white">
            通過 → 進入 Decide <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block"><Button disabled className="opacity-50">進入 Decide → <ArrowRight className="h-4 w-4 ml-1" /></Button></span>
            </TooltipTrigger>
            <TooltipContent><p>請完成上方所有檢查項目</p></TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Experiment Modal */}
      <Dialog open={expModalOpen} onOpenChange={o => { if (!o) { setExpModalOpen(false); setEditingExp(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingExp?.id ? `${editingExp.id} — 編輯實驗` : '新增實驗'}</DialogTitle></DialogHeader>
          {editingExp && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>實驗名稱 ★</Label><Input value={editingExp.name} onChange={e => setEditingExp({...editingExp, name: e.target.value})} maxLength={100} /></div>
              <div className="space-y-1"><Label>關聯假設 ★</Label><Input value={editingExp.linkedAssumptions.join(', ')} onChange={e => setEditingExp({...editingExp, linkedAssumptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="A-001, A-002" /></div>
              <div className="space-y-1"><Label>目標證據等級</Label>
                <Select value={editingExp.evidenceLevel} onValueChange={v => setEditingExp({...editingExp, evidenceLevel: v as EvidenceLevel})}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVIDENCE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.value} {l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>實驗方法</Label><Textarea value={editingExp.method} onChange={e => setEditingExp({...editingExp, method: e.target.value})} rows={2} maxLength={500} /></div>
              <div className="space-y-1"><Label>成功標準</Label><Input value={editingExp.successCriteria} onChange={e => setEditingExp({...editingExp, successCriteria: e.target.value})} maxLength={200} /></div>
              <div className="space-y-1"><Label>狀態</Label>
                <Select value={editingExp.status} onValueChange={v => setEditingExp({...editingExp, status: v as ExperimentStatus})}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plan">Plan</SelectItem>
                    <SelectItem value="Running">Running</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingExp.status === 'Done' && (
                <div className="space-y-1"><Label>實驗結果 ★</Label><Textarea value={editingExp.result} onChange={e => setEditingExp({...editingExp, result: e.target.value})} rows={3} maxLength={500} /></div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={saveExp}>儲存</Button>
                <Button variant="outline" onClick={() => { setExpModalOpen(false); setEditingExp(null); }}>取消</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
