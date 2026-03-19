import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConstraintsTable } from "@/components/brief/ConstraintsTable";
import { KpiList } from "@/components/brief/KpiList";
import { AITaskDefinitionCard } from "@/components/brief/AITaskDefinitionCard";
import { GateChecklist } from "@/components/brief/GateChecklist";
import { AISuggestionCard } from "@/components/brief/AISuggestionCard";
import { EvidenceRefsInline } from "@/components/brief/EvidenceRefsInline";
import { FileUploadZone, type UploadedFile } from "@/components/task-definition/FileUploadZone";
import { AIExtractionResults, type ExtractedItem } from "@/components/task-definition/AIExtractionResults";
import { FeasibilityValidation, type FeasibilityStatus } from "@/components/task-definition/FeasibilityValidation";
import { MultiItemInput } from "@/components/task-definition/MultiItemInput";
import {
  briefExtract, type BriefExtractResponse,
  briefRewrite, type BriefRewriteResponse,
  constraintSuggest, type ConstraintSuggestResponse, type SuggestedConstraint,
  constraintFeasibilityCheck, type FeasibilityConflictResult,
  kpiSuggest, type KpiSuggestResponse, type SuggestedKpi,
  briefGenerate5W1H,
  checkBackendHealth,
  getApiErrorMessage,
  type EvidenceReference,
} from "@/lib/api";
import {
  useBrief,
  useUpsertBrief,
  useConstraints,
  useCreateConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
  useKpis,
  useCreateKpi,
  useUpdateKpi,
  useDeleteKpi,
} from "@/hooks/api/useBrief";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { BriefConstraint, BriefKPI, TaskDefinition5W1H, GateCheckItem } from "@/types/taskDefinition";
import { ArrowLeft, AlertCircle, RefreshCw, Sparkles, Check, Save, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import { toast } from "sonner";

export default function TaskDefinition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Supabase queries ──────────────────────────────────────────────────
  const briefQuery = useBrief(id);
  const constraintsQuery = useConstraints(id);
  const kpisQuery = useKpis(id);

  // ── Supabase mutations ────────────────────────────────────────────────
  const upsertBrief = useUpsertBrief();
  const createConstraint = useCreateConstraint();
  const updateConstraint = useUpdateConstraint();
  const deleteConstraint = useDeleteConstraint();
  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpi = useDeleteKpi();

  // Aggregate loading / error states
  const isLoading = briefQuery.isLoading || constraintsQuery.isLoading || kpisQuery.isLoading;
  const loadError = briefQuery.isError || constraintsQuery.isError || kpisQuery.isError;

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [mission, setMission] = useState("");
  const [constraints, setConstraints] = useState<BriefConstraint[]>([
    { id: "c-new", constraint_code: "C-01", description: "", source: "" },
  ]);
  const [kpis, setKpis] = useState<BriefKPI[]>([
    { id: "k-new", kpi_name: "", target_value: "", unit: "", measurement_method: "" },
  ]);
  const [softObjectives, setSoftObjectives] = useState<string[]>([]);
  const [nonGoals, setNonGoals] = useState<string[]>([]);
  const [taskDef5W1H, setTaskDef5W1H] = useState<TaskDefinition5W1H | null>(null);

  // Track whether we've seeded form state from server data
  const [seeded, setSeeded] = useState(false);

  // Upload & extraction state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [showExtraction, setShowExtraction] = useState(false);

  // Feasibility state
  const [feasibilityStatus, setFeasibilityStatus] = useState<FeasibilityStatus>("idle");
  const [feasibilityConflicts, setFeasibilityConflicts] = useState<FeasibilityConflictResult[]>([]);

  // AI suggestion state
  const [showMissionSuggestion, setShowMissionSuggestion] = useState(false);
  const [missionSuggestion, setMissionSuggestion] = useState<string | null>(null);
  const [missionChangesSummary, setMissionChangesSummary] = useState("");
  const [isMissionRewriting, setIsMissionRewriting] = useState(false);
  const [showConstraintSuggestions, setShowConstraintSuggestions] = useState(false);
  const [constraintSuggestionList, setConstraintSuggestionList] = useState<SuggestedConstraint[]>([]);
  const [isConstraintSuggesting, setIsConstraintSuggesting] = useState(false);
  const [activeConstraintActionIndex, setActiveConstraintActionIndex] = useState<number | null>(null);
  const [showKpiSuggestions, setShowKpiSuggestions] = useState(false);
  const [kpiSuggestionList, setKpiSuggestionList] = useState<SuggestedKpi[]>([]);
  const [isKpiSuggesting, setIsKpiSuggesting] = useState(false);
  const [activeKpiActionIndex, setActiveKpiActionIndex] = useState<number | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "down">("checking");
  const [backendStatusMessage, setBackendStatusMessage] = useState("檢查後端連線中...");

  // Evidence references from AI responses
  const [missionEvidenceRefs, setMissionEvidenceRefs] = useState<EvidenceReference[]>([]);
  const [constraintEvidenceRefs, setConstraintEvidenceRefs] = useState<EvidenceReference[]>([]);
  const [kpiEvidenceRefs, setKpiEvidenceRefs] = useState<EvidenceReference[]>([]);

  // Seed form state from server data once loaded
  useEffect(() => {
    if (seeded || isLoading) return;

    if (briefQuery.data) {
      setMission(briefQuery.data.mission);
      setTaskDef5W1H(briefQuery.data.taskDefinition5w1h);
    }

    if (constraintsQuery.data && constraintsQuery.data.length > 0) {
      setConstraints(
        constraintsQuery.data.map((c) => ({
          id: c.id,
          constraint_code: c.constraintCode,
          description: c.description,
          source: c.source,
        }))
      );
    }

    if (kpisQuery.data && kpisQuery.data.length > 0) {
      setKpis(
        kpisQuery.data.map((k) => ({
          id: k.id,
          kpi_name: k.kpiName,
          target_value: k.targetValue,
          unit: k.unit,
          measurement_method: k.measurementMethod,
        }))
      );
    }

    setSeeded(true);
  }, [isLoading, seeded, briefQuery.data, constraintsQuery.data, kpisQuery.data]);

  const runBackendHealthCheck = async (showFailureToast = false) => {
    setBackendStatus("checking");
    setBackendStatusMessage("檢查後端連線中...");
    const result = await checkBackendHealth();
    if (result.ok) {
      setBackendStatus("ok");
      setBackendStatusMessage(result.message);
      return;
    }
    setBackendStatus("down");
    setBackendStatusMessage(result.message);
    if (showFailureToast) {
      toast.error(result.message);
    }
  };

  // Check backend reachability on page load so users know status before AI calls.
  useEffect(() => {
    void runBackendHealthCheck();
  }, []);

  // Mission rewrite — triggered by button click
  const handleMissionRewrite = async () => {
    if (!id || mission.trim().length < 10) {
      toast.error("Mission 需至少 10 個字元才能改寫");
      return;
    }
    setShowMissionSuggestion(true);
    setMissionSuggestion(null);
    setIsMissionRewriting(true);
    try {
      const res = await briefRewrite({
        project_id: id,
        mission,
        constraints: constraints.filter(c => c.description.trim()).map(c => c.description),
        kpis: kpis.filter(k => k.kpi_name.trim()).map(k => `${k.kpi_name}: ${k.target_value} ${k.unit}`),
      });
      setMissionSuggestion(res.rewritten_mission);
      setMissionChangesSummary(res.changes_summary);
      setMissionEvidenceRefs(res.evidence_references ?? []);
    } catch (err) {
      console.error("Mission rewrite failed:", err);
      toast.error(getApiErrorMessage(err, "AI 改寫"));
      setShowMissionSuggestion(false);
    } finally {
      setIsMissionRewriting(false);
    }
  };

  // Constraint suggestion — triggered by button click
  const handleConstraintSuggest = async () => {
    if (!id) return;
    if (mission.trim().length < 10) {
      toast.error("請先填寫 Mission（至少 10 字）再使用 AI 建議約束");
      return;
    }
    if (isConstraintSuggesting) return;
    setShowConstraintSuggestions(true);
    setConstraintSuggestionList([]);
    setIsConstraintSuggesting(true);
    try {
      const res = await constraintSuggest({
        project_id: id,
        mission,
        existing_constraints: constraints.filter(c => c.description.trim()).map(c => c.description),
      });
      setConstraintSuggestionList(res.suggestions);
      setConstraintEvidenceRefs(res.evidence_references ?? []);
      if (res.suggestions.length === 0) {
        toast.info("AI 未產出約束建議，請補充更具體的 Mission 或上下文");
      } else {
        toast.success(`AI 已產生 ${res.suggestions.length} 項約束建議`);
      }
    } catch (err) {
      console.error("Constraint suggestion failed:", err);
      toast.error(getApiErrorMessage(err, "AI 約束建議"));
      setShowConstraintSuggestions(false);
    } finally {
      setIsConstraintSuggesting(false);
    }
  };

  // KPI suggestion — triggered by button click
  const handleKpiSuggest = async () => {
    if (!id) return;
    if (mission.trim().length < 10) {
      toast.error("請先填寫 Mission（至少 10 字）再使用 AI 建議 KPI");
      return;
    }
    if (isKpiSuggesting) return;
    setShowKpiSuggestions(true);
    setKpiSuggestionList([]);
    setIsKpiSuggesting(true);
    try {
      const res = await kpiSuggest({
        project_id: id,
        mission,
        constraints: constraints.filter(c => c.description.trim()).map(c => c.description),
        existing_kpis: kpis.filter(k => k.kpi_name.trim()).map(k => `${k.kpi_name}: ${k.target_value} ${k.unit}`),
      });
      setKpiSuggestionList(res.suggestions);
      setKpiEvidenceRefs(res.evidence_references ?? []);
      if (res.suggestions.length === 0) {
        toast.info("AI 未產出 KPI 建議，請補充更具體的 Mission 或約束");
      } else {
        toast.success(`AI 已產生 ${res.suggestions.length} 項 KPI 建議`);
      }
    } catch (err) {
      console.error("KPI suggestion failed:", err);
      toast.error(getApiErrorMessage(err, "AI KPI 建議"));
      setShowKpiSuggestions(false);
    } finally {
      setIsKpiSuggesting(false);
    }
  };

  // 5W1H generation — triggered when mission is ready and no 5W1H exists
  const [is5W1HGenerating, setIs5W1HGenerating] = useState(false);
  const generate5W1H = async () => {
    if (!id || mission.trim().length < 10) return;
    setIs5W1HGenerating(true);
    try {
      const res = await briefGenerate5W1H({
        project_id: id,
        mission,
        constraints: constraints.filter(c => c.description.trim()).map(c => c.description),
        kpis: kpis.filter(k => k.kpi_name.trim()).map(k => `${k.kpi_name}: ${k.target_value} ${k.unit}`),
      });
      setTaskDef5W1H(res);
    } catch (err) {
      console.error("5W1H generation failed:", err);
      toast.error(getApiErrorMessage(err, "AI 5W1H 產生"));
    } finally {
      setIs5W1HGenerating(false);
    }
  };

  // Auto-trigger 5W1H when mission is ready and no data exists
  useEffect(() => {
    if (mission.trim().length >= 10 && !taskDef5W1H && !is5W1HGenerating && id) {
      const timer = setTimeout(() => generate5W1H(), 1000);
      return () => clearTimeout(timer);
    }
  }, [mission, taskDef5W1H, id]);

  // ── Auto-save: debounce upsert brief mission to Supabase ─────────────
  useEffect(() => {
    if (isLoading || !seeded || !id) return;
    const timer = setTimeout(() => {
      setSaveStatus("saving");
      upsertBrief.mutate(
        {
          project_id: id,
          mission,
          task_definition_5w1h: taskDef5W1H as unknown as TablesInsert<"briefs">["task_definition_5w1h"],
        },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          },
          onError: () => {
            setSaveStatus("idle");
          },
        }
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [mission, taskDef5W1H]);

  // Gate 1.1 check
  const missionReady = mission.trim().length >= 10;
  const hasConstraint = constraints.some((c) => c.description.trim().length >= 2);
  const hasKpi = kpis.some(
    (k) => k.kpi_name.trim() && k.target_value.trim() && k.unit.trim() && k.measurement_method.trim()
  );

  const gateItems: GateCheckItem[] = useMemo(() => [
    { label: "Mission 已填寫 (≥ 10 字元)", passed: missionReady },
    { label: "至少 1 項硬約束", passed: hasConstraint },
    { label: "至少 1 項 KPI", passed: hasKpi },
    { label: "約束可行性驗證通過", passed: feasibilityStatus === "pass" || feasibilityStatus === "warning" },
  ], [missionReady, hasConstraint, hasKpi, feasibilityStatus]);

  // Handlers

  type ConstraintCodePattern = {
    prefix: string;
    separator: string;
    width: number;
    nextNumber: number;
  };

  const inferConstraintCodePattern = (items: BriefConstraint[]): ConstraintCodePattern => {
    const parsed = items
      .map((c) => c.constraint_code.trim())
      .filter(Boolean)
      .map((code) => {
        const m = code.match(/^([A-Za-z]+)([-_]?)(\d+)$/);
        if (!m) return null;
        return {
          prefix: m[1],
          separator: m[2],
          number: Number(m[3]),
          width: m[3].length,
        };
      })
      .filter((v): v is { prefix: string; separator: string; number: number; width: number } => v !== null);

    if (parsed.length === 0) {
      return {
        prefix: "C",
        separator: "-",
        width: 2,
        nextNumber: 1,
      };
    }

    const base = parsed[0];
    const maxNumber = Math.max(
      ...parsed
        .filter((p) => p.prefix === base.prefix && p.separator === base.separator)
        .map((p) => p.number),
    );

    return {
      prefix: base.prefix,
      separator: base.separator,
      width: base.width,
      nextNumber: maxNumber + 1,
    };
  };

  const buildNextConstraintCodes = (count: number): string[] => {
    const pattern = inferConstraintCodePattern(constraints.filter((c) => c.description.trim()));
    return Array.from({ length: count }, (_, idx) => {
      const n = pattern.nextNumber + idx;
      return `${pattern.prefix}${pattern.separator}${String(n).padStart(pattern.width, "0")}`;
    });
  };

  const handleExtract = async () => {
    if (!id) return;
    setIsExtracting(true);
    try {
      const result: BriefExtractResponse = await briefExtract({
        project_id: id,
        raw_text: mission,
        file_urls: [],
      });
      const items: ExtractedItem[] = [
        ...result.constraints.map((c, i) => ({
          id: `ext-c-${i}`,
          type: "constraint" as const,
          content: c.description,
          source: c.source,
          accepted: false,
          editing: false,
        })),
        ...result.kpis.map((k, i) => ({
          id: `ext-k-${i}`,
          type: "data" as const,
          content: `${k.name}: ${k.target_value} ${k.unit}`,
          source: k.measurement_method || "AI extracted",
          accepted: false,
          editing: false,
        })),
        ...result.assumptions.map((a, i) => ({
          id: `ext-a-${i}`,
          type: "assumption" as const,
          content: a,
          source: "AI extracted",
          accepted: false,
          editing: false,
        })),
      ];
      setExtractedItems(items);
      setShowExtraction(true);
      toast.success(`AI 提取完成，共提取 ${items.length} 條項目`);
      if (result.feasibility_warnings.length > 0) {
        toast.warning(`可行性警告：${result.feasibility_warnings[0]}`);
      }
    } catch (err) {
      console.error("Brief extraction failed:", err);
      toast.error(getApiErrorMessage(err, "AI 提取"));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptAllExtracted = () => {
    const accepted = extractedItems.map((i) => ({ ...i, accepted: true }));
    setExtractedItems(accepted);

    // Auto-fill constraints from accepted items — persist to Supabase
    const newConstraintItems = accepted.filter((i) => i.type === "constraint");

    if (newConstraintItems.length > 0 && id) {
      const newCodes = buildNextConstraintCodes(newConstraintItems.length);
      newConstraintItems.forEach((item, idx) => {
        const code = newCodes[idx];
        createConstraint.mutate({
          project_id: id,
          constraint_code: code,
          description: item.content,
          source: item.source,
        });
      });

      // Also update local state for immediate UI feedback
      const newConstraints = newConstraintItems.map((i, idx) => ({
        id: `c-ext-${idx}`,
        constraint_code: newCodes[idx],
        description: i.content,
        source: i.source,
      }));
      setConstraints((prev) => [...prev.filter((c) => c.description.trim()), ...newConstraints]);
    }
    toast.success("已接受所有提取結果並填入表單");
  };

  const handleFeasibilityCheck = async () => {
    if (!id) return;
    const descriptions = constraints.map((c) => c.description).filter((d) => d.trim().length >= 2);
    if (descriptions.length < 2) {
      setFeasibilityStatus("pass");
      setFeasibilityConflicts([]);
      return;
    }
    setFeasibilityStatus("checking");
    try {
      const result = await constraintFeasibilityCheck({
        project_id: id,
        mission,
        constraints: descriptions,
      });
      setFeasibilityConflicts(result.conflicts);
      setFeasibilityStatus(result.status as FeasibilityStatus);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "約束可行性驗證"));
      setFeasibilityStatus("idle");
    }
  };

  const handleFeasibilityOverride = (reason: string) => {
    setFeasibilityStatus("warning");
    toast.info("已記錄覆寫原因，可繼續進行");
  };

  const handleAdoptMissionSuggestion = (editedContent: string) => {
    setMission(editedContent);
    setShowMissionSuggestion(false);
    setMissionSuggestion(null);
    toast.success("已採用 AI 改寫的 Mission");
  };

  const handleAdoptConstraintSuggestion = (desc: string, source: string) => {
    const code = buildNextConstraintCodes(1)[0];
    const tempId = `c-ai-${Date.now()}`;
    // Optimistic local update
    setConstraints([...constraints, { id: tempId, constraint_code: code, description: desc, source }]);
    // Persist to Supabase
    if (id) {
      createConstraint.mutate({ project_id: id, constraint_code: code, description: desc, source });
    }
    toast.success("已新增 AI 建議約束");
  };

  const handleAdoptKpiSuggestion = (kpi: SuggestedKpi) => {
    const tempId = `k-ai-${Date.now()}`;
    const newKpi = {
      id: tempId,
      kpi_name: kpi.kpi_name,
      target_value: kpi.target_value,
      unit: kpi.unit,
      measurement_method: kpi.measurement_method,
    };
    // Optimistic local update
    setKpis([...kpis, newKpi]);
    // Persist to Supabase
    if (id) {
      createKpi.mutate({
        project_id: id,
        kpi_name: kpi.kpi_name,
        target_value: kpi.target_value,
        unit: kpi.unit,
        measurement_method: kpi.measurement_method,
      });
    }
    toast.success("已新增 AI 建議 KPI");
  };

  const handleSubmit = async () => {
    if (!missionReady || !hasConstraint || !hasKpi) {
      toast.error("請完成所有必填項目");
      return;
    }

    // Trigger feasibility check if not done
    if (feasibilityStatus === "idle") {
      handleFeasibilityCheck();
      return;
    }

    if (!id) return;
    if (isSubmitting) return; // 防止重複送出
    setIsSubmitting(true);

    try {
      // 1) Upsert brief (mission + 5W1H)
      await upsertBrief.mutateAsync({
        project_id: id,
        mission,
        task_definition_5w1h: taskDef5W1H as unknown as TablesInsert<"briefs">["task_definition_5w1h"],
      });

      // 2) Sync constraints — create / update / delete
      const validConstraints = constraints.filter((c) => c.description.trim().length >= 2);
      const existingDbConstraints = constraintsQuery.data ?? [];

      // 刪除：DB 有、目前表單沒有
      const validConstraintIds = new Set(validConstraints.map((c) => c.id));
      const constraintsToDelete = existingDbConstraints.filter((db) => !validConstraintIds.has(db.id));

      for (const d of constraintsToDelete) {
        await deleteConstraint.mutateAsync({ id: d.id });
      }

      // 新增 / 更新
      for (const c of validConstraints) {
        if (c.id.startsWith("c-")) {
          await createConstraint.mutateAsync({
            project_id: id,
            constraint_code: c.constraint_code,
            description: c.description,
            source: c.source || undefined,
          });
        } else {
          await updateConstraint.mutateAsync({
            id: c.id,
            constraint_code: c.constraint_code,
            description: c.description,
            source: c.source || undefined,
          });
        }
      }

      // 3) Sync KPIs — create / update / delete
      const validKpis = kpis.filter(
        (k) => k.kpi_name.trim() && k.target_value.trim() && k.unit.trim() && k.measurement_method.trim()
      );
      const existingDbKpis = kpisQuery.data ?? [];

      // 刪除：DB 有、目前表單沒有
      const validKpiIds = new Set(validKpis.map((k) => k.id));
      const kpisToDelete = existingDbKpis.filter((db) => !validKpiIds.has(db.id));

      for (const d of kpisToDelete) {
        await deleteKpi.mutateAsync({ id: d.id });
      }

      // 新增 / 更新
      for (const k of validKpis) {
        if (k.id.startsWith("k-")) {
          await createKpi.mutateAsync({
            project_id: id,
            kpi_name: k.kpi_name,
            target_value: k.target_value,
            unit: k.unit,
            measurement_method: k.measurement_method,
          });
        } else {
          await updateKpi.mutateAsync({
            id: k.id,
            kpi_name: k.kpi_name,
            target_value: k.target_value,
            unit: k.unit,
            measurement_method: k.measurement_method,
          });
        }
      }

      toast.success("任務定義已保存");
      navigate(`/projects/${id}/explore`);
    } catch (err) {
      console.error("handleSubmit failed:", err);
      toast.error("保存失敗，請重試");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell-narrow">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center mx-auto max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">載入失敗</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">無法取得任務定義資料。</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重試
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell-narrow">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回 Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBackendHealthCheck(true)}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", backendStatus === "checking" && "animate-spin")} />
              後端檢查
            </Button>
            <Badge variant={backendStatus === "ok" ? "default" : backendStatus === "down" ? "destructive" : "secondary"} className="text-[10px]">
              {backendStatus === "ok" ? "Backend 正常" : backendStatus === "down" ? "Backend 異常" : "Backend 檢查中"}
            </Badge>
            {saveStatus !== "idle" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && (
                  <><Check className="h-3 w-3 text-success" /> Saved</>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-phase-1" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              任務定義
              <HelpTooltip text="任務定義是設計流程的起點。上傳素材讓 AI 自動提取約束，定義 Mission、硬約束和 KPI，並通過約束可行性驗證 (Gate 1)。" className="ml-2 align-middle" />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Step 1.1 · 結構化定義 Mission、約束與 KPI，支援 AI 自動提取
            </p>
          </div>
        </div>
      </div>

      <SectionIntro text="上傳專案相關素材，AI 將自動提取約束與假設。接著定義核心使命、硬約束、軟目標與 KPI，通過約束可行性驗證後進入下一階段。" />

      {backendStatus === "down" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive flex items-center justify-between gap-3">
            <span>{backendStatusMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBackendHealthCheck(true)}
              className="h-7"
            >
              重新檢查
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section 1: 多模態素材上傳 */}
      <FileUploadZone
        files={uploadedFiles}
        onFilesChange={setUploadedFiles}
        onExtract={handleExtract}
        isExtracting={isExtracting}
      />

      {/* Section 2: AI 提取結果 */}
      <AIExtractionResults
        items={extractedItems}
        onItemsChange={setExtractedItems}
        onAcceptAll={handleAcceptAllExtracted}
        visible={showExtraction}
      />

      {/* Section 3: Mission */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            核心使命 (Mission Statement) <span className="text-destructive">★</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground italic">
            模板：在 [情境] 下，系統必須 [行為]，且 [指標] 不得超標
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="在 [情境] 下，系統必須 [行為]，且 [指標] 不得超標"
            rows={4}
            maxLength={500}
            className={cn(
              "min-h-[100px]",
              missionReady && "border-l-[3px] border-l-success"
            )}
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {!missionReady && mission.trim().length > 0 && (
                <span className="text-destructive">Mission 需至少 10 個字元</span>
              )}
              {missionReady && !showMissionSuggestion && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleMissionRewrite}
                  disabled={isMissionRewriting}
                  className="text-xs h-7"
                >
                  {isMissionRewriting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  AI 改寫
                  <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
                </Button>
              )}
            </div>
            <span>{mission.length}/500</span>
          </div>
          {showMissionSuggestion && (
            <>
              <AISuggestionCard
                title="改寫建議"
                content={missionSuggestion}
                changesSummary={missionChangesSummary}
                isLoading={isMissionRewriting}
                onAdopt={handleAdoptMissionSuggestion}
                onSkip={() => { setShowMissionSuggestion(false); setMissionSuggestion(null); }}
                rows={4}
              />
              {missionEvidenceRefs.length > 0 && (
                <EvidenceRefsInline references={missionEvidenceRefs} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Hard Constraints */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              硬約束 (Hard Constraints) <span className="text-destructive">★</span>
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleConstraintSuggest}
              disabled={isConstraintSuggesting || activeConstraintActionIndex !== null}
            >
              {isConstraintSuggesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              AI 建議
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConstraintsTable constraints={constraints} onChange={setConstraints} />
          {showConstraintSuggestions && (
            <div className="space-y-2 mt-3">
              {isConstraintSuggesting && (
                <AISuggestionCard
                  title="分析中..."
                  isLoading
                  onAdopt={() => {}}
                  onSkip={() => { setShowConstraintSuggestions(false); setIsConstraintSuggesting(false); }}
                  disableActions={activeConstraintActionIndex !== null}
                />
              )}
              {constraintSuggestionList.map((s, i) => (
                <AISuggestionCard
                  key={i}
                  title={`建議約束 #${i + 1}`}
                  content={`約束描述: ${s.description}\n來源依據: ${s.source}`}
                  changesSummary={s.rationale}
                  isAdopting={activeConstraintActionIndex === i}
                  disableActions={activeConstraintActionIndex !== null && activeConstraintActionIndex !== i}
                  onAdopt={async () => {
                    if (activeConstraintActionIndex !== null) return;
                    setActiveConstraintActionIndex(i);
                    try {
                      handleAdoptConstraintSuggestion(s.description, s.source);
                      setConstraintSuggestionList((prev) => {
                        const next = prev.filter((_, idx) => idx !== i);
                        if (next.length === 0) {
                          setShowConstraintSuggestions(false);
                        }
                        return next;
                      });
                    } finally {
                      setActiveConstraintActionIndex(null);
                    }
                  }}
                  onSkip={() => {
                    if (activeConstraintActionIndex !== null) return;
                    setConstraintSuggestionList(prev => prev.filter((_, idx) => idx !== i));
                  }}
                  rows={2}
                />
              ))}
              {!isConstraintSuggesting && constraintEvidenceRefs.length > 0 && (
                <EvidenceRefsInline references={constraintEvidenceRefs} />
              )}
              {!isConstraintSuggesting && constraintSuggestionList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">AI 未產出額外建議</p>
              )}
              {!isConstraintSuggesting && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={activeConstraintActionIndex !== null}
                  onClick={() => {
                    setShowConstraintSuggestions(false);
                    setConstraintSuggestionList([]);
                  }}
                  className="text-xs"
                >
                  關閉建議
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Soft Objectives */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">軟目標 (Soft Objectives)</CardTitle>
          <p className="text-xs text-muted-foreground">可權衡的目標，如效能提升、重量輕量化</p>
        </CardHeader>
        <CardContent>
          <MultiItemInput
            items={softObjectives}
            onChange={setSoftObjectives}
            placeholder="輸入軟目標，按 Enter 新增"
          />
        </CardContent>
      </Card>

      {/* Section 6: Non-Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">非目標 (Non-Goals)</CardTitle>
          <p className="text-xs text-muted-foreground">明確定義本版專案不追求的範圍，避免範圍蔓延</p>
        </CardHeader>
        <CardContent>
          <MultiItemInput
            items={nonGoals}
            onChange={setNonGoals}
            placeholder="輸入非目標，按 Enter 新增"
          />
        </CardContent>
      </Card>

      {/* Section 7: KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              關鍵績效指標 (Critical KPIs) <span className="text-destructive">★</span>
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleKpiSuggest}
              disabled={isKpiSuggesting || activeKpiActionIndex !== null}
            >
              {isKpiSuggesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              AI 建議 KPI
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <KpiList kpis={kpis} onChange={setKpis} />
          {showKpiSuggestions && (
            <div className="space-y-2 mt-3">
              {isKpiSuggesting && (
                <AISuggestionCard
                  title="分析中..."
                  isLoading
                  onAdopt={() => {}}
                  onSkip={() => { setShowKpiSuggestions(false); setIsKpiSuggesting(false); }}
                  disableActions={activeKpiActionIndex !== null}
                />
              )}
              {kpiSuggestionList.map((s, i) => (
                <AISuggestionCard
                  key={i}
                  title={`建議 KPI: ${s.kpi_name}`}
                  content={`目標值: ${s.target_value} ${s.unit}\n衡量方式: ${s.measurement_method}`}
                  changesSummary={s.rationale}
                  isAdopting={activeKpiActionIndex === i}
                  disableActions={activeKpiActionIndex !== null && activeKpiActionIndex !== i}
                  onAdopt={async () => {
                    if (activeKpiActionIndex !== null) return;
                    setActiveKpiActionIndex(i);
                    try {
                      handleAdoptKpiSuggestion(s);
                      setKpiSuggestionList((prev) => {
                        const next = prev.filter((_, idx) => idx !== i);
                        if (next.length === 0) {
                          setShowKpiSuggestions(false);
                        }
                        return next;
                      });
                    } finally {
                      setActiveKpiActionIndex(null);
                    }
                  }}
                  onSkip={() => {
                    if (activeKpiActionIndex !== null) return;
                    setKpiSuggestionList(prev => prev.filter((_, idx) => idx !== i));
                  }}
                  rows={2}
                />
              ))}
              {!isKpiSuggesting && kpiEvidenceRefs.length > 0 && (
                <EvidenceRefsInline references={kpiEvidenceRefs} />
              )}
              {!isKpiSuggesting && kpiSuggestionList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">AI 未產出額外建議</p>
              )}
              {!isKpiSuggesting && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={activeKpiActionIndex !== null}
                  onClick={() => {
                    setShowKpiSuggestions(false);
                    setKpiSuggestionList([]);
                  }}
                  className="text-xs"
                >
                  關閉建議
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 8: AI 5W1H */}
      <AITaskDefinitionCard
        data={taskDef5W1H}
        missionReady={missionReady}
        onRegenerate={() => { setTaskDef5W1H(null); generate5W1H(); }}
      />

      {/* Section 9: 約束可行性驗證 (Gate 1) */}
      <FeasibilityValidation
        status={feasibilityStatus}
        conflicts={feasibilityConflicts.map((c, i) => ({ id: `fc-${i}`, ...c }))}
        onCheck={handleFeasibilityCheck}
        onOverride={handleFeasibilityOverride}
      />

      {/* Section 10: Gate 1.1 Checklist */}
      <GateChecklist
        items={gateItems}
        onNavigateNext={() => navigate(`/projects/${id}/explore`)}
      />

      {/* Submit actions */}
      <div className="flex gap-3 pb-8">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />提交中...</>
          ) : feasibilityStatus === "idle" ? (
            <><ShieldCheck className="h-4 w-4 mr-2" />驗證並確認任務定義</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />確認任務定義</>
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate(`/projects/${id}`)}>
          取消
        </Button>
      </div>
    </div>
  );
}
