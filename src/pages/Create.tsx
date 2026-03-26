import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
import { AiButton } from "@/components/ui/ai-button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";
import type {
  AntiAnchorRoute, TrizSolution, Subsystem, ScamperVariant, ScamperNewContradiction,
  Alternative, AccordionStepStatus, TrizPath, TrizActionStatus, CreateGateItem,
  SubsystemSource
} from "@/types/create";
import { DEFAULT_MUST_CRITERIA, PRECAD_DIMENSIONS, SCAMPER_LABELS } from "@/types/create";
import type { MustCriterion } from "@/types/create";
// TODO: mockAntiAnchorWarning — AI-generated warning, keep on frontend until AI integration (Sprint 3+)
import { mockAntiAnchorWarning } from "@/data/mockCreate";
import {
  useAntiAnchorRoutes,
  useCreateAntiAnchorRoute,
  useUpdateAntiAnchorRoute,
  useDeleteAntiAnchorRoute,
  useTrizSolutions,
  useUpdateTrizSolution,
  useSubsystems,
  useCreateSubsystem,
  useUpdateSubsystem,
  useDeleteSubsystem,
  useScamperVariants,
  useUpdateScamperVariant,
  useAlternatives,
  useCreateAlternative,
  useUpdateAlternative,
  useDeleteAlternative,
} from "@/hooks/api";
import { useContradictions } from "@/hooks/api/useContradictions";
import type { Json } from "@/integrations/supabase/types";
import { useTrackAssumptions } from "@/hooks/api/useTrack";
import { useBrief, useConstraints, useKpis } from "@/hooks/api/useBrief";
import { antiAnchorGenerate, trizSolve, scamperTransform, riskAnalyze, mustEvaluate, validationPassportGenerate } from "@/lib/api";
import type { MustCriterionResult } from "@/lib/api";
import { useProject } from "@/hooks/api/useProjects";
// TODO: Replace mockStepKnowledgeRefs with a useKnowledgeRefs hook once a knowledge_refs DB table is created (Sprint 5+)
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
import { useConceptRoutes, useCompatibilityPairs } from "@/hooks/api/useConceptRoutes";
// TODO: Replace with API when available — AI-generated adoption state, no dedicated DB table yet
import { mockAdoptionState } from "@/data/mockConceptRoutes";
import type { ConceptRoute, MultiSolutionAdoptionState } from "@/types/conceptRoute";

const RADAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "#10B981",
];

const STEPS = [
  { label: "反向探索 Anti-Anchor", shortLabel: "Anti-Anchor", description: "跳脫既有假設，AI 產出非典型架構，注入新矛盾至反向路徑 TRIZ", zone: "reverse" as const },
  { label: "TRIZ 解矛盾", shortLabel: "TRIZ", description: "針對已識別的矛盾，透過 TRIZ 三路徑找到解法", zone: "forward" as const },
  { label: "子系統定義", shortLabel: "子系統", description: "識別受矛盾影響的子系統，聚焦變形範圍", zone: "forward" as const },
  { label: "SCAMPER 變形", shortLabel: "SCAMPER", description: "對每個子系統執行 7 種創意動作，產生變異方案", zone: "forward" as const },
  { label: "候選方案決策中心", shortLabel: "決策中心", description: "攤平兩條路徑的所有方案，橫向比較來源、機制、假設、驗證需求與信心等級", zone: "hub" as const },
  { label: "MUST 快篩", shortLabel: "MUST", description: "以必要條件（M1-M6）快速淘汰不可行方案", zone: "eval" as const },
  { label: "Pre-CAD 審查", shortLabel: "Pre-CAD", description: "五維審查：MUST/解耦/可驗證性/失效機制/MVP CAD", zone: "eval" as const },
];

const ZONE_LABELS: Record<string, { badge: string; color: string }> = {
  reverse: { badge: "反向路徑", color: "bg-amber-100 text-amber-700" },
  forward: { badge: "正向路徑", color: "bg-blue-100 text-blue-700" },
  hub: { badge: "決策中心", color: "bg-violet-100 text-violet-700" },
  eval: { badge: "統一評估", color: "bg-green-100 text-green-700" },
};

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTrack, setActiveTrack] = useState<"reverse" | "forward" | null>("reverse");

  // ── Project data (for must_criteria_config) ──
  const projectQuery = useProject(id);
  const mustCriteria: MustCriterion[] = useMemo(() => {
    const config = projectQuery.data?.must_criteria_config;
    if (config && config.length > 0) return config;
    return DEFAULT_MUST_CRITERIA;
  }, [projectQuery.data]);
  const MUST_KEYS = useMemo(() => mustCriteria.map(c => c.id), [mustCriteria]);

  // AI MUST evaluation results (keyed by altId)
  const [mustAiResults, setMustAiResults] = useState<Record<string, MustCriterionResult[]>>({});

  // ── API Hooks: queries ──
  const antiAnchorQuery = useAntiAnchorRoutes(id);
  const trizQuery = useTrizSolutions(id);
  const subsystemsQuery = useSubsystems(id);
  const scamperQuery = useScamperVariants(id);
  const alternativesQuery = useAlternatives(id);
  const conceptRoutesQuery = useConceptRoutes(id);
  const compatibilityPairsQuery = useCompatibilityPairs(id);
  const trackAssumptionsQuery = useTrackAssumptions(id);
  const contradictionsQuery = useContradictions(id);

  // ── Phase 1 context ──
  const { data: brief } = useBrief(id);
  const { data: briefConstraints = [] } = useConstraints(id);
  const { data: briefKpis = [] } = useKpis(id);

  const briefMission = brief?.mission || '';
  const constraintStrings = useMemo(
    () => briefConstraints.map((c) => `[${c.constraintCode}] ${c.description} (${c.type})`),
    [briefConstraints],
  );
  const kpiStrings = useMemo(
    () => briefKpis.map((k) => `${k.kpiName}: ${k.targetValue} ${k.unit}`),
    [briefKpis],
  );
  const contradictionDescs = useMemo(
    () => (contradictionsQuery.data || []).map((c) => c.naturalDescription),
    [contradictionsQuery.data],
  );

  // ── API Hooks: mutations ──
  const createAntiAnchorRoute = useCreateAntiAnchorRoute();
  const updateAntiAnchorRoute = useUpdateAntiAnchorRoute();
  const deleteAntiAnchorRouteMut = useDeleteAntiAnchorRoute();
  const updateTrizSolution = useUpdateTrizSolution();
  const createSubsystem = useCreateSubsystem();
  const updateSubsystemMut = useUpdateSubsystem();
  const deleteSubsystemMut = useDeleteSubsystem();
  const updateScamperVariant = useUpdateScamperVariant();
  const createAlternative = useCreateAlternative();
  const updateAlternativeMut = useUpdateAlternative();
  const deleteAlternativeMut = useDeleteAlternative();

  // ── Derived data from queries (with local overrides for optimistic UI) ──
  const [localRoutes, setLocalRoutes] = useState<AntiAnchorRoute[]>([]);
  const [localTrizSolutions, setLocalTrizSolutions] = useState<TrizSolution[]>([]);
  const [localSubsystems, setLocalSubsystems] = useState<Subsystem[]>([]);
  const [localScamperVariants, setLocalScamperVariants] = useState<ScamperVariant[]>([]);
  const [localAlternatives, setLocalAlternatives] = useState<Alternative[]>([]);

  // Sync query data → local state
  useEffect(() => { setLocalRoutes(antiAnchorQuery.data); }, [antiAnchorQuery.data]);
  useEffect(() => { setLocalTrizSolutions(trizQuery.data); }, [trizQuery.data]);
  useEffect(() => { setLocalSubsystems(subsystemsQuery.data); }, [subsystemsQuery.data]);
  useEffect(() => { setLocalScamperVariants(scamperQuery.data); }, [scamperQuery.data]);
  useEffect(() => { setLocalAlternatives(alternativesQuery.data); }, [alternativesQuery.data]);

  // Use local state as the working data (allows optimistic updates)
  const routes = localRoutes;
  const trizSolutions = localTrizSolutions;
  const subsystems = localSubsystems;
  const scamperVariants = localScamperVariants;
  const alternatives = localAlternatives;

  // Derived: true when DB or optimistic routes exist (no separate state needed)
  const antiAnchorGenerated = routes.length > 0;
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);
  const [comparedAltIds, setComparedAltIds] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const convergenceLoop = useConvergenceLoop({
    projectId: id,
    contradictions: contradictionsQuery.data ?? [],
    alternatives: alternatives.map((a) => ({
      id: a.id,
      name: a.name,
      mechanism: a.mechanism,
      source: a.source,
      resolves_contradiction_ids: a.keyAssumptionIds ?? [],
    })),
    mission: briefMission,
    constraints: constraintStrings,
    kpis: kpiStrings,
  });
  // Auto-trigger Phase B when Phase A converged and alternatives become available
  const phaseAConverged = convergenceLoop.state.phase === 'A' && convergenceLoop.state.status === 'converged';
  useEffect(() => {
    if (phaseAConverged && alternatives.length > 0 && (contradictionsQuery.data?.length ?? 0) > 0) {
      convergenceLoop.startExploration(); // will auto-detect Phase B
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseAConverged, alternatives.length]);

  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [conceptRoutes, setConceptRoutes] = useState<ConceptRoute[]>([]);
  const [subsystemView, setSubsystemView] = useState<"diagram" | "list">("diagram");
  const [showAddSubsystemForm, setShowAddSubsystemForm] = useState(false);
  const [editingSubsystemId, setEditingSubsystemId] = useState<string | null>(null);
  const [ssFormName, setSsFormName] = useState("");
  const [ssFormReason, setSsFormReason] = useState("");
  const [ssFormContradictions, setSsFormContradictions] = useState<string[]>([]);
  const [ssFormInterfaces, setSsFormInterfaces] = useState("");

  // Loading state — true while any query is loading
  const isLoading = antiAnchorQuery.isLoading || trizQuery.isLoading || subsystemsQuery.isLoading || scamperQuery.isLoading || alternativesQuery.isLoading;

  // antiAnchorGenerated is now derived from routes.length — no effect needed

  // ── Computed: Multi-Solution Adoption State from DB (fallback to mock) ──
  const adoptionState: MultiSolutionAdoptionState = useMemo(() => {
    const dbRoutes = conceptRoutesQuery.data;
    const dbPairs = compatibilityPairsQuery.data;

    // If DB has data, build state from it; otherwise fall back to mock
    if (dbRoutes && dbRoutes.length > 0 && dbPairs && dbPairs.length > 0) {
      return {
        matrix: {
          // TODO: Build solutions list from convergence loop output or DB query
          solutions: mockAdoptionState.matrix.solutions,
          pairs: dbPairs,
        },
        recommendedRoutes: dbRoutes,
        // TODO: Compute anti-pattern checks from routes + pairs via AI API
        antiPatternChecks: mockAdoptionState.antiPatternChecks,
      };
    }
    return mockAdoptionState;
  }, [conceptRoutesQuery.data, compatibilityPairsQuery.data]);

  const assumptionMap = useMemo(() => {
    const map = new Map<string, { code: string; description: string }>();
    const assumptions = trackAssumptionsQuery.data ?? [];
    assumptions.forEach((a) => map.set(a.id, { code: a.assumptionCode, description: a.description }));
    return map;
  }, [trackAssumptionsQuery.data]);

  /** Map contradiction ID → short label for display */
  const contradictionMap = useMemo(() => {
    const map = new Map<string, string>();
    (contradictionsQuery.data ?? []).forEach((c) => {
      map.set(c.id, c.naturalDescription || c.engineeringStatement?.slice(0, 40) || c.id.slice(0, 8));
    });
    return map;
  }, [contradictionsQuery.data]);

  const getMustValues = (a: Alternative) => MUST_KEYS.map((k) => a.mustScores[k] ?? null);

  const stepStatuses: AccordionStepStatus[] = useMemo(() => {
    const s1 = routes.length >= 3 ? "complete" : routes.length > 0 ? "in_progress" : "not_started";
    // s2: TRIZ convergence — use DB trizSolutions when convergenceLoop hasn't run
    const loopDone = convergenceLoop.state.status === "converged";
    const hasTrizData = trizSolutions.length > 0;
    const s2 = loopDone || hasTrizData ? "complete" : convergenceLoop.state.status !== "idle" ? "in_progress" : "not_started";
    const confirmed = subsystems.filter((s) => s.confirmed).length;
    const s3 = confirmed > 0 ? "complete" : subsystems.length > 0 ? "in_progress" : "not_started";
    const adoptedSc = scamperVariants.filter((v) => v.adopted).length;
    const s4 = adoptedSc > 0 ? "complete" : scamperVariants.length > 0 ? "in_progress" : "not_started";
    const s5 = alternatives.length > 0 ? "complete" : "not_started";
    // s6: Only check M1-M6 keys, not the nested bundle fields
    const allMustFilled = alternatives.length > 0 && alternatives.every((a) => getMustValues(a).every((v) => v !== null));
    const s6 = allMustFilled ? "complete" : alternatives.some((a) => getMustValues(a).some((v) => v !== null)) ? "in_progress" : "not_started";
    const passedMust = alternatives.filter((a) => !getMustValues(a).includes("fail"));
    const allScored = passedMust.length > 0 && passedMust.every((a) => Object.values(a.preCadScores).every((v) => v !== null));
    const s7 = allScored ? "complete" : passedMust.some((a) => Object.values(a.preCadScores).some((v) => v !== null)) ? "in_progress" : "not_started";
    return [s1, s2, s3, s4, s5, s6, s7];
  }, [routes, convergenceLoop.state.status, trizSolutions, subsystems, scamperVariants, alternatives]);

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
    if (!id) return;
    setAiLoading((p) => ({ ...p, antiAnchor: true }));
    try {
      // Clear existing routes before regenerating
      for (const r of routes) {
        deleteAntiAnchorRouteMut.mutate({ id: r.id });
      }
      setLocalRoutes([]);

      const result = await antiAnchorGenerate({
        project_id: id,
        mission: briefMission || MOCK_MISSION.problemStatement,
        current_constraints: constraintStrings.length > 0
          ? constraintStrings
          : MOCK_MISSION.contradictions.map((c) => c.description),
        existing_alternatives: [],
      });
      // Optimistic: build display data from API result immediately
      const optimistic: AntiAnchorRoute[] = result.routes.map((route, i) => ({
        id: `aa-opt-${Date.now()}-${i}`,
        name: route.name,
        mechanism: route.mechanism,
        description: route.description || route.mechanism,
        whyUnconventional: route.why_unconventional,
        potentialAdvantage: route.potential_advantage,
        crossDomainSource: route.cross_domain_source,
        validationPassport: route.validation_passport as unknown as import("@/types/create").ValidationPassport | null,
        createdAt: new Date().toISOString(),
      }));
      setLocalRoutes(optimistic);

      // Persist to DB in background (query invalidation will replace optimistic IDs)
      for (const route of result.routes) {
        createAntiAnchorRoute.mutate({
          project_id: id,
          name: route.name,
          mechanism: route.mechanism,
          description: route.description,
          is_non_typical: route.is_non_typical,
          why_unconventional: route.why_unconventional,
          potential_advantage: route.potential_advantage,
          cross_domain_source: route.cross_domain_source,
          validation_passport: route.validation_passport as unknown as Json,
          source: 'ai',
        });
      }
      toast.success(`AI 已產出 ${result.routes.length} 條非典型架構概念`);
    } catch (err) {
      console.error("Anti-anchor generation failed:", err);
      toast.error("AI 產出失敗，請確認後端服務是否啟動");
    } finally {
      setAiLoading((p) => ({ ...p, antiAnchor: false }));
    }
  };

  // TRIZ state transition guard — preserve traceability of human edits
  const TRIZ_VALID_TRANSITIONS: Record<TrizActionStatus, TrizActionStatus[]> = {
    pending:  ['adopted', 'skipped', 'edited'],
    adopted:  ['pending', 'skipped'],
    skipped:  ['pending'],
    edited:   ['adopted', 'skipped'],  // edited → pending blocked (traceability)
  };
  const setTrizStatus = (tsId: string, next: TrizActionStatus) => {
    const ts = localTrizSolutions.find((t) => t.id === tsId);
    if (!ts) return;
    const current = ts.status;
    if (!TRIZ_VALID_TRANSITIONS[current].includes(next)) return;
    setLocalTrizSolutions((prev) => prev.map((t) => (t.id === tsId ? { ...t, status: next } : t)));
    updateTrizSolution.mutate({ id: tsId, status: next });

    // When adopting a TRIZ solution, mark the linked contradiction as resolved
    // in the convergence loop so the loop knows to continue toward convergence.
    if (next === 'adopted' && ts.contradictionId) {
      const contradiction = (contradictionsQuery.data ?? []).find((c) => c.id === ts.contradictionId);
      if (contradiction?.severity) {
        convergenceLoop.markResolved(ts.contradictionId, contradiction.severity);
      }
    }
  };
  const toggleSubsystem = (ssId: string) => {
    const ss = subsystems.find(s => s.id === ssId);
    if (!ss) return;
    setLocalSubsystems((prev) => prev.map((s) => (s.id === ssId ? { ...s, confirmed: !s.confirmed } : s)));
    updateSubsystemMut.mutate({ id: ssId, confirmed: !ss.confirmed });
  };
  const addSubsystem = () => {
    if (!id || !ssFormName.trim()) { toast.error("請輸入子系統名稱"); return; }
    createSubsystem.mutate({
      project_id: id,
      name: ssFormName.trim(),
      reason: ssFormReason.trim(),
      related_contradictions: ssFormContradictions,
      confirmed: true,
      source: "rd",
      interfaces: ssFormInterfaces.trim() || undefined,
    });
    resetSsForm();
    setShowAddSubsystemForm(false);
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
    const ss = subsystems.find(s => s.id === editingSubsystemId);
    const newSource = ss?.source === "ai" ? "ai_edited" : ss?.source;
    // Optimistic local update
    setLocalSubsystems(prev => prev.map(s => {
      if (s.id !== editingSubsystemId) return s;
      return {
        ...s, name: ssFormName.trim(), reason: ssFormReason.trim(),
        relatedContradictions: ssFormContradictions,
        interfaces: ssFormInterfaces.trim() ? ssFormInterfaces.split(",").map(x => x.trim()).filter(Boolean) : [],
        source: (newSource ?? s.source) as SubsystemSource,
      };
    }));
    updateSubsystemMut.mutate({
      id: editingSubsystemId,
      name: ssFormName.trim(),
      reason: ssFormReason.trim(),
      related_contradictions: ssFormContradictions,
      interfaces: ssFormInterfaces.trim() || undefined,
      source: newSource,
    });
    resetSsForm();
    setEditingSubsystemId(null);
  };
  const deleteAntiAnchorRoute = (routeId: string) => {
    const idx = localRoutes.findIndex(r => r.id === routeId);
    if (idx === -1) return;
    const removed = localRoutes[idx];

    // Immediately delete from DB and optimistic UI
    setLocalRoutes(prev => prev.filter(r => r.id !== routeId));
    deleteAntiAnchorRouteMut.mutate({ id: routeId });

    toast(`已刪除「${removed.name}」`, {
      duration: 5000,
      action: {
        label: "復原",
        onClick: () => {
          // Undo = re-insert the removed item
          createAntiAnchorRoute.mutate({
            project_id: id!,
            name: removed.name,
            description: removed.description || undefined,
            is_non_typical: true,
            source: 'ai',
          });
          setLocalRoutes(prev => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, removed);
            return next;
          });
        },
      },
    });
  };

  const promoteAntiAnchorToCandidate = (routeId: string) => {
    if (!id) return;
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    createAlternative.mutate({
      project_id: id,
      name: route.name,
      mechanism: route.mechanism || route.description,
      source: "anti_anchor",
      key_assumption_ids: [],
      must_scores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null } as unknown as Json,
      interface_contract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' } as unknown as Json,
      pre_cad_scores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null } as unknown as Json,
      overall_pass: null,
    });
    toast.success(`「${route.name}」已晉升為候選方案（Step 5）`);
  };
  const deleteSubsystem = (ssId: string) => {
    const idx = localSubsystems.findIndex(s => s.id === ssId);
    if (idx === -1) return;
    const removed = localSubsystems[idx];

    setLocalSubsystems(prev => prev.filter(s => s.id !== ssId));
    deleteSubsystemMut.mutate({ id: ssId });

    toast(`已刪除「${removed.name}」`, {
      duration: 5000,
      action: {
        label: "復原",
        onClick: () => {
          createSubsystem.mutate({
            project_id: id!,
            name: removed.name,
            reason: removed.reason || undefined,
            related_contradictions: removed.relatedContradictions,
            confirmed: removed.confirmed,
            source: removed.source || "rd",
            interfaces: removed.interfaces?.join(", ") || undefined,
          });
          setLocalSubsystems(prev => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, removed);
            return next;
          });
        },
      },
    });
  };
  const resetSsForm = () => {
    setSsFormName(""); setSsFormReason(""); setSsFormContradictions([]); setSsFormInterfaces("");
  };
  const toggleScamperAdopt = (svId: string) => {
    const sv = scamperVariants.find(v => v.id === svId);
    if (!sv) return;
    setLocalScamperVariants((prev) => prev.map((v) => (v.id === svId ? { ...v, adopted: !v.adopted } : v)));
    updateScamperVariant.mutate({ id: svId, adopted: !sv.adopted });
  };
  const handleFeedbackToConvergence = (variantId: string, contradictionId: string) => {
    // Find the contradiction
    const variant = scamperVariants.find(v => v.id === variantId);
    const nc = variant?.newContradictions?.find(c => c.id === contradictionId);
    if (!nc) return;
    // Feed back to convergence graph
    convergenceLoop.addContradiction(nc.description, nc.severity, variantId);
    // Mark as fed back
    setLocalScamperVariants(prev => prev.map(v => {
      if (v.id !== variantId || !v.newContradictions) return v;
      return {
        ...v,
        newContradictions: v.newContradictions.map(c =>
          c.id === contradictionId ? { ...c, fedBack: true } : c
        ),
      };
    }));
    // Persist the updated new_contradictions to DB
    const updatedNcs = variant.newContradictions?.map(c =>
      c.id === contradictionId ? { ...c, fedBack: true } : c
    ) ?? [];
    updateScamperVariant.mutate({ id: variantId, new_contradictions: updatedNcs as unknown as Json });
    toast.success(`已將矛盾回饋至收斂圖（${nc.severity.toUpperCase()}），AI 將重新探索`);
    // Jump back to TRIZ to show updated graph (keep current track)
    navigateTo(1);
  };
  const cycleMust = (altId: string, mustId: string) => {
    const alt = alternatives.find(a => a.id === altId);
    if (!alt) return;
    const current = alt.mustScores[mustId];
    const next = current === null ? "pass" : current === "pass" ? "fail" : current === "fail" ? "marginal" : null;
    const newMustScores = { ...alt.mustScores, [mustId]: next };
    setLocalAlternatives((prev) =>
      prev.map((a) => a.id !== altId ? a : { ...a, mustScores: newMustScores })
    );
    updateAlternativeMut.mutate({ id: altId, must_scores: newMustScores as unknown as Json });
  };

  /** AI pre-evaluate MUST for a single alternative */
  const handleAiMustEvaluate = async (altId: string) => {
    const alt = alternatives.find(a => a.id === altId);
    if (!alt || !id) return;
    setAiLoading(prev => ({ ...prev, [`must-${altId}`]: true }));
    try {
      const project = projectQuery.data;
      const result = await mustEvaluate({
        project_id: id,
        alternative_name: alt.name,
        mechanism: alt.mechanism,
        must_criteria: mustCriteria.map(c => ({ id: c.id, label: c.label, source: c.source, threshold: c.threshold })),
        constraints: constraintStrings,
        kpis: kpiStrings,
      });
      // Store AI results for display
      setMustAiResults(prev => ({ ...prev, [altId]: result.criteria_results }));
      // Pre-fill MUST scores from AI judgment
      const newMustScores = { ...alt.mustScores };
      result.criteria_results.forEach(cr => {
        if (cr.passed === true) newMustScores[cr.id] = "pass";
        else if (cr.passed === false) newMustScores[cr.id] = "fail";
        // null → leave as-is (RD must decide)
      });
      setLocalAlternatives(prev =>
        prev.map(a => a.id !== altId ? a : { ...a, mustScores: newMustScores })
      );
      updateAlternativeMut.mutate({ id: altId, must_scores: newMustScores as unknown as Json });
      toast.success(`AI 預判完成：${result.summary}`);
    } catch {
      toast.error("AI MUST 評估失敗，請手動評估");
    } finally {
      setAiLoading(prev => ({ ...prev, [`must-${altId}`]: false }));
    }
  };

  /** AI evaluate all alternatives at once */
  const handleAiMustEvaluateAll = async () => {
    for (const alt of alternatives) {
      await handleAiMustEvaluate(alt.id);
    }
  };

  const updatePreCadScore = (altId: string, dim: string, value: number) => {
    const alt = alternatives.find(a => a.id === altId);
    if (!alt) return;
    const newScores = { ...alt.preCadScores, [dim]: value };
    const allFilled = Object.values(newScores).every((v) => v !== null);
    const allPass = allFilled && Object.values(newScores).every((v) => (v as number) >= 3);
    const overallPass = allFilled ? allPass : null;
    setLocalAlternatives((prev) =>
      prev.map((a) => a.id !== altId ? a : { ...a, preCadScores: newScores, overallPass })
    );
    updateAlternativeMut.mutate({ id: altId, pre_cad_scores: newScores as unknown as Json, overall_pass: overallPass });
  };
  const addManualAlternative = () => {
    if (!id) return;
    createAlternative.mutate({
      project_id: id,
      name: "",
      mechanism: "",
      source: "manual",
      key_assumption_ids: [],
      must_scores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null } as unknown as Json,
      interface_contract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' } as unknown as Json,
      pre_cad_scores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null } as unknown as Json,
      overall_pass: null,
    });
  };
  const deleteAlternative = (altId: string) => {
    const removed = localAlternatives.find(a => a.id === altId);
    if (!removed) return;
    setLocalAlternatives(prev => prev.filter(a => a.id !== altId));
    deleteAlternativeMut.mutate({ id: altId });
    toast(`已刪除「${removed.name || '未命名方案'}」`, {
      duration: 5000,
      action: {
        label: "復原",
        onClick: () => {
          createAlternative.mutate({
            project_id: id!,
            name: removed.name,
            mechanism: removed.mechanism || undefined,
            source: removed.source || undefined,
          });
          setLocalAlternatives(prev => [...prev, removed]);
        },
      },
    });
  };
  const handleAiGenAlts = async () => {
    if (!id) return;
    setAiLoading((p) => ({ ...p, alts: true }));
    try {
      // Collect adopted TRIZ solutions as candidates
      const adoptedTriz = trizSolutions.filter(ts => ts.status === 'adopted' || ts.status === 'edited');
      // Collect adopted SCAMPER variants
      const adoptedScamper = scamperVariants.filter(sv => sv.adopted);

      let created = 0;

      // Create alternatives from adopted TRIZ solutions (with validation passport)
      for (const ts of adoptedTriz) {
        const passport = await validationPassportGenerate({
          project_id: id,
          solution_name: `TRIZ ${ts.principleName} (${ts.path})`,
          mechanism: ts.suggestion,
          source: `triz_${ts.path.toLowerCase()}`,
          constraints: constraintStrings,
          kpis: kpiStrings,
        });
        await createAlternative.mutateAsync({
          project_id: id,
          name: `TRIZ: ${ts.principleName}`,
          mechanism: ts.suggestion,
          source: `triz_${ts.path.toLowerCase()}` as string,
          key_assumption_ids: [],
          must_scores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null } as unknown as Json,
          interface_contract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' } as unknown as Json,
          pre_cad_scores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null } as unknown as Json,
          overall_pass: null,
        });
        created++;
      }

      // Create alternatives from adopted SCAMPER variants (with validation passport)
      for (const sv of adoptedScamper) {
        await createAlternative.mutateAsync({
          project_id: id,
          name: `SCAMPER ${sv.action}: ${(sv.description || '').slice(0, 40)}`,
          mechanism: sv.description || '',
          source: "scamper",
          key_assumption_ids: [],
          must_scores: { M1: null, M2: null, M3: null, M4: null, M5: null, M6: null } as unknown as Json,
          interface_contract: { envelope: '', loadPath: '', signalPath: '', thermalPath: '', datumTolerance: '', serviceability: '' } as unknown as Json,
          pre_cad_scores: { must: null, decoupling: null, testability: null, failureMech: null, mvpCadEffort: null } as unknown as Json,
          overall_pass: null,
        });
        created++;
      }

      if (created === 0) {
        toast.warning("尚無已採用的 TRIZ 解法或 SCAMPER 變體，請先在 Step 2-4 採用解法，或手動新增方案");
      } else {
        toast.success(`已從 ${adoptedTriz.length} 條 TRIZ + ${adoptedScamper.length} 條 SCAMPER 整合 ${created} 個候選方案`);
      }
    } catch (err) {
      console.error("AI alternative generation failed:", err);
      toast.error("方案整合失敗");
    } finally {
      setAiLoading((p) => ({ ...p, alts: false }));
    }
  };

  const mustCell = (val: "pass" | "fail" | "marginal" | null) => {
    if (val === "pass") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10"><CheckCircle className="h-4 w-4 text-primary" /></span>;
    if (val === "fail") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10"><XCircle className="h-4 w-4 text-destructive" /></span>;
    if (val === "marginal") return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-warning/10"><AlertTriangle className="h-4 w-4 text-warning" /></span>;
    return <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-sm text-muted-foreground">—</span>;
  };

  // Unified step navigation — infers track from step index when not explicit
  const inferTrack = (step: number): "reverse" | "forward" | null => {
    if (step === 0) return "reverse";
    if (step >= 1 && step <= 3) return activeTrack === "reverse" ? "reverse" : "forward";
    return null; // hub, must, pre-cad
  };
  const navigateTo = (step: number, track?: "reverse" | "forward" | null) => {
    setCurrentStep(step);
    setActiveTrack(track !== undefined ? track : inferTrack(step));
  };
  const goNext = () => {
    const next = Math.min(currentStep + 1, 6);
    navigateTo(next);
  };
  const goPrev = () => {
    const prev = Math.max(currentStep - 1, 0);
    navigateTo(prev);
  };

  if (isLoading) {
    return (
      <div className="page-shell-narrow py-8">
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
            <AiButton loading={aiLoading.antiAnchor} onClick={handleAiGenAntiAnchor} size="lg">
              生成非典型架構
            </AiButton>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((r, i) => (
              <Card key={r.id} className="overflow-hidden border-l-[3px] border-l-accent">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">路線 {i + 1}</Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> AI
                      </Badge>
                    </div>
                    <button onClick={() => deleteAntiAnchorRoute(r.id)} className="p-1 rounded hover:bg-destructive/10" title="刪除此路線">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                  <p className="text-sm font-medium">{r.name}</p>
                  {r.mechanism && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{r.mechanism}</p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                  {r.crossDomainSource && (
                    <Badge variant="outline" className="text-[10px]">跨域靈感: {r.crossDomainSource}</Badge>
                  )}
                  {r.validationPassport && (
                    <div className="text-xs space-y-1 border-t pt-2 mt-2">
                      <p className="font-medium text-muted-foreground">Validation Passport (信心: {Math.round((r.validationPassport.confidenceLevel ?? 0) * 100)}%)</p>
                      {(r.validationPassport.weakPoints?.length ?? 0) > 0 && (
                        <p className="text-muted-foreground">弱點: {r.validationPassport.weakPoints.join('; ')}</p>
                      )}
                      <p className="text-muted-foreground">假設 {r.validationPassport.assumptions?.length ?? 0} 項 / 待驗證 {r.validationPassport.requiredVerifications?.length ?? 0} 項</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 mt-1"
                    onClick={() => promoteAntiAnchorToCandidate(r.id)}
                  >
                    <ArrowRight className="h-3 w-3" />
                    晉升為候選方案
                  </Button>
                </CardContent>
              </Card>
            ))}
            <AiButton aiVariant="outline" size="sm" loading={aiLoading.antiAnchor} onClick={handleAiGenAntiAnchor} className="text-xs">
              重新生成
            </AiButton>
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
    const contradictionsList = contradictionsQuery.data ?? [];
    const canStartConvergence = !!id && contradictionsList.length > 0;

    const handleStartExploration = () => {
      if (!id) { toast.error("缺少專案 ID"); return; }
      if (contradictionsList.length === 0) { toast.warning("尚未識別任何矛盾，請先在「深度探索」階段完成矛盾識別"); return; }
      startExploration();
    };

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

        {/* Idle state: show existing TRIZ results from DB, or prompt to launch */}
        {state.status === 'idle' && trizSolutions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">AI 矛盾收斂完成 — {trizSolutions.length} 條 TRIZ 解法</h3>
            </div>
            {trizSolutions.map((ts) => (
              <Card key={ts.id} className="border-l-[3px] border-l-primary/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{ts.path}</Badge>
                    <Badge variant="outline" className="text-[10px]">原理 {ts.principleNumber}: {ts.principleName}</Badge>
                    <Badge className={`text-[10px] ${ts.status === 'adopted' ? 'bg-primary' : ts.status === 'rejected' ? 'bg-destructive' : 'bg-muted text-muted-foreground'}`}>
                      {ts.status === 'adopted' ? '已採用' : ts.status === 'rejected' ? '已排除' : '待評估'}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed">{ts.suggestion}</p>
                  {ts.contradictionId && (
                    <p className="text-xs text-muted-foreground">
                      ⚡ {contradictionMap.get(ts.contradictionId) ?? '矛盾'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            <AiButton
              aiVariant="outline"
              size="sm"
              loading={state.status === 'exploring'}
              onClick={handleStartExploration}
              className="text-xs"
            >
              {state.status === 'exploring' ? '收斂分析中...' : '重新執行矛盾收斂'}
            </AiButton>
          </div>
        )}

        {state.status === 'idle' && trizSolutions.length === 0 && (
          <Card className="border-dashed border-2 border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI 矛盾空間健康度分析</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  AI 將分析矛盾間的交互衝突、循環依賴與覆蓋盲區，
                  確認問題空間定義完善。方案建立後（Step 5）會自動執行完整收斂掃描。
                </p>
              </div>
              <AiButton
                loading={state.status === 'exploring'}
                onClick={handleStartExploration}
                size="lg"
              >
                {state.status === 'exploring' ? '收斂分析中...' : '啟動矛盾收斂探索'}
              </AiButton>
              {!canStartConvergence && (
                <p className="text-xs text-muted-foreground mt-2">
                  前置條件：需先在「深度探索」階段完成矛盾識別
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exploring: show loading banner + dashboard + graph + branches */}
        {state.status === 'exploring' && state.iteration === 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {state.phase === 'A' ? 'AI 正在分析矛盾空間健康度...' : 'AI 正在執行參數交叉分析...'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.phase === 'A'
                    ? `分析 ${contradictionsList.length} 條矛盾的交互衝突、循環依賴與覆蓋盲區`
                    : `掃描 ${contradictionsList.length} 條矛盾 x ${alternatives.length} 個方案，檢測二次矛盾與架構衝突`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.status !== 'idle' && (
          <>
            <ConvergenceDashboard state={state} />

            <ConvergenceGraph
              nodes={state.graph.nodes}
              edges={state.graph.edges}
            />

            <BranchExplorationPanel branches={state.branches} />

            {/* Re-run button: available when not actively exploring */}
            {state.status !== 'exploring' && (
              <div className="flex items-center gap-2">
                <AiButton
                  aiVariant="outline"
                  size="sm"
                  onClick={handleStartExploration}
                  className="text-xs"
                >
                  重新執行矛盾收斂
                </AiButton>
                {state.status === 'halted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={forceContinue}
                    className="text-xs gap-1.5"
                  >
                    強制繼續探索
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Converged or halted with unresolved issues: human review */}
        {(state.status === 'converged' || state.status === 'halted') && (
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
                adoptionState={adoptionState}
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
              {(contradictionsQuery.data || []).map((c, i) => {
                const cId = c.id || `ec-${i + 1}`;
                return (
                  <label key={cId} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={ssFormContradictions.includes(cId)}
                      onCheckedChange={(checked) => {
                        setSsFormContradictions(prev => checked ? [...prev, cId] : prev.filter(x => x !== cId));
                      }}
                    />
                    <span>{c.naturalDescription.slice(0, 40)}…</span>
                  </label>
                );
              })}
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
            systemName={briefMission || MOCK_MISSION.problemStatement}
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
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ss.relatedContradictions.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px]">
                            ⚡ {contradictionMap.get(c) ?? c.slice(0, 8)}
                          </Badge>
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
          <Button variant="secondary" onClick={() => navigateTo(2)}>
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
                        <span className="text-xs text-muted-foreground">{SCAMPER_LABELS[v.action]?.zh ?? v.action}</span>
                        <Badge variant="secondary" className="text-[9px] ml-auto">AI</Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{v.description}</p>
                      <Button
                        size="sm"
                        variant={v.adopted ? "default" : "outline"}
                        className="text-xs"
                        onClick={() => toggleScamperAdopt(v.id)}
                      >
                        {v.adopted ? <><Check className="h-3 w-3 mr-1" />已採用</> : "採用"}
                      </Button>
                      {/* SCAMPER new contradiction feedback with severity */}
                      {v.newContradictions && v.newContradictions.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {v.newContradictions.map((nc) => {
                            const isFatalMajor = nc.severity === 'fatal' || nc.severity === 'major';
                            const borderColor = nc.severity === 'fatal' ? 'border-red-400' : nc.severity === 'major' ? 'border-orange-400' : 'border-muted';
                            const bgColor = nc.severity === 'fatal' ? 'bg-red-50 dark:bg-red-950/30' : nc.severity === 'major' ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-muted/30';
                            const sevBadge = nc.severity === 'fatal'
                              ? <Badge variant="destructive" className="text-[9px] shrink-0">Fatal</Badge>
                              : nc.severity === 'major'
                              ? <Badge className="text-[9px] bg-orange-500 text-white shrink-0">Major</Badge>
                              : <Badge variant="secondary" className="text-[9px] shrink-0">Minor</Badge>;
                            return (
                              <div key={nc.id} className={`p-2 rounded-md border ${borderColor} ${bgColor}`}>
                                <div className="flex items-start gap-1.5">
                                  <AlertTriangle className={`h-3 w-3 shrink-0 mt-0.5 ${nc.severity === 'fatal' ? 'text-red-500' : nc.severity === 'major' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      {sevBadge}
                                      {nc.fedBack && <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">已回饋</Badge>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{nc.description}</p>
                                  </div>
                                </div>
                                {isFatalMajor && !nc.fedBack && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1.5 h-6 text-[10px] border-primary/40 text-primary"
                                    onClick={() => handleFeedbackToConvergence(v.id, nc.id)}
                                  >
                                    <ArrowLeft className="h-3 w-3 mr-0.5" /> 回饋至收斂圖
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* SCAMPER confirmation with unhandled contradiction check */}
        {confirmedSubs.length > 0 && scamperVariants.some(v => v.adopted) && (() => {
          const allNewConts = scamperVariants
            .filter(v => v.adopted && v.newContradictions)
            .flatMap(v => v.newContradictions!);
          const unhandledFatalMajor = allNewConts.filter(nc => (nc.severity === 'fatal' || nc.severity === 'major') && !nc.fedBack);
          const hasBlocker = unhandledFatalMajor.length > 0;

          return (
            <Card className={hasBlocker ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}>
              <CardContent className="p-4 space-y-3">
                {hasBlocker && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        {unhandledFatalMajor.length} 個 Fatal/Major 新矛盾尚未回饋至收斂圖
                      </p>
                      <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                        請先將 Fatal/Major 矛盾回饋至收斂圖進行 TRIZ 求解，或確認其嚴重度後再繼續。
                      </p>
                      {unhandledFatalMajor.map(nc => (
                        <p key={nc.id} className="text-[10px] text-muted-foreground mt-0.5">
                          • [{nc.severity.toUpperCase()}] {nc.description.slice(0, 50)}...
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">確認 SCAMPER 變形結果</p>
                    <p className="text-xs text-muted-foreground">
                      已採用 {scamperVariants.filter(v => v.adopted).length} 個變形。
                      {hasBlocker
                        ? " 建議先處理未回饋的矛盾再繼續。"
                        : " 確認後進入方案整合。"}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (hasBlocker) {
                        toast.warning('仍有未處理的 Fatal/Major 矛盾，建議回饋至收斂圖後再繼續');
                      }
                      toast.success('SCAMPER 變形結果已確認');
                      goNext();
                    }}
                    className="shrink-0"
                    variant={hasBlocker ? "outline" : "default"}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {hasBlocker ? "忽略警告，繼續" : "確認並繼續"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}
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
                  placeholder="方案名稱 *"
                  value={alt.name}
                  onChange={(e) => {
                    setLocalAlternatives((prev) => prev.map((a) => (a.id === alt.id ? { ...a, name: e.target.value } : a)));
                  }}
                  onBlur={(e) => {
                    updateAlternativeMut.mutate({ id: alt.id, name: e.target.value });
                  }}
                />
                <Textarea
                  placeholder="機制說明 * (至少 20 字元)"
                  value={alt.mechanism}
                  rows={3}
                  className="text-sm leading-relaxed"
                  onChange={(e) => {
                    setLocalAlternatives((prev) => prev.map((a) => (a.id === alt.id ? { ...a, mechanism: e.target.value } : a)));
                  }}
                  onBlur={(e) => {
                    updateAlternativeMut.mutate({ id: alt.id, mechanism: e.target.value });
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
          <AiButton size="sm" loading={aiLoading.alts} onClick={handleAiGenAlts}>
            整合生成
          </AiButton>
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
          <Button variant="secondary" onClick={() => navigateTo(4, null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 回到方案整合
          </Button>
        </div>
      );
    }

    const anyAiLoading = alternatives.some(a => aiLoading[`must-${a.id}`]);

    /** Get AI reasoning for a criterion */
    const getAiReasoning = (altId: string, criterionId: string): MustCriterionResult | undefined => {
      return mustAiResults[altId]?.find(r => r.id === criterionId);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">{passedMustAlts.length} 通過</Badge>
          <Badge className="bg-destructive/10 text-destructive border-0 px-3 py-1">{alternatives.filter((a) => Object.values(a.mustScores).includes("fail")).length} 淘汰</Badge>
          <Badge className="bg-muted text-muted-foreground border-0 px-3 py-1">{alternatives.filter((a) => Object.values(a.mustScores).includes("marginal")).length} 待定</Badge>
          <div className="flex-1" />
          <AiButton size="sm" aiVariant="outline" loading={anyAiLoading} onClick={handleAiMustEvaluateAll}>
            全部預判
          </AiButton>
        </div>

        {mustCriteria !== DEFAULT_MUST_CRITERIA && (
          <p className="text-xs text-muted-foreground">MUST 準則已從 Brief 約束/KPI 自動導出（共 {mustCriteria.length} 項）</p>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">方案</th>
                {mustCriteria.map((c) => (
                  <th key={c.id} className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild><span className="cursor-help">{c.label}</span></TooltipTrigger>
                      <TooltipContent><p className="text-xs">來源: {c.source}{c.threshold ? ` | 閾值: ${c.threshold}` : ""}</p></TooltipContent>
                    </Tooltip>
                  </th>
                ))}
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">AI</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">結果</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => {
                const hasFail = Object.values(alt.mustScores).includes("fail");
                return (
                  <tr key={alt.id} className={`border-b transition-colors ${hasFail ? "opacity-50" : "hover:bg-muted/30"}`}>
                    <td className={`py-3 px-3 text-sm max-w-[140px] truncate ${hasFail ? "line-through" : ""}`}>{alt.name || "(未命名)"}</td>
                    {mustCriteria.map((c) => {
                      const aiResult = getAiReasoning(alt.id, c.id);
                      return (
                        <td key={c.id} className="text-center py-3 px-2 cursor-pointer" onClick={() => cycleMust(alt.id, c.id)}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{mustCell(alt.mustScores[c.id])}</span>
                            </TooltipTrigger>
                            {aiResult && (
                              <TooltipContent className="max-w-[280px]">
                                <p className="text-xs font-medium mb-1">AI 信心: {Math.round(aiResult.confidence * 100)}%</p>
                                <p className="text-xs">{aiResult.reasoning}</p>
                                {aiResult.evidence_sources.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">依據: {aiResult.evidence_sources.join(", ")}</p>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-2">
                      <AiButton size="sm" aiVariant="ghost" className="h-7 px-2" loading={aiLoading[`must-${alt.id}`]} onClick={() => handleAiMustEvaluate(alt.id)}>
                      </AiButton>
                    </td>
                    <td className="text-center py-3 px-3">
                      {hasFail ? <Badge variant="destructive" className="text-[10px]">淘汰</Badge>
                        : getMustValues(alt).every((v) => v === "pass") ? <Badge className="bg-primary text-primary-foreground text-[10px]">通過</Badge>
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
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${hasFail ? "line-through" : ""}`}>{alt.name || "(未命名)"}</p>
                    <AiButton size="sm" aiVariant="ghost" className="h-7 px-2" loading={aiLoading[`must-${alt.id}`]} onClick={() => handleAiMustEvaluate(alt.id)}>
                    </AiButton>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {mustCriteria.map((c) => (
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
          <Button variant="secondary" onClick={() => navigateTo(5, null)}>
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
                ? <Badge className="bg-primary text-primary-foreground px-3 py-1">通過 — 可進入 CAD</Badge>
                : editingAlt.overallPass === false
                ? <Badge variant="destructive" className="px-3 py-1">不通過 — 有維度 &lt; 3</Badge>
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
                  {phaseGate2Items.every((i) => i.passed) ? "Phase 2 Passed *" : "未通過"}
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
    <div className="page-shell-narrow">
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

      <MissionContext
        problemStatement={briefMission || MOCK_MISSION.problemStatement}
        contradictions={contradictionDescs.length > 0
          ? contradictionDescs.map((d, i) => ({ id: `EC-${String(i + 1).padStart(3, '0')}`, description: d }))
          : MOCK_MISSION.contradictions}
        verifiedAssumptions={MOCK_MISSION.verifiedAssumptions}
        totalAssumptions={MOCK_MISSION.totalAssumptions}
        highRiskCount={MOCK_MISSION.highRiskCount}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          方案創造
          <HelpTooltip text="雙軌獨立分析 → 候選方案決策中心 → 統一評估。反向路徑（Anti-Anchor → TRIZ → SCAMPER）與正向路徑（CLD 矛盾 → TRIZ → SCAMPER）各自獨立分析，最終在決策中心攤平比較所有方案。" className="ml-2 align-middle" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">雙軌分析 · 方案匯流 · 統一評估</p>
      </div>

      <CreateStepper
        steps={STEPS}
        statuses={stepStatuses}
        currentStep={currentStep}
        activeTrack={activeTrack}
        onStepClick={(step, track) => navigateTo(step, track)}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
            activeTrack === "reverse" ? "bg-amber-500 text-white" :
            activeTrack === "forward" ? "bg-blue-500 text-white" :
            "bg-primary text-primary-foreground"
          )}>
            {activeTrack === "reverse" ? "R" :
             activeTrack === "forward" ? "F" :
             currentStep === 4 ? "⬡" : currentStep - 3}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{STEPS[currentStep].label}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                activeTrack === "reverse" ? ZONE_LABELS.reverse.color :
                activeTrack === "forward" ? ZONE_LABELS.forward.color :
                ZONE_LABELS[STEPS[currentStep].zone].color
              }`}>
                {activeTrack === "reverse" ? ZONE_LABELS.reverse.badge :
                 activeTrack === "forward" ? ZONE_LABELS.forward.badge :
                 ZONE_LABELS[STEPS[currentStep].zone].badge}
              </span>
            </div>
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
        <span className="text-xs text-muted-foreground">
          {ZONE_LABELS[STEPS[currentStep].zone].badge}
        </span>
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
