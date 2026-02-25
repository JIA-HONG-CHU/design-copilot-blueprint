import { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  mockBriefData,
  mockMissionSuggestion,
  mockConstraintSuggestions,
  mockKpiSuggestions,
  mockGenerated5W1H,
} from "@/data/mockTaskDefinition";
import type { BriefConstraint, BriefKPI, TaskDefinition5W1H, GateCheckItem } from "@/types/taskDefinition";
import { ArrowLeft, AlertCircle, RefreshCw, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";

export default function TaskDefinition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Form state
  const [mission, setMission] = useState("");
  const [constraints, setConstraints] = useState<BriefConstraint[]>([
    { id: "c-new", constraint_code: "M1", description: "", source: "" },
  ]);
  const [kpis, setKpis] = useState<BriefKPI[]>([
    { id: "k-new", kpi_name: "", target_value: "", unit: "", measurement_method: "" },
  ]);
  const [taskDef5W1H, setTaskDef5W1H] = useState<TaskDefinition5W1H | null>(null);

  // AI suggestion state
  const [showMissionSuggestion, setShowMissionSuggestion] = useState(false);
  const [showConstraintSuggestions, setShowConstraintSuggestions] = useState(false);
  const [showKpiSuggestions, setShowKpiSuggestions] = useState(false);

  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (id && mockBriefData[id]) {
        const data = mockBriefData[id];
        setMission(data.mission);
        setConstraints(data.constraints);
        setKpis(data.kpis);
        setTaskDef5W1H(data.task_definition_5w1h);
      }
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  // Auto-trigger AI mission suggestion when mission >= 10 chars
  useEffect(() => {
    if (mission.trim().length >= 10 && !showMissionSuggestion) {
      const timer = setTimeout(() => setShowMissionSuggestion(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [mission]);

  // Auto-trigger 5W1H when mission ready
  useEffect(() => {
    if (mission.trim().length >= 10 && !taskDef5W1H) {
      const timer = setTimeout(() => setTaskDef5W1H(mockGenerated5W1H), 2000);
      return () => clearTimeout(timer);
    }
  }, [mission, taskDef5W1H]);

  // Auto-save simulation
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      setSaveStatus("saving");
      setTimeout(() => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [mission, constraints, kpis]);

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
  ], [missionReady, hasConstraint, hasKpi]);

  const handleAdoptMissionSuggestion = () => {
    setMission(mockMissionSuggestion);
    setShowMissionSuggestion(false);
  };

  const handleAdoptConstraintSuggestion = (desc: string, source: string) => {
    const code = `M${constraints.length + 1}`;
    setConstraints([
      ...constraints,
      { id: `c-ai-${Date.now()}`, constraint_code: code, description: desc, source },
    ]);
  };

  const handleAdoptKpiSuggestion = (kpi: typeof mockKpiSuggestions[0]) => {
    setKpis([
      ...kpis,
      { id: `k-ai-${Date.now()}`, ...kpi },
    ]);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${id}`)}
            className="text-muted-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回 Dashboard
          </Button>
          {/* Save status indicator */}
          {saveStatus !== "idle" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && (
                <>
                  <Check className="h-3 w-3 text-[hsl(var(--success))]" />
                  Saved
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[hsl(217,91%,60%)]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Brief — 定義簡報
              <HelpTooltip text="Brief 是整個設計流程的起點。在此定義專案的核心使命、硬約束和 KPI，AI 會自動生成 5W1H 分析。完成 Gate 1.1 後即可進入問題探索階段。" className="ml-2 align-middle" />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Step 1.1 · 結構化定義 Mission、硬約束與 KPI
            </p>
          </div>
        </div>
      </div>

      {/* Purpose intro */}
      <SectionIntro text="請依序填寫核心使命、硬約束與 KPI。AI 會根據您的輸入自動建議改寫、補充約束與指標。所有標記 ★ 的欄位為 Gate 1.1 通過的必要條件。" />

      {/* Section 1: Mission */}
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
              missionReady && "border-l-[3px] border-l-[hsl(var(--success))]",
              !mission.trim() && ""
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {!missionReady && mission.trim().length > 0 && (
              <span className="text-destructive">Mission 需至少 10 個字元</span>
            )}
            <span className="ml-auto">{mission.length}/500</span>
          </div>

          {/* AI Mission Suggestion */}
          {showMissionSuggestion && (
            <AISuggestionCard
              title="改寫建議"
              content={mockMissionSuggestion}
              onAdopt={handleAdoptMissionSuggestion}
              onSkip={() => setShowMissionSuggestion(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* Section 2: Hard Constraints */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              硬約束 (Hard Constraints / MUST) <span className="text-destructive">★</span>
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowConstraintSuggestions(true)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI 建議補充
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConstraintsTable constraints={constraints} onChange={setConstraints} />

          {/* AI constraint suggestions */}
          {showConstraintSuggestions && (
            <div className="space-y-2 mt-3">
              {mockConstraintSuggestions.map((s, i) => (
                <AISuggestionCard
                  key={i}
                  title={`建議約束`}
                  content={`${s.description} (來源: ${s.source})`}
                  onAdopt={() => {
                    handleAdoptConstraintSuggestion(s.description, s.source);
                  }}
                  onSkip={() => {}}
                />
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConstraintSuggestions(false)}
                className="text-xs"
              >
                關閉建議
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              關鍵績效指標 (KPI) <span className="text-destructive">★</span>
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowKpiSuggestions(true)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI 建議 KPI
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <KpiList kpis={kpis} onChange={setKpis} />

          {/* AI KPI suggestions */}
          {showKpiSuggestions && (
            <div className="space-y-2 mt-3">
              {mockKpiSuggestions.map((s, i) => (
                <AISuggestionCard
                  key={i}
                  title={`建議 KPI: ${s.kpi_name}`}
                  content={`目標值: ${s.target_value} ${s.unit} · 衡量方式: ${s.measurement_method}`}
                  onAdopt={() => handleAdoptKpiSuggestion(s)}
                  onSkip={() => {}}
                />
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowKpiSuggestions(false)}
                className="text-xs"
              >
                關閉建議
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: AI Task Definition (5W1H) */}
      <AITaskDefinitionCard
        data={taskDef5W1H}
        missionReady={missionReady}
        onRegenerate={() => setTaskDef5W1H(mockGenerated5W1H)}
      />

      {/* Section 5: Gate 1.1 Checklist */}
      <GateChecklist
        items={gateItems}
        onNavigateNext={() => navigate(`/projects/${id}/explore`)}
      />
    </div>
  );
}
