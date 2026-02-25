import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Plus, Sparkles, Loader2, AlertTriangle,
  ArrowRight, Flag, CheckCircle, XCircle, ChevronLeft
} from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
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
import { mockTrackAssumptions } from "@/data/mockTrack";
import { MissionContext } from "@/components/create/MissionContext";
import { CreateStepper } from "@/components/create/CreateStepper";

const RADAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "#10B981",
];

const STEPS = [
  { label: "Anti-Anchor Sprint", shortLabel: "Anti-Anchor", description: "打破思維定勢，探索非慣用技術路線" },
  { label: "TRIZ 解矛盾", shortLabel: "TRIZ", description: "針對已識別的矛盾，透過 TRIZ 三路徑找到解法" },
  { label: "子系統定義", shortLabel: "子系統", description: "識別受矛盾影響的子系統，聚焦變形範圍" },
  { label: "SCAMPER 變形", shortLabel: "SCAMPER", description: "對每個子系統執行 7 種創意動作，產生變異方案" },
  { label: "方案整合", shortLabel: "方案", description: "整合前四步成果，建立完整的概念方案" },
  { label: "MUST 快篩", shortLabel: "MUST", description: "以必要條件快速淘汰不可行方案" },
  { label: "Pre-CAD 審查", shortLabel: "Pre-CAD", description: "對存活方案進行多維度評分，決定是否進入 CAD" },
];

// Mock mission data (would come from Explore/Track in real app)
const MOCK_MISSION = {
  problemStatement: "設計一款中驅電動自行車傳動系統，在 ≤65dB 噪音下達成 25km/h 極速與 15% 坡度爬坡能力",
  contradictions: [
    { id: "EC-001", description: "馬達轉速提升 → 輸出功率增加，但噪音同步惡化" },
    { id: "EC-002", description: "殼體需高結構強度，但重量需控制在目標範圍內" },
  ],
  verifiedAssumptions: 1,
  totalAssumptions: 7,
  highRiskCount: 3,
};

export default function Create() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [currentStep, setCurrentStep] = useState(0);

  // Data
  const [routes, setRoutes] = useState<AntiAnchorRoute[]>([]);
  const [trizSolutions, setTrizSolutions] = useState<TrizSolution[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [scamperVariants, setScamperVariants] = useState<ScamperVariant[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);
  const [comparedAltIds, setComparedAltIds] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // Assumption lookup for displaying readable names
  const assumptionMap = useMemo(() => {
    const map = new Map<string, { code: string; description: string }>();
    const assumptions = mockTrackAssumptions[id ?? ""] ?? [];
    assumptions.forEach((a) => map.set(a.id, { code: a.assumptionCode, description: a.description }));
    return map;
  }, [id]);

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
    const s1 = routes.filter(r => r.name.length >= 3 && r.description.length >= 10).length >= 1 ? "complete" : routes.length > 0 ? "in_progress" : "not_started";
    const adopted = trizSolutions.filter((t) => t.status === "adopted").length;
    const s2 = adopted > 0 ? "complete" : trizSolutions.length > 0 ? "in_progress" : "not_started";
    const confirmed = subsystems.filter((s) => s.confirmed).length;
    const s3 = confirmed > 0 ? "complete" : subsystems.length > 0 ? "in_progress" : "not_started";
    const adoptedSc = scamperVariants.filter((v) => v.adopted).length;
    const s4 = adoptedSc > 0 ? "complete" : scamperVariants.length > 0 ? "in_progress" : "not_started";
    const s5 = alternatives.length > 0 ? "complete" : "not_started";
    const allMustFilled = alternatives.length > 0 && alternatives.every((a) => Object.values(a.mustScores).every((v) => v !== null));
    const s6 = allMustFilled ? "complete" : alternatives.some((a) => Object.values(a.mustScores).some((v) => v !== null)) ? "in_progress" : "not_started";
    const passedMust = alternatives.filter((a) => !Object.values(a.mustScores).includes("fail"));
    const allScored = passedMust.length > 0 && passedMust.every((a) => Object.values(a.preCadScores).every((v) => v !== null));
    const s7 = allScored ? "complete" : passedMust.some((a) => Object.values(a.preCadScores).some((v) => v !== null)) ? "in_progress" : "not_started";
    return [s1, s2, s3, s4, s5, s6, s7];
  }, [routes, trizSolutions, subsystems, scamperVariants, alternatives]);

  const autoSave = useCallback(() => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
  }, []);

  // Gate checks
  const passedMustAlts = alternatives.filter((a) => !Object.values(a.mustScores).includes("fail") && Object.values(a.mustScores).every((v) => v !== null));
  const preCadPassedAlts = alternatives.filter((a) => a.overallPass === true);

  const gate22Items: CreateGateItem[] = useMemo(
    () => [
      { label: "≥2 方案通過 MUST 快篩", current: passedMustAlts.length, target: 2, passed: passedMustAlts.length >= 2 },
      { label: "MUST 快篩已完成", current: stepStatuses[5] === "complete" ? 1 : 0, target: 1, passed: stepStatuses[5] === "complete" },
    ],
    [passedMustAlts, stepStatuses]
  );

  const phaseGate2Items: CreateGateItem[] = useMemo(
    () => [{ label: "≥1 方案 Pre-CAD overall_pass = True", current: preCadPassedAlts.length, target: 1, passed: preCadPassedAlts.length >= 1 }],
    [preCadPassedAlts]
  );

  // Handlers
  const addRoute = () => {
    setRoutes((prev) => [...prev, { id: `aar-${Date.now()}`, name: "", description: "" }]);
  };
  const updateRoute = (rid: string, field: "name" | "description", value: string) => {
    setRoutes((prev) => prev.map((r) => (r.id === rid ? { ...r, [field]: value } : r)));
    autoSave();
  };
  const setTrizStatus = (tsId: string, status: TrizActionStatus) => {
    setTrizSolutions((prev) => prev.map((t) => (t.id === tsId ? { ...t, status } : t)));
    autoSave();
  };
  const toggleSubsystem = (ssId: string) => {
    setSubsystems((prev) => prev.map((s) => (s.id === ssId ? { ...s, confirmed: !s.confirmed } : s)));
    autoSave();
  };
  const toggleScamperAdopt = (svId: string) => {
    setScamperVariants((prev) => prev.map((v) => (v.id === svId ? { ...v, adopted: !v.adopted } : v)));
    autoSave();
  };
  const cycleMust = (altId: string, mustId: string) => {
    setAlternatives((prev) =>
      prev.map((a) => {
        if (a.id !== altId) return a;
        const current = a.mustScores[mustId];
        const next = current === null ? "pass" : current === "pass" ? "fail" : current === "fail" ? "marginal" : null;
        return { ...a, mustScores: { ...a.mustScores, [mustId]: next } };
      })
    );
    autoSave();
  };
  const updatePreCadScore = (altId: string, dim: string, value: number) => {
    setAlternatives((prev) =>
      prev.map((a) => {
        if (a.id !== altId) return a;
        const newScores = { ...a.preCadScores, [dim]: value };
        const allFilled = Object.values(newScores).every((v) => v !== null);
        const allPass = allFilled && Object.values(newScores).every((v) => (v as number) >= 3);
        return { ...a, preCadScores: newScores, overallPass: allFilled ? allPass : null };
      })
    );
    autoSave();
  };
  const addManualAlternative = () => {
    const newAlt: Alternative = {
      id: `alt-${Date.now()}`, name: "", mechanism: "", source: "manual",
      keyAssumptionIds: [], mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null },
      preCadScores: { space: null, cost: null, safety: null, decoupling: null, supply: null },
      overallPass: null,
    };
    setAlternatives((prev) => [...prev, newAlt]);
    toast.success("已新增空白方案");
  };
  const handleAiGenAlts = async () => {
    setAiLoading((p) => ({ ...p, alts: true }));
    await new Promise((r) => setTimeout(r, 2000));
    const newAlt: Alternative = {
      id: `alt-ai-${Date.now()}`, name: "AI 整合：蜂巢夾層 + 磁力耦合方案",
      mechanism: "AI 整合 TRIZ 分割原理與 SCAMPER 替代建議，採用蜂巢夾層殼體搭配磁力耦合傳動，在減重 35% 的同時維持結構剛度，傳動效率提升至 92%。",
      source: "ai_integrated", keyAssumptionIds: ["ta-001", "ta-003"],
      mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null },
      preCadScores: { space: null, cost: null, safety: null, decoupling: null, supply: null },
      overallPass: null,
    };
    setAlternatives((prev) => [...prev, newAlt]);
    setAiLoading((p) => ({ ...p, alts: false }));
    toast.success("AI 已整合生成新方案");
  };

  const mustCell = (val: "pass" | "fail" | "marginal" | null) => {
    if (val === "pass") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-sm">✅</span>;
    if (val === "fail") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 text-sm">❌</span>;
    if (val === "marginal") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-warning/10 text-sm">⚠️</span>;
    return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-sm text-muted-foreground">—</span>;
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 6));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderAntiAnchor();
      case 1: return renderTriz();
      case 2: return renderSubsystem();
      case 3: return renderScamper();
      case 4: return renderAlternatives();
      case 5: return renderMust();
      case 6: return renderPreCad();
      default: return null;
    }
  };

  // ── Step 1: Anti-Anchor ──
  function renderAntiAnchor() {
    return (
      <div className="space-y-6">
        {id && mockAntiAnchorWarning[id] && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">路徑依賴風險</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{mockAntiAnchorWarning[id]}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {routes.map((r, i) => (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">路線 {i + 1}</Badge>
                </div>
                <Input
                  placeholder="路線名稱 ★"
                  value={r.name}
                  onChange={(e) => updateRoute(r.id, "name", e.target.value)}
                  maxLength={50}
                  className="text-sm font-medium"
                />
                <Textarea
                  placeholder="路線簡述 ★ (至少 10 字元)"
                  value={r.description}
                  onChange={(e) => updateRoute(r.id, "description", e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="text-sm leading-relaxed"
                />
              </CardContent>
            </Card>
          ))}
          <Button variant="secondary" size="sm" onClick={addRoute} className="text-sm">
            <Plus className="h-4 w-4 mr-1.5" /> 新增路線
          </Button>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            {routes.filter((r) => r.name.length >= 3 && r.description.length >= 10).length >= 1
              ? <><CheckCircle className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Gate 2.2.1: ≥1 非基準路線已建立</span></>
              : <><XCircle className="h-5 w-5 text-muted-foreground shrink-0" /><span className="text-sm text-muted-foreground">Gate 2.2.1: 需建立至少 1 條非基準路線</span></>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 2: TRIZ ──
  function renderTriz() {
    const contradictionIds = Array.from(new Set(trizSolutions.map((t) => t.contradictionId)));
    return (
      <div className="space-y-6">
        {contradictionIds.map((cId) => {
          const sols = trizSolutions.filter((t) => t.contradictionId === cId);
          // Find the contradiction description from mission
          const contradiction = MOCK_MISSION.contradictions.find(c => c.id.toLowerCase().replace('-', '') === cId.replace('-', ''));
          return (
            <div key={cId} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-destructive">⚡</span>
                </div>
                <div>
                  <p className="text-sm font-medium">矛盾 {cId}</p>
                  {contradiction && <p className="text-xs text-muted-foreground mt-0.5">{contradiction.description}</p>}
                </div>
              </div>

              <Tabs defaultValue="TC">
                <TabsList className="h-9 bg-muted/50">
                  <TabsTrigger value="TC" className="text-xs">矩陣查表 (TC)</TabsTrigger>
                  <TabsTrigger value="PC" className="text-xs">分離原理 (PC)</TabsTrigger>
                  <TabsTrigger value="SF" className="text-xs">76 標準解 (SF)</TabsTrigger>
                </TabsList>
                {(["TC", "PC", "SF"] as TrizPath[]).map((path) => (
                  <TabsContent key={path} value={path} className="space-y-3 mt-4">
                    {sols.filter((s) => s.path === path).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">此路徑暫無解法建議</p>
                    ) : (
                      sols.filter((s) => s.path === path).map((sol) => (
                        <Card key={sol.id} className={sol.status === "adopted" ? "border-l-[3px] border-l-primary" : ""}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">AI</Badge>
                              {sol.principleNumber && <Badge variant="outline" className="text-[10px] font-mono">#{sol.principleNumber}</Badge>}
                              <span className="text-sm font-medium">{sol.principleName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{sol.suggestion}</p>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant={sol.status === "adopted" ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => setTrizStatus(sol.id, sol.status === "adopted" ? "pending" : "adopted")}
                              >
                                {sol.status === "adopted" ? "✓ 已採用" : "採用"}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setTrizStatus(sol.id, "skipped")}>
                                跳過
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              <Separator />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Step 3: Subsystem ──
  function renderSubsystem() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">AI 建議受影響子系統，請勾選確認：</p>
        {subsystems.map((ss) => (
          <Card
            key={ss.id}
            className={`transition-all cursor-pointer ${ss.confirmed ? "border-primary/30 bg-primary/[0.03]" : ""}`}
            onClick={() => toggleSubsystem(ss.id)}
          >
            <CardContent className="p-4 flex items-start gap-4">
              <Checkbox checked={ss.confirmed} onCheckedChange={() => toggleSubsystem(ss.id)} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ss.name}</span>
                  <Badge variant="secondary" className="text-[10px]">AI</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ss.reason}</p>
                {ss.relatedContradictions.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {ss.relatedContradictions.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px] font-mono">{c}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ── Step 4: SCAMPER ──
  function renderScamper() {
    const confirmedSubs = subsystems.filter((s) => s.confirmed);
    if (confirmedSubs.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">請先在「子系統定義」中確認至少一個子系統</p>
          <Button variant="secondary" onClick={() => setCurrentStep(2)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 回到子系統定義
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {confirmedSubs.map((ss) => {
          const variants = scamperVariants.filter((v) => v.subsystemId === ss.id);
          return (
            <div key={ss.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h4 className="text-sm font-semibold">{ss.name}</h4>
                <Badge variant="secondary" className="text-[10px]">{variants.filter(v => v.adopted).length}/{variants.length} 已採用</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variants.map((v) => (
                  <Card key={v.id} className={`transition-all ${v.adopted ? "border-primary/30 bg-primary/[0.03]" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[10px] bg-accent text-accent-foreground">{v.action}</Badge>
                        <span className="text-xs text-muted-foreground">{SCAMPER_LABELS[v.action].zh}</span>
                        <Badge variant="secondary" className="text-[9px] ml-auto">AI</Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{v.description}</p>
                      <Button
                        size="sm"
                        variant={v.adopted ? "default" : "outline"}
                        className="text-xs"
                        onClick={() => toggleScamperAdopt(v.id)}
                      >
                        {v.adopted ? "✓ 已採用" : "採用"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Step 5: Alternatives ──
  function renderAlternatives() {
    return (
      <div className="space-y-4">
        {alternatives.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground font-medium">尚無方案</p>
            <p className="text-sm text-muted-foreground">整合前四步成果，建立概念方案</p>
          </div>
        ) : (
          alternatives.map((alt, i) => (
            <Card key={alt.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">方案 {i + 1}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{alt.source}</Badge>
                </div>
                <Input
                  className="text-sm font-medium"
                  placeholder="方案名稱 ★"
                  value={alt.name}
                  onChange={(e) => {
                    setAlternatives((prev) => prev.map((a) => (a.id === alt.id ? { ...a, name: e.target.value } : a)));
                    autoSave();
                  }}
                />
                <Textarea
                  placeholder="機制說明 ★ (至少 20 字元)"
                  value={alt.mechanism}
                  rows={3}
                  className="text-sm leading-relaxed"
                  onChange={(e) => {
                    setAlternatives((prev) => prev.map((a) => (a.id === alt.id ? { ...a, mechanism: e.target.value } : a)));
                    autoSave();
                  }}
                />
                {alt.keyAssumptionIds.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">關聯假設:</span>
                    {alt.keyAssumptionIds.map((aid) => {
                      const assumption = assumptionMap.get(aid);
                      return (
                        <div key={aid} className="flex items-start gap-2 text-xs bg-muted/30 rounded-md p-2">
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {assumption?.code ?? aid}
                          </Badge>
                          <span className="text-muted-foreground line-clamp-1">
                            {assumption?.description ?? "（假設未找到）"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}

        <div className="flex gap-3">
          <Button size="sm" variant="secondary" onClick={addManualAlternative}>
            <Plus className="h-4 w-4 mr-1.5" /> 手動新增
          </Button>
          <Button size="sm" variant="secondary" onClick={handleAiGenAlts} disabled={aiLoading.alts}>
            {aiLoading.alts ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            AI 整合生成
            <Badge variant="secondary" className="text-[9px] ml-1.5">AI</Badge>
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 6: MUST ──
  function renderMust() {
    if (alternatives.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">請先在「方案整合」中建立方案</p>
          <Button variant="secondary" onClick={() => setCurrentStep(4)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 回到方案整合
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">{passedMustAlts.length} 通過</Badge>
          <Badge className="bg-destructive/10 text-destructive border-0 px-3 py-1">{alternatives.filter((a) => Object.values(a.mustScores).includes("fail")).length} 淘汰</Badge>
          <Badge className="bg-muted text-muted-foreground border-0 px-3 py-1">{alternatives.filter((a) => Object.values(a.mustScores).includes("marginal")).length} 待定</Badge>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">方案</th>
                {MUST_CRITERIA.map((c) => (
                  <th key={c.id} className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">{c.label}</th>
                ))}
                <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">結果</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => {
                const hasFail = Object.values(alt.mustScores).includes("fail");
                return (
                  <tr key={alt.id} className={`border-b transition-colors ${hasFail ? "opacity-50" : "hover:bg-muted/30"}`}>
                    <td className={`py-3 px-3 text-sm max-w-[160px] truncate ${hasFail ? "line-through" : ""}`}>{alt.name || "(未命名)"}</td>
                    {MUST_CRITERIA.map((c) => (
                      <td key={c.id} className="text-center py-3 px-3 cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
                        {mustCell(alt.mustScores[c.id])}
                      </td>
                    ))}
                    <td className="text-center py-3 px-3">
                      {hasFail ? <Badge variant="destructive" className="text-[10px]">淘汰</Badge>
                        : Object.values(alt.mustScores).every((v) => v === "pass") ? <Badge className="bg-primary text-primary-foreground text-[10px]">通過</Badge>
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
          {alternatives.map((alt) => {
            const hasFail = Object.values(alt.mustScores).includes("fail");
            return (
              <Card key={alt.id} className={hasFail ? "opacity-50" : ""}>
                <CardContent className="p-4 space-y-3">
                  <p className={`text-sm font-medium ${hasFail ? "line-through" : ""}`}>{alt.name || "(未命名)"}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {MUST_CRITERIA.map((c) => (
                      <div key={c.id} className="text-center cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
                        <p className="text-[10px] text-muted-foreground mb-1">{c.id}</p>
                        {mustCell(alt.mustScores[c.id])}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 7: Pre-CAD ──
  function renderPreCad() {
    const eligible = alternatives.filter((a) => !Object.values(a.mustScores).includes("fail") && Object.values(a.mustScores).some((v) => v !== null));
    if (eligible.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">請先在 MUST 快篩中完成評估</p>
          <Button variant="secondary" onClick={() => setCurrentStep(5)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 回到 MUST 快篩
          </Button>
        </div>
      );
    }

    // Multi-select for comparison
    const toggleCompare = (altId: string) => {
      setComparedAltIds((prev) => {
        const next = new Set(prev);
        next.has(altId) ? next.delete(altId) : next.add(altId);
        return next;
      });
    };

    // Ensure at least the first eligible is selected for editing
    const editingAlt = eligible.find((a) => a.id === selectedAltId) ?? eligible[0];
    // For radar comparison, use checked items or all if none checked
    const comparedAlts = eligible.filter((a) => comparedAltIds.has(a.id));
    const radarAlts = comparedAlts.length > 0 ? comparedAlts : eligible;

    // Build radar data with multiple series
    const radarData = PRECAD_DIMENSIONS.map((d) => {
      const entry: Record<string, any> = { subject: d.label, fullMark: 5 };
      radarAlts.forEach((a) => {
        entry[a.id] = a.preCadScores[d.key as keyof typeof a.preCadScores] ?? 0;
      });
      return entry;
    });

    return (
      <div className="space-y-6">
        {/* Multi-select: checkboxes for comparison + click to edit */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">勾選方案加入比較圖，點擊名稱編輯評分</p>
          <div className="space-y-2">
            {eligible.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${editingAlt.id === a.id ? "border-primary bg-primary/[0.03]" : "hover:bg-muted/30"}`}
                onClick={() => setSelectedAltId(a.id)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={comparedAltIds.has(a.id)}
                    onCheckedChange={() => toggleCompare(a.id)}
                  />
                </div>
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
                />
                <span className="text-sm font-medium flex-1 truncate">{a.name || "(未命名)"}</span>
                {a.overallPass === true && <Badge className="bg-primary text-primary-foreground text-[10px]">通過</Badge>}
                {a.overallPass === false && <Badge variant="destructive" className="text-[10px]">不通過</Badge>}
                {a.overallPass === null && <Badge variant="secondary" className="text-[10px]">待評</Badge>}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scoring for selected alt */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-sm font-semibold">評分：{editingAlt.name || "(未命名)"}</span>
            </div>
            {PRECAD_DIMENSIONS.map((dim) => {
              const val = editingAlt.preCadScores[dim.key as keyof typeof editingAlt.preCadScores] ?? 1;
              return (
                <div key={dim.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{dim.label}</span>
                    <Badge variant={val >= 3 ? "default" : "destructive"} className="text-xs">{val}/5</Badge>
                  </div>
                  <Slider min={1} max={5} step={1} value={[val]} onValueChange={([v]) => updatePreCadScore(editingAlt.id, dim.key, v)} />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{dim.labels[0]}</span><span>{dim.labels[2]}</span><span>{dim.labels[4]}</span>
                  </div>
                </div>
              );
            })}
            <div className="pt-3">
              {editingAlt.overallPass === true
                ? <Badge className="bg-primary text-primary-foreground px-3 py-1">✅ 通過 — 可進入 CAD</Badge>
                : editingAlt.overallPass === false
                ? <Badge variant="destructive" className="px-3 py-1">❌ 不通過 — 有維度 &lt; 3</Badge>
                : <Badge variant="secondary" className="px-3 py-1">待完成評分</Badge>}
            </div>
          </div>

          {/* Radar comparison chart */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              {comparedAlts.length > 0 ? `比較 ${comparedAlts.length} 個方案` : "全部方案總覽"}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                {radarAlts.map((a, i) => (
                  <Radar
                    key={a.id}
                    name={a.name || "(未命名)"}
                    dataKey={a.id}
                    stroke={RADAR_COLORS[eligible.indexOf(a) % RADAR_COLORS.length]}
                    fill={RADAR_COLORS[eligible.indexOf(a) % RADAR_COLORS.length]}
                    fillOpacity={0.1}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center">
              {radarAlts.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: RADAR_COLORS[eligible.indexOf(a) % RADAR_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{a.name || "(未命名)"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Gate section (only on step 6 or 7) ──
  function renderGates() {
    if (currentStep < 5) return null;

    return (
      <div className="space-y-4 mt-2">
        <Separator />
        {/* Gate 2.2 */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">Gate 2.2 — 方案創造完整性</h3>
              <Badge className={gate22Items.every((i) => i.passed) ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"} >
                {gate22Items.every((i) => i.passed) ? "Passed" : "未通過"}
              </Badge>
            </div>
            <div className="space-y-2">
              {gate22Items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.passed ? <CheckCircle className="h-4 w-4 text-primary shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className={item.passed ? "" : "text-muted-foreground"}>{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{item.current}/{item.target}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phase Gate 2 */}
        {currentStep === 6 && (
          <Card className="border-2 border-accent/30 bg-accent/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-accent shrink-0" />
                <h3 className="text-sm font-semibold">Phase Gate 2 — Diverge 完成</h3>
                <Badge className={phaseGate2Items.every((i) => i.passed) ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}>
                  {phaseGate2Items.every((i) => i.passed) ? "Phase 2 Passed ★" : "未通過"}
                </Badge>
              </div>
              <div className="space-y-2">
                {phaseGate2Items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {item.passed ? <CheckCircle className="h-4 w-4 text-primary shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={item.passed ? "" : "text-muted-foreground"}>{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{item.current}/{item.target}</span>
                  </div>
                ))}
              </div>
              {gate22Items.every((i) => i.passed) && phaseGate2Items.every((i) => i.passed) ? (
                <Button onClick={() => navigate(`/projects/${id}/review`)} className="w-full sm:w-auto mt-2">
                  通過 Phase Gate 2 → 進入 Review <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block"><Button disabled className="w-full sm:w-auto opacity-50 mt-2">進入 Review → <ArrowRight className="h-4 w-4 ml-1" /></Button></span>
                  </TooltipTrigger>
                  <TooltipContent><p>請完成所有 Gate 條件</p></TooltipContent>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
        </Button>
        {saveStatus !== "idle" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && <><Check className="h-3 w-3 text-primary" /> Saved</>}
          </span>
        )}
      </div>

      {/* Mission Context (sticky) */}
      <MissionContext {...MOCK_MISSION} />

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          方案創造
          <HelpTooltip text="透過 7 個子步驟系統性地產生並篩選設計方案。每步聚焦一件事，逐步收斂至最優方案。" className="ml-2 align-middle" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Step 2.2–2.3 · 逐步展開</p>
      </div>

      {/* Stepper */}
      <CreateStepper
        steps={STEPS}
        statuses={stepStatuses}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Current step header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {currentStep + 1}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{STEPS[currentStep].label}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {renderStepContent()}
      </div>

      {/* Gates (only on MUST/Pre-CAD steps) */}
      {renderGates()}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={goPrev} disabled={currentStep === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
        </Button>
        <span className="text-xs text-muted-foreground">{currentStep + 1} / {STEPS.length}</span>
        {currentStep < 6 ? (
          <Button onClick={goNext}>
            下一步 <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
