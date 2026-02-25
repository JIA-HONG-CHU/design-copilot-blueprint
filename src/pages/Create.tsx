import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Plus, Sparkles, Loader2, AlertTriangle,
  ArrowRight, Flag, CheckCircle, XCircle, ChevronRight
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";
import type {
  AntiAnchorRoute, TrizSolution, Subsystem, ScamperVariant,
  Alternative, AccordionStepStatus, TrizPath, TrizActionStatus, CreateGateItem
} from "@/types/create";
import { MUST_CRITERIA, PRECAD_DIMENSIONS, SCAMPER_LABELS } from "@/types/create";
import {
  mockAntiAnchorRoutes, mockTrizSolutions, mockSubsystems,
  mockScamperVariants, mockAlternatives, mockAntiAnchorWarning
} from "@/data/mockCreate";

const STEP_LABELS = ['Anti-Anchor', 'TRIZ', '子系統', 'SCAMPER', '方案', 'MUST', 'Pre-CAD'];

export default function Create() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Data
  const [routes, setRoutes] = useState<AntiAnchorRoute[]>([]);
  const [trizSolutions, setTrizSolutions] = useState<TrizSolution[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [scamperVariants, setScamperVariants] = useState<ScamperVariant[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState<string[]>(['step-1']);

  // Loading states
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      if (id) {
        setRoutes(mockAntiAnchorRoutes[id] ?? []);
        setTrizSolutions(mockTrizSolutions[id] ?? []);
        setSubsystems(mockSubsystems[id] ?? []);
        setScamperVariants(mockScamperVariants[id] ?? []);
        setAlternatives(mockAlternatives[id] ?? []);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [id]);

  // Step statuses
  const stepStatuses: AccordionStepStatus[] = useMemo(() => {
    const s1 = routes.length >= 1 ? 'complete' : routes.length > 0 ? 'in_progress' : 'not_started';
    const adopted = trizSolutions.filter(t => t.status === 'adopted').length;
    const s2 = adopted > 0 ? 'complete' : trizSolutions.length > 0 ? 'in_progress' : 'not_started';
    const confirmed = subsystems.filter(s => s.confirmed).length;
    const s3 = confirmed > 0 ? 'complete' : subsystems.length > 0 ? 'in_progress' : 'not_started';
    const adoptedSc = scamperVariants.filter(v => v.adopted).length;
    const s4 = adoptedSc > 0 ? 'complete' : scamperVariants.length > 0 ? 'in_progress' : 'not_started';
    const s5 = alternatives.length > 0 ? 'complete' : 'not_started';
    const allMustFilled = alternatives.length > 0 && alternatives.every(a => Object.values(a.mustScores).every(v => v !== null));
    const s6 = allMustFilled ? 'complete' : alternatives.some(a => Object.values(a.mustScores).some(v => v !== null)) ? 'in_progress' : 'not_started';
    const passedMust = alternatives.filter(a => !Object.values(a.mustScores).includes('fail'));
    const allScored = passedMust.length > 0 && passedMust.every(a => Object.values(a.preCadScores).every(v => v !== null));
    const s7 = allScored ? 'complete' : passedMust.some(a => Object.values(a.preCadScores).some(v => v !== null)) ? 'in_progress' : 'not_started';
    return [s1, s2, s3, s4, s5, s6, s7];
  }, [routes, trizSolutions, subsystems, scamperVariants, alternatives]);

  const autoSave = useCallback(() => {
    setSaveStatus('saving');
    setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }, 500);
  }, []);

  // Gate checks
  const passedMustAlts = alternatives.filter(a => !Object.values(a.mustScores).includes('fail') && Object.values(a.mustScores).every(v => v !== null));
  const preCadPassedAlts = alternatives.filter(a => a.overallPass === true);

  const gate22Items: CreateGateItem[] = useMemo(() => [
    { label: '≥2 方案通過 MUST 快篩', current: passedMustAlts.length, target: 2, passed: passedMustAlts.length >= 2 },
    { label: 'MUST 快篩已完成', current: stepStatuses[5] === 'complete' ? 1 : 0, target: 1, passed: stepStatuses[5] === 'complete' },
  ], [passedMustAlts, stepStatuses]);

  const phaseGate2Items: CreateGateItem[] = useMemo(() => [
    { label: '≥1 方案 Pre-CAD overall_pass = True', current: preCadPassedAlts.length, target: 1, passed: preCadPassedAlts.length >= 1 },
  ], [preCadPassedAlts]);

  // Handlers
  const addRoute = () => {
    setRoutes(prev => [...prev, { id: `aar-${Date.now()}`, name: '', description: '' }]);
  };
  const updateRoute = (rid: string, field: 'name' | 'description', value: string) => {
    setRoutes(prev => prev.map(r => r.id === rid ? { ...r, [field]: value } : r));
    autoSave();
  };

  const setTrizStatus = (tsId: string, status: TrizActionStatus) => {
    setTrizSolutions(prev => prev.map(t => t.id === tsId ? { ...t, status } : t));
    autoSave();
  };

  const toggleSubsystem = (ssId: string) => {
    setSubsystems(prev => prev.map(s => s.id === ssId ? { ...s, confirmed: !s.confirmed } : s));
    autoSave();
  };

  const toggleScamperAdopt = (svId: string) => {
    setScamperVariants(prev => prev.map(v => v.id === svId ? { ...v, adopted: !v.adopted } : v));
    autoSave();
  };

  const cycleMust = (altId: string, mustId: string) => {
    setAlternatives(prev => prev.map(a => {
      if (a.id !== altId) return a;
      const current = a.mustScores[mustId];
      const next = current === null ? 'pass' : current === 'pass' ? 'fail' : current === 'fail' ? 'marginal' : null;
      return { ...a, mustScores: { ...a.mustScores, [mustId]: next } };
    }));
    autoSave();
  };

  const updatePreCadScore = (altId: string, dim: string, value: number) => {
    setAlternatives(prev => prev.map(a => {
      if (a.id !== altId) return a;
      const newScores = { ...a.preCadScores, [dim]: value };
      const allFilled = Object.values(newScores).every(v => v !== null);
      const allPass = allFilled && Object.values(newScores).every(v => (v as number) >= 3);
      return { ...a, preCadScores: newScores, overallPass: allFilled ? allPass : null };
    }));
    autoSave();
  };

  const addManualAlternative = () => {
    const newAlt: Alternative = {
      id: `alt-${Date.now()}`, name: '', mechanism: '', source: 'manual',
      keyAssumptionIds: [], mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null },
      preCadScores: { space: null, cost: null, safety: null, decoupling: null, supply: null },
      overallPass: null,
    };
    setAlternatives(prev => [...prev, newAlt]);
    toast.success('已新增空白方案');
  };

  const handleAiGenAlts = async () => {
    setAiLoading(p => ({ ...p, alts: true }));
    await new Promise(r => setTimeout(r, 2000));
    const newAlt: Alternative = {
      id: `alt-ai-${Date.now()}`, name: 'AI 整合：蜂巢夾層 + 磁力耦合方案',
      mechanism: 'AI 整合 TRIZ 分割原理與 SCAMPER 替代建議，採用蜂巢夾層殼體搭配磁力耦合傳動，在減重 35% 的同時維持結構剛度，傳動效率提升至 92%。',
      source: 'ai_integrated', keyAssumptionIds: ['ta-001', 'ta-003'],
      mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null },
      preCadScores: { space: null, cost: null, safety: null, decoupling: null, supply: null },
      overallPass: null,
    };
    setAlternatives(prev => [...prev, newAlt]);
    setAiLoading(p => ({ ...p, alts: false }));
    toast.success('AI 已整合生成新方案');
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const getStepIcon = (status: AccordionStepStatus) => {
    if (status === 'complete') return <div className="w-6 h-6 rounded-full bg-[#28a745] flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>;
    if (status === 'in_progress') return <div className="w-6 h-6 rounded-full border-2 border-[#F59E0B] flex items-center justify-center animate-pulse"><div className="w-2 h-2 rounded-full bg-[#F59E0B]" /></div>;
    return <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />;
  };

  const mustCell = (val: 'pass' | 'fail' | 'marginal' | null) => {
    if (val === 'pass') return <span className="inline-block w-8 h-8 rounded bg-[#D1FAE5] text-center leading-8 text-sm">✅</span>;
    if (val === 'fail') return <span className="inline-block w-8 h-8 rounded bg-[#FEE2E2] text-center leading-8 text-sm">❌</span>;
    if (val === 'marginal') return <span className="inline-block w-8 h-8 rounded bg-[#FEF3C7] text-center leading-8 text-sm">⚠️</span>;
    return <span className="inline-block w-8 h-8 rounded bg-muted text-center leading-8 text-sm text-muted-foreground">—</span>;
  };

  const selectedAlt = alternatives.find(a => a.id === selectedAltId) ?? alternatives.filter(a => !Object.values(a.mustScores).includes('fail'))[0];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> 返回 Dashboard
          </Button>
          {saveStatus !== 'idle' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && <><Check className="h-3 w-3 text-[#28a745]" /> Saved</>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#F59E0B]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create — 方案創造</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Step 2.2–2.3 · 7 個子步驟漸進展開</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center justify-between px-2">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            {getStepIcon(stepStatuses[i])}
            <span className="text-[10px] text-muted-foreground text-center leading-tight hidden sm:block">{label}</span>
            {i < 6 && <div className={`absolute h-0.5 w-full ${stepStatuses[i] === 'complete' ? 'bg-[#F59E0B]' : 'bg-muted-foreground/20'}`} style={{ display: 'none' }} />}
          </div>
        ))}
      </div>

      {/* Accordions */}
      <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="space-y-3">
        {/* 1. Anti-Anchor */}
        <AccordionItem value="step-1" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">1. Anti-Anchor Sprint</span>
              <Badge variant={stepStatuses[0] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[0] === 'complete' ? '✅ 完成' : stepStatuses[0] === 'in_progress' ? '◉ 進行中' : '○ 未開始'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* AI warning */}
            {id && mockAntiAnchorWarning[id] && (
              <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-r-lg p-3 space-y-1">
                <div className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px]">AI</Badge><AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" /></div>
                <p className="text-sm">{mockAntiAnchorWarning[id]}</p>
              </div>
            )}
            {routes.map(r => (
              <div key={r.id} className="space-y-2 p-3 border rounded-lg">
                <Input placeholder="路線名稱 ★" value={r.name} onChange={e => updateRoute(r.id, 'name', e.target.value)} maxLength={50} />
                <Textarea placeholder="路線簡述 ★ (至少 10 字元)" value={r.description} onChange={e => updateRoute(r.id, 'description', e.target.value)} rows={2} maxLength={300} />
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addRoute}><Plus className="h-3 w-3 mr-1" /> 新增路線</Button>
            <div className="flex items-center gap-2 text-sm">
              {routes.filter(r => r.name.length >= 3 && r.description.length >= 10).length >= 1
                ? <><CheckCircle className="h-4 w-4 text-[#28a745]" /><span>Gate 2.2.1: ≥1 非基準路線 ✅</span></>
                : <><XCircle className="h-4 w-4 text-destructive" /><span className="text-muted-foreground">Gate 2.2.1: ≥1 非基準路線 ❌</span></>
              }
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. TRIZ */}
        <AccordionItem value="step-2" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">2. TRIZ 解矛盾</span>
              <Badge variant={stepStatuses[1] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[1] === 'complete' ? '✅ 完成' : stepStatuses[1] === 'in_progress' ? '◉ 進行中' : '○ 未開始'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Group by contradiction */}
            {Array.from(new Set(trizSolutions.map(t => t.contradictionId))).map(cId => {
              const sols = trizSolutions.filter(t => t.contradictionId === cId);
              return (
                <div key={cId} className="space-y-3">
                  <h4 className="text-sm font-medium">矛盾: {cId}</h4>
                  <Tabs defaultValue="TC">
                    <TabsList className="h-8">
                      <TabsTrigger value="TC" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-[#3B82F6] rounded-none">矩陣查表 (TC)</TabsTrigger>
                      <TabsTrigger value="PC" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-[#F59E0B] rounded-none">分離原理 (PC)</TabsTrigger>
                      <TabsTrigger value="SF" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-b-[#10B981] rounded-none">76 標準解 (SF)</TabsTrigger>
                    </TabsList>
                    {(['TC', 'PC', 'SF'] as TrizPath[]).map(path => (
                      <TabsContent key={path} value={path} className="space-y-2 mt-3">
                        {sols.filter(s => s.path === path).length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">此路徑暫無解法建議</p>
                        ) : sols.filter(s => s.path === path).map(sol => (
                          <Card key={sol.id} className={`bg-muted/50 ${sol.status === 'adopted' ? 'border-l-[3px] border-l-[#28a745]' : ''}`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px]">AI</Badge>
                                {sol.principleNumber && <Badge variant="outline" className="text-[10px]">#{sol.principleNumber}</Badge>}
                                <span className="text-xs font-medium">{sol.principleName}</span>
                              </div>
                              <p className="text-sm">{sol.suggestion}</p>
                              <div className="flex gap-2">
                                <Button size="sm" variant={sol.status === 'adopted' ? 'default' : 'outline'}
                                  className={`text-xs h-6 ${sol.status === 'adopted' ? 'bg-[#28a745] hover:bg-[#218838]' : ''}`}
                                  onClick={() => setTrizStatus(sol.id, 'adopted')}>採用</Button>
                                <Button size="sm" variant="ghost" className="text-xs h-6"
                                  onClick={() => setTrizStatus(sol.id, 'skipped')}>跳過</Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>

        {/* 3. Subsystem */}
        <AccordionItem value="step-3" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">3. 子系統定義</span>
              <Badge variant={stepStatuses[2] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[2] === 'complete' ? '✅ 完成' : '○'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">AI 建議受影響子系統，請勾選確認：</p>
            {subsystems.map(ss => (
              <div key={ss.id} className={`flex items-start gap-3 p-3 rounded-lg border ${ss.confirmed ? 'bg-[#D1FAE5]/30 border-[#28a745]/30' : 'bg-muted/50'}`}>
                <Checkbox checked={ss.confirmed} onCheckedChange={() => toggleSubsystem(ss.id)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ss.name}</span>
                    <Badge variant="secondary" className="text-[10px]">AI</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ss.reason}</p>
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* 4. SCAMPER */}
        <AccordionItem value="step-4" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">4. SCAMPER 變形</span>
              <Badge variant={stepStatuses[3] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[3] === 'complete' ? '✅ 完成' : '○'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {subsystems.filter(s => s.confirmed).map(ss => (
              <div key={ss.id} className="space-y-2">
                <h4 className="text-sm font-medium">{ss.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {scamperVariants.filter(v => v.subsystemId === ss.id).map(v => (
                    <Card key={v.id} className={`bg-muted/50 ${v.adopted ? 'border-l-[3px] border-l-[#28a745]' : ''}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-1">
                          <Badge className="text-[10px] bg-[#F59E0B] text-white">{v.action}</Badge>
                          <span className="text-[10px] text-muted-foreground">{SCAMPER_LABELS[v.action].zh}</span>
                          <Badge variant="secondary" className="text-[9px] ml-auto">AI</Badge>
                        </div>
                        <p className="text-xs">{v.description}</p>
                        <Button size="sm" variant={v.adopted ? 'default' : 'ghost'} className="text-xs h-6"
                          onClick={() => toggleScamperAdopt(v.id)}>
                          {v.adopted ? '✓ 已採用' : '採用'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* 5. Alternatives */}
        <AccordionItem value="step-5" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">5. 方案集合</span>
              <Badge variant={stepStatuses[4] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {alternatives.length} 方案
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {alternatives.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground text-sm">尚無方案</p>
                <p className="text-xs text-muted-foreground">點擊 [AI 整合生成] 或 [+ 手動新增] 建立方案</p>
              </div>
            ) : alternatives.map(alt => (
              <Card key={alt.id} className="border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input className="text-sm font-medium h-8 flex-1 min-w-[200px]"
                      placeholder="方案名稱 ★" value={alt.name}
                      onChange={e => {
                        setAlternatives(prev => prev.map(a => a.id === alt.id ? { ...a, name: e.target.value } : a));
                        autoSave();
                      }} />
                    <Badge variant="outline" className="text-[10px] shrink-0">{alt.source}</Badge>
                  </div>
                  <Textarea placeholder="機制說明 ★ (至少 20 字元)" value={alt.mechanism} rows={2}
                    onChange={e => {
                      setAlternatives(prev => prev.map(a => a.id === alt.id ? { ...a, mechanism: e.target.value } : a));
                      autoSave();
                    }} />
                  {alt.keyAssumptionIds.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {alt.keyAssumptionIds.map(aid => <Badge key={aid} variant="outline" className="text-[10px]">{aid}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex gap-3">
              <Button size="sm" variant="secondary" onClick={addManualAlternative}><Plus className="h-3 w-3 mr-1" /> 手動新增</Button>
              <Button size="sm" variant="secondary" onClick={handleAiGenAlts} disabled={aiLoading.alts}>
                {aiLoading.alts ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI 整合生成 <Badge variant="secondary" className="text-[9px] ml-1">AI</Badge>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. MUST */}
        <AccordionItem value="step-6" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">6. MUST 快篩</span>
              <Badge variant={stepStatuses[5] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[5] === 'complete' ? '✅ 完成' : '○'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-[#28a745] text-white">{passedMustAlts.length} 通過</Badge>
              <Badge className="bg-[#dc3545] text-white">{alternatives.filter(a => Object.values(a.mustScores).includes('fail')).length} 淘汰</Badge>
              <Badge variant="secondary">{alternatives.filter(a => Object.values(a.mustScores).includes('marginal')).length} 待定</Badge>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">方案</th>
                    {MUST_CRITERIA.map(c => <th key={c.id} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">{c.label}</th>)}
                    <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map(alt => {
                    const hasFail = Object.values(alt.mustScores).includes('fail');
                    return (
                      <tr key={alt.id} className={`border-b ${hasFail ? 'bg-muted/50 opacity-60' : ''}`}>
                        <td className={`py-2 px-2 text-xs max-w-[120px] truncate ${hasFail ? 'line-through' : ''}`}>{alt.name || '(未命名)'}</td>
                        {MUST_CRITERIA.map(c => (
                          <td key={c.id} className="text-center py-2 px-2 cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
                            {mustCell(alt.mustScores[c.id])}
                          </td>
                        ))}
                        <td className="text-center py-2 px-2">
                          {hasFail ? <Badge className="bg-[#dc3545] text-white text-[10px]">淘汰</Badge>
                            : Object.values(alt.mustScores).every(v => v === 'pass') ? <Badge className="bg-[#28a745] text-white text-[10px]">通過</Badge>
                            : <Badge variant="secondary" className="text-[10px]">待定</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {alternatives.map(alt => {
                const hasFail = Object.values(alt.mustScores).includes('fail');
                return (
                  <Card key={alt.id} className={hasFail ? 'opacity-60' : ''}>
                    <CardContent className="p-3 space-y-2">
                      <p className={`text-sm font-medium ${hasFail ? 'line-through' : ''}`}>{alt.name || '(未命名)'}</p>
                      <div className="grid grid-cols-5 gap-1">
                        {MUST_CRITERIA.map(c => (
                          <div key={c.id} className="text-center cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
                            <p className="text-[9px] text-muted-foreground">{c.id}</p>
                            {mustCell(alt.mustScores[c.id])}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Pre-CAD */}
        <AccordionItem value="step-7" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">7. Pre-CAD 審查</span>
              <Badge variant={stepStatuses[6] === 'complete' ? 'default' : 'secondary'} className="text-[10px]">
                {stepStatuses[6] === 'complete' ? '✅ 完成' : '○'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Alt selector pills */}
            {(() => {
              const eligible = alternatives.filter(a => !Object.values(a.mustScores).includes('fail') && Object.values(a.mustScores).some(v => v !== null));
              if (eligible.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">請先在 MUST 快篩中完成評估</p>;
              const current = eligible.find(a => a.id === selectedAltId) ?? eligible[0];
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {eligible.map(a => (
                      <Button key={a.id} size="sm" variant={current.id === a.id ? 'default' : 'outline'}
                        className="text-xs h-7" onClick={() => setSelectedAltId(a.id)}>
                        {a.name || '(未命名)'}
                        {a.overallPass === true && <Check className="h-3 w-3 ml-1 text-[#28a745]" />}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Scoring */}
                    <div className="space-y-4">
                      {PRECAD_DIMENSIONS.map(dim => {
                        const val = current.preCadScores[dim.key as keyof typeof current.preCadScores] ?? 1;
                        return (
                          <div key={dim.key} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium">{dim.label} <span className="text-destructive">★</span></span>
                              <Badge variant={val >= 3 ? 'default' : 'destructive'} className="text-[10px]">{val}/5</Badge>
                            </div>
                            <Slider min={1} max={5} step={1} value={[val]}
                              onValueChange={([v]) => updatePreCadScore(current.id, dim.key, v)} />
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                              <span>{dim.labels[0]}</span><span>{dim.labels[2]}</span><span>{dim.labels[4]}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2">
                        {current.overallPass === true
                          ? <Badge className="bg-[#28a745] text-white">✅ 通過 — 可進入 CAD</Badge>
                          : current.overallPass === false
                          ? <Badge className="bg-[#dc3545] text-white">❌ 不通過 — 有維度 &lt; 3</Badge>
                          : <Badge variant="secondary">待完成評分</Badge>}
                      </div>
                    </div>

                    {/* Radar chart */}
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={PRECAD_DIMENSIONS.map(d => ({
                          subject: d.label,
                          value: current.preCadScores[d.key as keyof typeof current.preCadScores] ?? 0,
                          fullMark: 5,
                        }))}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9 }} />
                          <Radar name="評分" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Gates */}
      <div className="space-y-4 mt-6">
        <Separator />
        {/* Gate 2.2 */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-[#F59E0B]" />
            <h3 className="text-sm font-semibold">Gate 2.2 — 方案創造完整性</h3>
            <Badge className={`text-xs text-white ${gate22Items.every(i => i.passed) ? 'bg-[#28a745]' : 'bg-[#dc3545]'}`}>
              {gate22Items.every(i => i.passed) ? 'Gate 2.2 Passed' : 'Gate 2.2 未通過'}
            </Badge>
          </div>
          <div className="space-y-2">
            {gate22Items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.passed ? <CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{item.current}/{item.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Gate 2 */}
        <div className="rounded-lg border-2 border-[#F59E0B] bg-[#FFFBEB] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Flag className="h-5 w-5 text-[#F59E0B] shrink-0" />
            <h3 className="text-sm font-semibold">Phase Gate 2 — Diverge 階段完成檢查</h3>
            <Badge className={`text-xs text-white ${phaseGate2Items.every(i => i.passed) ? 'bg-[#28a745]' : 'bg-[#dc3545]'}`}>
              {phaseGate2Items.every(i => i.passed) ? 'Phase 2 Passed ★' : 'Phase 2 未通過'}
            </Badge>
          </div>
          <div className="space-y-2">
            {phaseGate2Items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.passed ? <CheckCircle className="h-4 w-4 text-[#28a745] shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{item.current}/{item.target}</span>
              </div>
            ))}
          </div>
          {gate22Items.every(i => i.passed) && phaseGate2Items.every(i => i.passed) ? (
            <Button onClick={() => navigate(`/projects/${id}/review`)} className="w-full sm:w-auto bg-[#28a745] hover:bg-[#218838] text-white">
              通過 Phase Gate 2 → 進入 Review <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block"><Button disabled className="w-full sm:w-auto opacity-50">進入 Review → <ArrowRight className="h-4 w-4 ml-1" /></Button></span>
              </TooltipTrigger>
              <TooltipContent><p>請完成 Gate 2.2 和 Phase Gate 2 所有條件</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
