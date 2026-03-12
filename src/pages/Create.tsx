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
  ArrowRight, Flag, CheckCircle, XCircle, ChevronLeft, Pencil, Trash2
} from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";
import type {
  AntiAnchorRoute, TrizSolution, Subsystem, ScamperVariant,
  Alternative, AccordionStepStatus, TrizPath, TrizActionStatus, CreateGateItem,
  SubsystemSource
} from "@/types/create";
import { MUST_CRITERIA, PRECAD_DIMENSIONS, SCAMPER_LABELS } from "@/types/create";
import {
  mockAntiAnchorRoutes, mockTrizSolutions, mockSubsystems,
  mockScamperVariants, mockAlternatives, mockAntiAnchorWarning
} from "@/data/mockCreate";
import { mockTrackAssumptions } from "@/data/mockTrack";
import { mockStepKnowledgeRefs } from "@/data/mockKnowledgeRefs";
import { MissionContext } from "@/components/create/MissionContext";
import { CreateStepper } from "@/components/create/CreateStepper";
import { KnowledgeRefsPanel } from "@/components/create/KnowledgeRefsPanel";
import { SubsystemBlockDiagram } from "@/components/create/SubsystemBlockDiagram";
import { LayoutGrid, List } from "lucide-react";
import ConvergenceGraph from "@/components/solution/ConvergenceGraph";
import { useConvergenceLoop } from "@/hooks/useConvergenceLoop";
import { ConvergenceDashboard } from "@/components/create/ConvergenceDashboard";
import { BranchExplorationPanel } from "@/components/create/BranchExplorationPanel";
import { HumanReviewPanel } from "@/components/create/HumanReviewPanel";
import { ArchitectureHaltOverlay } from "@/components/create/ArchitectureHaltOverlay";
import { MultiSolutionAdoptionPanel } from "@/components/create/MultiSolutionAdoptionPanel";
import { mockAdoptionState } from "@/data/mockConceptRoutes";
import type { ConceptRoute } from "@/types/conceptRoute";

const RADAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "#10B981",
];

const STEPS = [
  { label: "Anti-Anchor Sprint", shortLabel: "Anti-Anchor", description: "AI 產出非典型架構概念，打破路徑依賴" },
  { label: "TRIZ 解矛盾", shortLabel: "TRIZ", description: "針對已識別的矛盾，透過 TRIZ 三路徑找到解法" },
  { label: "子系統定義", shortLabel: "子系統", description: "識別受矛盾影響的子系統，聚焦變形範圍" },
  { label: "SCAMPER 變形", shortLabel: "SCAMPER", description: "對每個子系統執行 7 種創意動作，產生變異方案" },
  { label: "方案整合", shortLabel: "方案", description: "整合前四步成果，建立完整的概念方案" },
  { label: "MUST 快篩", shortLabel: "MUST", description: "以必要條件（M1-M6）快速淘汰不可行方案" },
  { label: "Pre-CAD 審查", shortLabel: "Pre-CAD", description: "五維審查：MUST/解耦/可驗證性/失效機制/MVP CAD" },
];

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

// Mock AI-generated Anti-Anchor routes
const MOCK_AI_ANTIANCHOR: AntiAnchorRoute[] = [
  { id: "aar-ai-001", name: "直驅輪轂方案", description: "完全捨棄傳統中驅+傳動系統，改用輪轂馬達直接驅動後輪，消除傳動效率損失與噪音來源。與競品在物理介面上完全不相容。" },
  { id: "aar-ai-002", name: "磁力耦合無接觸傳動方案", description: "以磁力耦合器取代機械齒輪嚙合，實現非接觸傳動。消除齒輪磨耗噪音，簡化密封設計，但需克服扭矩傳遞效率問題。" },
  { id: "aar-ai-003", name: "液壓靜態傳動方案", description: "以微型液壓泵-馬達迴路替代機械傳動鏈，實現無段變速。運轉噪音極低但系統重量與成本需評估。屬非對標路線。" },
];

export default function Create() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [currentStep, setCurrentStep] = useState(0);

  // Data
  const [routes, setRoutes] = useState<AntiAnchorRoute[]>([]);
  const [antiAnchorGenerated, setAntiAnchorGenerated] = useState(false);
  const [trizSolutions, setTrizSolutions] = useState<TrizSolution[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [scamperVariants, setScamperVariants] = useState<ScamperVariant[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);
  const [comparedAltIds, setComparedAltIds] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const convergenceLoop = useConvergenceLoop();
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [conceptRoutes, setConceptRoutes] = useState<ConceptRoute[]>([]);
  const [subsystemView, setSubsystemView] = useState<"diagram" | "list">("diagram");
  const [showAddSubsystemForm, setShowAddSubsystemForm] = useState(false);
  const [editingSubsystemId, setEditingSubsystemId] = useState<string | null>(null);
  const [ssFormName, setSsFormName] = useState("");
  const [ssFormReason, setSsFormReason] = useState("");
  const [ssFormContradictions, setSsFormContradictions] = useState<string[]>([]);
  const [ssFormInterfaces, setSsFormInterfaces] = useState("");

  const assumptionMap = useMemo(() => {
    const map = new Map<string, { code: string; description: string }>();
    const assumptions = mockTrackAssumptions[id ?? ""] ?? [];
    assumptions.forEach((a) => map.set(a.id, { code: a.assumptionCode, description: a.description }));
    return map;
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (id) {
        const existing = mockAntiAnchorRoutes[id] ?? [];
        setRoutes(existing);
        setAntiAnchorGenerated(existing.length > 0);
        setTrizSolutions(mockTrizSolutions[id] ?? []);
        setSubsystems(mockSubsystems[id] ?? []);
        setScamperVariants(mockScamperVariants[id] ?? []);
        setAlternatives(mockAlternatives[id] ?? []);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [id]);

  const stepStatuses: AccordionStepStatus[] = useMemo(() => {
    const s1 = routes.length >= 3 ? "complete" : routes.length > 0 ? "in_progress" : "not_started";
    const s2 = convergenceLoop.state.status === "converged" ? "complete" : convergenceLoop.state.status !== "idle" ? "in_progress" : "not_started";
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
  }, [routes, convergenceLoop.state.status, subsystems, scamperVariants, alternatives]);

  const autoSave = useCallback(() => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
  }, []);

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
  const handleAiGenAntiAnchor = async () => {
    setAiLoading((p) => ({ ...p, antiAnchor: true }));
    await new Promise((r) => setTimeout(r, 2000));
    setRoutes(MOCK_AI_ANTIANCHOR);
    setAntiAnchorGenerated(true);
    setAiLoading((p) => ({ ...p, antiAnchor: false }));
    toast.success("AI 已產出 3 條非典型架構概念");
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
  const addSubsystem = () => {
    if (!ssFormName.trim()) { toast.error("請輸入子系統名稱"); return; }
    const newSs: Subsystem = {
      id: `ss-rd-${Date.now()}`, name: ssFormName.trim(), reason: ssFormReason.trim(),
      relatedContradictions: ssFormContradictions, confirmed: true, source: "rd",
      interfaces: ssFormInterfaces.trim() ? ssFormInterfaces.split(",").map(s => s.trim()).filter(Boolean) : [],
    };
    setSubsystems(prev => [...prev, newSs]);
    resetSsForm();
    setShowAddSubsystemForm(false);
    toast.success("已新增 RD 定義子系統");
    autoSave();
  };
  const startEditSubsystem = (ssId: string) => {
    const ss = subsystems.find(s => s.id === ssId);
    if (!ss) return;
    setEditingSubsystemId(ssId);
    setSsFormName(ss.name);
    setSsFormReason(ss.reason);
    setSsFormContradictions([...ss.relatedContradictions]);
    setSsFormInterfaces(ss.interfaces?.join(", ") ?? "");
  };
  const saveEditSubsystem = () => {
    if (!editingSubsystemId || !ssFormName.trim()) return;
    setSubsystems(prev => prev.map(s => {
      if (s.id !== editingSubsystemId) return s;
      return {
        ...s, name: ssFormName.trim(), reason: ssFormReason.trim(),
        relatedContradictions: ssFormContradictions,
        interfaces: ssFormInterfaces.trim() ? ssFormInterfaces.split(",").map(x => x.trim()).filter(Boolean) : [],
        source: s.source === "ai" ? "ai_edited" : s.source,
      };
    }));
    resetSsForm();
    setEditingSubsystemId(null);
    toast.success("子系統已更新");
    autoSave();
  };
  const deleteSubsystem = (ssId: string) => {
    setSubsystems(prev => prev.filter(s => s.id !== ssId));
    toast.success("已刪除子系統");
    autoSave();
  };
  const resetSsForm = () => {
    setSsFormName(""); setSsFormReason(""); setSsFormContradictions([]); setSsFormInterfaces("");
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
      keyAssumptionIds: [], mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null },
      interfaceContract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' },
      preCadScores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null },
      overallPass: null,
    };
    setAlternatives((prev) => [...prev, newAlt]);
    toast.success("已新增空白方案");
  };
  const deleteAlternative = (altId: string) => {
    setAlternatives(prev => prev.filter(a => a.id !== altId));
    toast.success("方案已刪除");
    autoSave();
  };
  const handleAiGenAlts = async () => {
    setAiLoading((p) => ({ ...p, alts: true }));
    await new Promise((r) => setTimeout(r, 2000));
    const newAlt: Alternative = {
      id: `alt-ai-${Date.now()}`, name: "AI 整合：蜂巢夾層 + 磁力耦合方案",
      mechanism: "AI 整合 TRIZ 分割原理與 SCAMPER 替代建議，採用蜂巢夾層殼體搭配磁力耦合傳動，在減重 35% 的同時維持結構剛度，傳動效率提升至 92%。",
      source: "ai_integrated", keyAssumptionIds: ["ta-001", "ta-003"],
      mustScores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null },
      interfaceContract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' },
      preCadScores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null },
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderAntiAnchor();
      case 1: return renderTrizConvergence();
      case 2: return renderSubsystem();
      case 3: return renderScamper();
      case 4: return renderAlternatives();
      case 5: return renderMust();
      case 6: return renderPreCad();
      default: return null;
    }
  };

  // ── Step 1: Anti-Anchor (AI Generated) ──
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

        {!antiAnchorGenerated ? (
          <div className="text-center py-16 space-y-4 bg-muted/30 rounded-xl border border-dashed">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">AI 將根據問題描述與矛盾句產出 3 條非典型架構</p>
              <p className="text-sm text-muted-foreground mt-1">至少 1 條必須與競品在物理介面或核心機制上不相容</p>
            </div>
            <Button onClick={handleAiGenAntiAnchor} disabled={aiLoading.antiAnchor} size="lg">
              {aiLoading.antiAnchor ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI 生成非典型架構
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((r, i) => (
              <Card key={r.id} className="overflow-hidden border-l-[3px] border-l-accent">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">路線 {i + 1}</Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={handleAiGenAntiAnchor} disabled={aiLoading.antiAnchor} className="text-xs">
              {aiLoading.antiAnchor ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              重新生成
            </Button>
          </div>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            {routes.length >= 3
              ? <><CheckCircle className="h-5 w-5 text-primary shrink-0" /><span className="text-sm">Gate 2.2.1: ≥3 非典型架構已產出，含至少 1 條非對標路線</span></>
              : <><XCircle className="h-5 w-5 text-muted-foreground shrink-0" /><span className="text-sm text-muted-foreground">Gate 2.2.1: 需 AI 產出至少 3 條非典型架構概念</span></>}
          </CardContent>
        </Card>

        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[0] ?? []} />
      </div>
    );
  }

  // ── Step 2: TRIZ Convergence (AI Autonomous) ──
  function renderTrizConvergence() {
    const { state, startExploration, confirmSeverity, forceContinue, retryBranch } = convergenceLoop;

    return (
      <div className="space-y-5">
        {/* Safety valve: architecture halt overlay */}
        {(state.health === 'critical' || state.health === 'circular') && (
          <ArchitectureHaltOverlay
            health={state.health}
            onGoBack={() => navigate(`/projects/${id}/task-definition`)}
            onForceContinue={forceContinue}
          />
        )}

        {/* Idle state: launch exploration */}
        {state.status === 'idle' && (
          <Card className="border-dashed border-2 border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI 矛盾收斂探索</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  AI 將自動對每條矛盾進行深度探索（TC / PC / SF 三路徑），
                  掃描二次矛盾並分級（Fatal / Major / Minor），
                  持續迴圈直到所有 Fatal 和 Major 矛盾完全收斂。
                </p>
              </div>
              <Button onClick={startExploration} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                啟動 AI 矛盾收斂探索
                <Badge variant="secondary" className="text-[10px] ml-1">Fully Auto</Badge>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exploring / Converged: show dashboard + graph + branches */}
        {state.status !== 'idle' && (
          <>
            <ConvergenceDashboard state={state} />

            <ConvergenceGraph
              nodes={state.graph.nodes}
              edges={state.graph.edges}
            />

            <BranchExplorationPanel branches={state.branches} />
          </>
        )}

        {/* Converged: human review → multi-solution adoption */}
        {state.status === 'converged' && (
          <>
            <HumanReviewPanel
              branches={state.branches}
              riskRegister={state.riskRegister}
              onConfirm={() => setReviewConfirmed(true)}
              onRetry={retryBranch}
              onConfirmSeverity={confirmSeverity}
            />

            {reviewConfirmed && (
              <MultiSolutionAdoptionPanel
                adoptionState={mockAdoptionState}
                onConfirm={(routes) => {
                  setConceptRoutes(routes);
                  goNext();
                }}
              />
            )}
          </>
        )}

        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[1] ?? []} />
      </div>
    );
  }

  // ── Step 3: Subsystem ──
  function renderSubsystem() {
    const confirmedCount = subsystems.filter(s => s.confirmed).length;
    const rdCount = subsystems.filter(s => s.source === "rd").length;
    const aiCount = subsystems.filter(s => s.source === "ai").length;
    const aiEditedCount = subsystems.filter(s => s.source === "ai_edited").length;

    const renderSsInlineForm = (isEdit: boolean) => (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">{isEdit ? "編輯子系統" : "新增 RD 定義子系統"}</p>
          <Input placeholder="子系統名稱 *" value={ssFormName} onChange={e => setSsFormName(e.target.value)} />
          <Textarea placeholder="職責 / 原因描述" value={ssFormReason} onChange={e => setSsFormReason(e.target.value)} rows={2} />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">關聯矛盾</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_MISSION.contradictions.map(c => (
                <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={ssFormContradictions.includes(c.id.toLowerCase().replace("-", "-"))}
                    onCheckedChange={(checked) => {
                      const cId = c.id.toLowerCase().replace("-", "-");
                      setSsFormContradictions(prev => checked ? [...prev, cId] : prev.filter(x => x !== cId));
                    }}
                  />
                  <span>{c.id}: {c.description.slice(0, 30)}…</span>
                </label>
              ))}
            </div>
          </div>
          <Input placeholder="介面描述（逗號分隔，選填）" value={ssFormInterfaces} onChange={e => setSsFormInterfaces(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={isEdit ? saveEditSubsystem : addSubsystem}>
              {isEdit ? "儲存" : "確認新增"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { resetSsForm(); setShowAddSubsystemForm(false); setEditingSubsystemId(null); }}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { resetSsForm(); setShowAddSubsystemForm(true); setEditingSubsystemId(null); }}>
              <Plus className="h-3.5 w-3.5" /> 新增子系統
            </Button>
            <Badge variant="secondary" className="text-xs">{confirmedCount}/{subsystems.length} 已確認</Badge>
          </div>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button onClick={() => setSubsystemView("diagram")} className={`p-1.5 transition-colors ${subsystemView === "diagram" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`} title="區塊圖">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setSubsystemView("list")} className={`p-1.5 transition-colors ${subsystemView === "list" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`} title="列表">
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddSubsystemForm && !editingSubsystemId && renderSsInlineForm(false)}

        {/* Source statistics summary */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">子系統來源統計</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              本專案共 {subsystems.length} 個子系統：
              {rdCount > 0 && <><Badge variant="outline" className="text-[9px] mx-1 bg-primary/15 text-primary border-primary/30">RD {rdCount}</Badge></>}
              {aiCount > 0 && <><Badge variant="outline" className="text-[9px] mx-1 bg-muted border-muted-foreground/30">AI {aiCount}</Badge></>}
              {aiEditedCount > 0 && <><Badge variant="outline" className="text-[9px] mx-1 bg-accent/15 text-accent-foreground border-accent/30">AI+RD {aiEditedCount}</Badge></>}
              。已確認的子系統將作為 SCAMPER 變形的目標範圍。
            </p>
            {rdCount === 0 && (
              <p className="text-xs text-primary mt-1">💡 建議 RD 先定義已知的核心子系統，AI 將補充可能遺漏的部分。</p>
            )}
          </CardContent>
        </Card>

        {/* Edit form (shown above the diagram/list) */}
        {editingSubsystemId && renderSsInlineForm(true)}

        {subsystemView === "diagram" ? (
          <SubsystemBlockDiagram
            systemName={MOCK_MISSION.problemStatement}
            subsystems={subsystems}
            onToggle={toggleSubsystem}
            onEdit={startEditSubsystem}
            onDelete={deleteSubsystem}
          />
        ) : (
          subsystems.map((ss) => {
            const srcCfg: Record<string, { label: string; cls: string }> = {
              rd: { label: "RD", cls: "bg-primary/15 text-primary border-primary/30" },
              ai: { label: "AI", cls: "bg-muted border-muted-foreground/30" },
              ai_edited: { label: "AI+RD", cls: "bg-accent/15 text-accent-foreground border-accent/30" },
            };
            const cfg = srcCfg[ss.source] ?? srcCfg.ai;
            return (
              <Card
                key={ss.id}
                className={`transition-all cursor-pointer ${ss.confirmed ? "border-primary/30 bg-primary/[0.03]" : ""}`}
                onClick={() => toggleSubsystem(ss.id)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <Checkbox checked={ss.confirmed} onCheckedChange={() => toggleSubsystem(ss.id)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{ss.name}</span>
                      <Badge variant="outline" className={`text-[9px] ${cfg.cls}`}>{cfg.label}</Badge>
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
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); startEditSubsystem(ss.id); }} className="p-1 rounded hover:bg-muted"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                    {ss.source === "rd" && <button onClick={(e) => { e.stopPropagation(); deleteSubsystem(ss.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive" /></button>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[2] ?? []} />
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
                      {/* SCAMPER new contradiction feedback */}
                      {v.newContradictions && v.newContradictions.length > 0 && (
                        <div className="mt-2 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                          <p className="text-[10px] font-medium text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> 新矛盾回饋
                          </p>
                          {v.newContradictions.map((nc: string, ncIdx: number) => (
                            <p key={ncIdx} className="text-[10px] text-muted-foreground mt-0.5">{nc}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* SCAMPER confirmation */}
        {confirmedSubs.length > 0 && scamperVariants.some(v => v.adopted) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">確認 SCAMPER 變形結果</p>
                <p className="text-xs text-muted-foreground">
                  已採用 {scamperVariants.filter(v => v.adopted).length} 個變形。確認後進入方案整合。
                </p>
              </div>
              <Button onClick={() => { toast.success('SCAMPER 變形結果已確認'); goNext(); }} className="shrink-0">
                <Check className="h-4 w-4 mr-1" /> 確認並繼續
              </Button>
            </CardContent>
          </Card>
        )}
        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[3] ?? []} />
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">方案 {i + 1}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{alt.source}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteAlternative(alt.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

        {/* P3: Spec confirmation */}
        {alternatives.length > 0 && alternatives.some(a => a.name && a.mechanism && a.mechanism.length >= 20) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">確認方案規格</p>
                <p className="text-xs text-muted-foreground">
                  {alternatives.filter(a => a.name && a.mechanism).length} 個方案已填寫完整。確認後進入 MUST 快篩。
                </p>
              </div>
              <Button onClick={() => { toast.success('方案規格已確認'); goNext(); }} className="shrink-0">
                <Check className="h-4 w-4 mr-1" /> 確認方案規格
              </Button>
            </CardContent>
          </Card>
        )}
        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[4] ?? []} />
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
                  <th key={c.id} className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">{c.label}</th>
                ))}
                <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">結果</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => {
                const hasFail = Object.values(alt.mustScores).includes("fail");
                return (
                  <tr key={alt.id} className={`border-b transition-colors ${hasFail ? "opacity-50" : "hover:bg-muted/30"}`}>
                    <td className={`py-3 px-3 text-sm max-w-[140px] truncate ${hasFail ? "line-through" : ""}`}>{alt.name || "(未命名)"}</td>
                    {MUST_CRITERIA.map((c) => (
                      <td key={c.id} className="text-center py-3 px-2 cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
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
                  <div className="grid grid-cols-3 gap-2">
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
        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[5] ?? []} />
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

    const toggleCompare = (altId: string) => {
      setComparedAltIds((prev) => {
        const next = new Set(prev);
        next.has(altId) ? next.delete(altId) : next.add(altId);
        return next;
      });
    };

    const editingAlt = eligible.find((a) => a.id === selectedAltId) ?? eligible[0];
    const comparedAlts = eligible.filter((a) => comparedAltIds.has(a.id));
    const radarAlts = comparedAlts.length > 0 ? comparedAlts : eligible;

    const radarData = PRECAD_DIMENSIONS.map((d) => {
      const entry: Record<string, any> = { subject: d.label, fullMark: 5 };
      radarAlts.forEach((a) => {
        entry[a.id] = a.preCadScores[d.key as keyof typeof a.preCadScores] ?? 0;
      });
      return entry;
    });

    return (
      <div className="space-y-6">
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

        {/* P3: Pre-CAD Gate Confirmation */}
        {preCadPassedAlts.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">確認 Pre-CAD 審查結果</p>
                <p className="text-xs text-muted-foreground">
                  {preCadPassedAlts.length} 個方案通過 Pre-CAD 五維審查。確認後進入 CAD 繪製階段。
                </p>
              </div>
              <Button onClick={() => toast.success('Pre-CAD 審查結果已確認')} className="shrink-0">
                <Check className="h-4 w-4 mr-1" /> 確認審查結果
              </Button>
            </CardContent>
          </Card>
        )}
        <KnowledgeRefsPanel refs={mockStepKnowledgeRefs[6] ?? []} />
      </div>
    );
  }

  // ── Gate section ──
  function renderGates() {
    if (currentStep < 5) return null;

    return (
      <div className="space-y-4 mt-2">
        <Separator />
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
                <Button onClick={() => navigate(`/projects/${id}/cad`)} className="w-full sm:w-auto mt-2">
                  通過 Phase Gate 2 → 進入 CAD 繪製 <ArrowRight className="h-4 w-4 ml-1.5" />
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

      <MissionContext {...MOCK_MISSION} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          方案創造
          <HelpTooltip text="透過 7 個子步驟系統性地產生並篩選設計方案。每步聚焦一件事，逐步收斂至最優方案。" className="ml-2 align-middle" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Step 2.2–2.3 · 逐步展開</p>
      </div>

      <CreateStepper
        steps={STEPS}
        statuses={stepStatuses}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

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

      <div className="min-h-[300px]">
        {renderStepContent()}
      </div>

      {renderGates()}

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
