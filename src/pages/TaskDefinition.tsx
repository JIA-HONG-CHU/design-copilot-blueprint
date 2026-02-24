import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiInputList } from "@/components/task-definition/KpiInputList";
import { MultiItemInput } from "@/components/task-definition/MultiItemInput";
import { mockTaskDefinitions } from "@/data/mockTaskDefinition";
import { taskDefinitionSchema, type TaskDefinitionFormValues, type TaskDefinitionKPI } from "@/types/taskDefinition";
import { ArrowLeft, Save, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TaskDefinition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Form state
  const [mission, setMission] = useState("");
  const [hardConstraints, setHardConstraints] = useState<string[]>([]);
  const [softObjectives, setSoftObjectives] = useState<string[]>([]);
  const [nonGoals, setNonGoals] = useState<string[]>([]);
  const [criticalKPIs, setCriticalKPIs] = useState<TaskDefinitionKPI[]>([
    { id: "kpi-default", name: "", target: "", method: "" },
  ]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string | string[]>>({});

  // Simulate loading mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (id && mockTaskDefinitions[id]) {
        const data = mockTaskDefinitions[id];
        setMission(data.mission);
        setHardConstraints(data.hardConstraints);
        setSoftObjectives(data.softObjectives);
        setNonGoals(data.nonGoals);
        setCriticalKPIs(data.criticalKPIs);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [id]);

  const validate = (): boolean => {
    const formData: TaskDefinitionFormValues = {
      mission,
      hardConstraints,
      softObjectives,
      nonGoals,
      criticalKPIs,
    };

    const result = taskDefinitionSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string | string[]> = {};
    const kpiErrors: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const path = issue.path;
      if (path[0] === "criticalKPIs" && typeof path[1] === "number") {
        const idx = String(path[1]);
        if (!kpiErrors[idx]) kpiErrors[idx] = [];
        kpiErrors[idx].push(issue.message);
      } else if (path[0] === "criticalKPIs") {
        fieldErrors.criticalKPIs = issue.message;
      } else if (typeof path[0] === "string" && typeof path[1] === "number") {
        // Array item error (hardConstraints, softObjectives, nonGoals)
        const key = path[0];
        if (!fieldErrors[key]) fieldErrors[key] = [];
        (fieldErrors[key] as string[]).push(`第 ${path[1] + 1} 項：${issue.message}`);
      } else {
        fieldErrors[String(path[0])] = issue.message;
      }
    }

    fieldErrors._kpiItems = kpiErrors as any;
    setErrors(fieldErrors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);

    toast({
      title: "任務定義已儲存",
      description: "已成功更新任務定義，即將進入假設台帳。",
    });

    setTimeout(() => {
      navigate(`/projects/${id}/assumption-ledger`);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center mx-auto max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">載入失敗</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          無法取得任務定義資料，請稍後再試。
        </p>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${id}`)}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回專案儀表板
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任務定義</h1>
          <p className="text-sm text-muted-foreground mt-1">
            結構化定義專案的需求、約束與目標，為後續決策提供依據。
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mission */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Mission（核心使命）<span className="text-destructive ml-1">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="描述專案的核心使命與目標，例如：設計一款適用於城市通勤場景的高效動力傳動系統..."
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex justify-between">
              {errors.mission && (
                <p className="text-xs text-destructive">{errors.mission as string}</p>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {mission.length}/500
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Hard Constraints */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hard Constraints（硬約束）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              專案必須遵守的不可妥協限制，如成本上限、法規要求等。按 Enter 或點擊 + 新增。
            </p>
            <MultiItemInput
              items={hardConstraints}
              onChange={setHardConstraints}
              placeholder="例：成本 ≤ $150 USD"
              errors={errors.hardConstraints as string[] | undefined}
            />
          </CardContent>
        </Card>

        {/* Soft Objectives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Soft Objectives（軟目標）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              希望達成但可權衡的目標，如效能提升、輕量化等。
            </p>
            <MultiItemInput
              items={softObjectives}
              onChange={setSoftObjectives}
              placeholder="例：噪音 < 55dB"
              errors={errors.softObjectives as string[] | undefined}
            />
          </CardContent>
        </Card>

        {/* Non-Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Non-Goals（非目標）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              明確定義本版專案不追求的功能或範圍，避免範圍蔓延。
            </p>
            <MultiItemInput
              items={nonGoals}
              onChange={setNonGoals}
              placeholder="例：不考慮競速場景"
              errors={errors.nonGoals as string[] | undefined}
            />
          </CardContent>
        </Card>

        {/* Critical KPIs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              三個最不能失敗指標（Critical KPIs）<span className="text-destructive ml-1">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              定義專案最關鍵的衡量指標，每個指標需包含名稱、目標值和衡量方式。
            </p>
            <KpiInputList
              kpis={criticalKPIs}
              onChange={setCriticalKPIs}
              errors={(errors._kpiItems as unknown as Record<string, string[]>) ?? undefined}
            />
            {typeof errors.criticalKPIs === "string" && (
              <p className="text-xs text-destructive">{errors.criticalKPIs}</p>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/projects/${id}`)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                確認任務定義
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
