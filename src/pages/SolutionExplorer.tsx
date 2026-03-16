import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Sparkles, Loader2, Check, X, Minus, Eye, AlertTriangle } from "lucide-react";
import { useContradictions } from "@/hooks/api";
import { useSolutions, useCreateSolution, useUpdateSolution, useConvergenceGraph } from "@/hooks/api/useSolutions";
import { trizParameters } from "@/data/trizParameters";
import { Solution, MustCriteria, ConvergenceNode, ConvergenceEdge } from "@/types/solution";
import { ContradictionSeverity } from "@/types/contradiction";
import { useIsMobile } from "@/hooks/use-mobile";
import ConvergenceGraph from "@/components/solution/ConvergenceGraph";
import HealthMonitor from "@/components/solution/HealthMonitor";

const severityBadgeClass: Record<ContradictionSeverity, string> = {
  fatal: "bg-destructive text-destructive-foreground",
  major: "bg-orange-500 text-white",
  minor: "bg-muted text-muted-foreground",
};

const SolutionExplorer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // --- API hooks ---
  const { data: contradictions = [], isLoading: isLoadingContradictions } = useContradictions(id);
  const { data: solutions = [], isLoading: isLoadingSolutions } = useSolutions(id);
  const { data: convergenceData, isLoading: isLoadingGraph } = useConvergenceGraph(id);
  const createSolution = useCreateSolution();
  const updateSolution = useUpdateSolution();

  const convergenceNodes = convergenceData?.nodes ?? [];
  const convergenceEdges = convergenceData?.edges ?? [];

  const isLoading = isLoadingContradictions || isLoadingSolutions || isLoadingGraph;

  const [selectedContradictionIds, setSelectedContradictionIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const [editForm, setEditForm] = useState<Partial<Solution>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const contradictionNodeCount = useMemo(
    () => convergenceNodes.filter((n) => n.type === "contradiction" && !n.resolved).length,
    [convergenceNodes]
  );

  const filteredSolutions = useMemo(() => {
    if (severityFilter === "all") return solutions;
    return solutions.filter((s) => s.contradictionSeverity === severityFilter);
  }, [solutions, severityFilter]);

  const getParamLabel = (paramId: number | null) => {
    if (!paramId) return "—";
    const p = trizParameters.find((t) => t.id === paramId);
    return p ? `${p.id}. ${p.nameZh}` : "—";
  };

  const toggleContradiction = (cId: string) => {
    setSelectedContradictionIds((prev) =>
      prev.includes(cId) ? prev.filter((x) => x !== cId) : [...prev, cId]
    );
  };

  const handleGenerate = async () => {
    if (selectedContradictionIds.length === 0) {
      toast.error("請至少選擇一個矛盾");
      return;
    }
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    const newSol: Partial<Solution> & { projectId: string; name: string } = {
      projectId: id || "",
      name: "AI 生成方案：智慧阻尼系統",
      description: "基於 MR 流體的半主動阻尼系統，可在毫秒級別調整阻尼特性。",
      mechanism:
        "採用磁流變（MR）流體阻尼器，通過嵌入式控制器根據加速度感測器的即時數據調整電磁線圈電流，改變 MR 流體黏度。系統可在 5ms 內完成阻尼係數切換，適應不同工況的振動抑制需求。搭配自適應演算法，持續學習最佳控制策略。",
      assumptions: ["MR 流體在目標溫度範圍內性能穩定", "控制延遲 ≤ 5ms"],
      risks: [
        { id: "r-new-1", description: "MR 流體長期穩定性未知", severity: "medium", mitigation: "進行 10,000 小時加速老化測試" },
      ],
      minValidation: "使用商用 MR 阻尼器原型在振動台上測試，驗證響應時間與阻尼範圍。",
      mustCriteria: [
        { id: "m1", label: "成本 ≤ 預算上限", passed: null },
        { id: "m2", label: "符合 IEC 噪音標準", passed: true },
        { id: "m3", label: "尺寸 ≤ 現有空間", passed: null },
      ],
      relatedContradictionIds: [...selectedContradictionIds],
      secondaryContradictions: [
        { id: `sc-${Date.now()}`, description: "MR 流體成本較高，可能影響整體預算", severity: "major", resolved: false },
      ],
      contradictionSeverity: "major",
    };
    createSolution.mutate(newSol);
    setIsGenerating(false);
    toast.success("AI 已生成新方案，並完成二次矛盾掃描");
  };

  const openDetail = (sol: Solution) => {
    setSelectedSolution(sol);
    setEditForm({ ...sol });
    setEditErrors({});
    setIsDetailOpen(true);
  };

  const validateEdit = (): boolean => {
    const e: Record<string, string> = {};
    if (!editForm.name || editForm.name.length < 5) e.name = "方案名稱至少 5 個字元";
    if (!editForm.mechanism || editForm.mechanism.length < 50) e.mechanism = "機制說明至少 50 個字元";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDetail = () => {
    if (!validateEdit() || !selectedSolution) return;
    updateSolution.mutate({
      id: selectedSolution.id,
      projectId: selectedSolution.projectId,
      ...editForm,
    } as { id: string; projectId: string } & Partial<Solution>);
    setIsDetailOpen(false);
  };

  const toggleMust = (criteria: MustCriteria) => {
    const next = criteria.passed === null ? true : criteria.passed === true ? false : null;
    setEditForm((f) => ({
      ...f,
      mustCriteria: f.mustCriteria?.map((m) =>
        m.id === criteria.id ? { ...m, passed: next } : m
      ),
    }));
  };

  const getMustIcon = (passed: boolean | null) => {
    if (passed === true) return <Check className="h-3.5 w-3.5 text-primary" />;
    if (passed === false) return <X className="h-3.5 w-3.5 text-destructive" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getMustBadge = (passed: boolean | null) => {
    if (passed === true) return "default";
    if (passed === false) return "destructive";
    return "secondary";
  };

  const mustPassCount = (sol: Solution) => sol.mustCriteria.filter((m) => m.passed === true).length;
  const mustTotal = (sol: Solution) => sol.mustCriteria.length;

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">載入方案資料中...</span>
      </div>
    );
  }

  /* ---- Detail content ---- */
  const detailContent = editForm && (
    <div className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label>方案名稱 *</Label>
        <Input
          value={editForm.name || ""}
          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          className={editErrors.name ? "border-destructive" : ""}
        />
        {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
      </div>

      {/* Contradiction severity badges */}
      {editForm.contradictionSeverity && (
        <div className="space-y-1.5">
          <Label>矛盾嚴重度</Label>
          <Badge className={`text-xs ${severityBadgeClass[editForm.contradictionSeverity]}`}>
            {editForm.contradictionSeverity === "fatal" ? "Fatal 致命" : editForm.contradictionSeverity === "major" ? "Major 重大" : "Minor 次要"}
          </Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>機制說明 *</Label>
        <Textarea
          value={editForm.mechanism || ""}
          onChange={(e) => setEditForm((f) => ({ ...f, mechanism: e.target.value }))}
          rows={4}
          className={editErrors.mechanism ? "border-destructive" : ""}
        />
        {editErrors.mechanism && <p className="text-xs text-destructive">{editErrors.mechanism}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>假設清單</Label>
        <div className="space-y-1">
          {editForm.assumptions?.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={a}
                onChange={(e) => {
                  const next = [...(editForm.assumptions || [])];
                  next[i] = e.target.value;
                  setEditForm((f) => ({ ...f, assumptions: next }));
                }}
                className="text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => {
                  const next = (editForm.assumptions || []).filter((_, j) => j !== i);
                  setEditForm((f) => ({ ...f, assumptions: next }));
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditForm((f) => ({ ...f, assumptions: [...(f.assumptions || []), ""] }))}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> 新增假設
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>風險評估</Label>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>風險</TableHead>
              <TableHead className="w-[80px]">嚴重度</TableHead>
              <TableHead>緩解措施</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editForm.risks?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{r.description}</TableCell>
                <TableCell>
                  <Badge
                    variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {r.severity === "high" ? "高" : r.severity === "medium" ? "中" : "低"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.mitigation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-1.5">
        <Label>最小驗證</Label>
        <Textarea
          value={editForm.minValidation || ""}
          onChange={(e) => setEditForm((f) => ({ ...f, minValidation: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>MUST 快篩</Label>
        <div className="space-y-2">
          {editForm.mustCriteria?.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-md border hover:bg-muted/50 transition-colors"
              onClick={() => toggleMust(m)}
            >
              {getMustIcon(m.passed)}
              <span className="text-sm flex-1">{m.label}</span>
              <Badge variant={getMustBadge(m.passed) as any} className="text-xs">
                {m.passed === true ? "通過" : m.passed === false ? "未通過" : "待評估"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary contradictions */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          二次矛盾掃描結果
          {editForm.secondaryContradictions && editForm.secondaryContradictions.some((sc) => !sc.resolved) && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
        </Label>
        {editForm.secondaryContradictions && editForm.secondaryContradictions.length > 0 ? (
          <div className="space-y-2">
            {editForm.secondaryContradictions.map((sc) => (
              <div key={sc.id} className={`p-2 rounded-md border text-sm ${!sc.resolved ? "border-destructive/30 bg-destructive/5" : ""}`}>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${severityBadgeClass[sc.severity]}`}>
                    {sc.severity === "fatal" ? "Fatal" : sc.severity === "major" ? "Major" : "Minor"}
                  </Badge>
                  <span className={sc.resolved ? "line-through text-muted-foreground" : ""}>{sc.description}</span>
                </div>
              </div>
            ))}
            {editForm.secondaryContradictions.some((sc) => !sc.resolved) && (
              <p className="text-xs text-destructive">⚠️ 存在未解決的二次矛盾，建議針對新矛盾再次生成方案。</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">無二次矛盾 ✅</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSaveDetail} disabled={updateSolution.isPending}>
          {updateSolution.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          保存
        </Button>
        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>取消</Button>
      </div>
    </div>
  );

  return (
    <div className="page-shell-wide">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
            方案探索
          </h1>
          <p className="text-sm text-muted-foreground">基於矛盾生成、篩選和評估設計方案，追蹤收斂至完全解決</p>
        </div>
      </div>

      {/* Top row: Selector + Health Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contradiction selector + generate */}
        <Card className="lg:col-span-2 rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">選擇矛盾並生成方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contradictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚無矛盾，請先前往矛盾識別頁面新增。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contradictions.map((c) => {
                  const selected = selectedContradictionIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleContradiction(c.id)}
                      className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={selected} className="pointer-events-none" />
                        <Badge className={`text-xs ${severityBadgeClass[c.severity]}`}>
                          {c.severity === "fatal" ? "Fatal" : c.severity === "major" ? "Major" : "Minor"}
                        </Badge>
                        <span className="font-medium">
                          {getParamLabel(c.improvingParam)} → {getParamLabel(c.worseningParam)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.engineeringStatement}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating || contradictions.length === 0}>
              {isGenerating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {isGenerating ? "生成中..." : "生成方案"}
            </Button>
          </CardContent>
        </Card>

        {/* Health Monitor */}
        <HealthMonitor nodeCount={contradictionNodeCount} hasCircular={false} />
      </div>

      {/* Convergence Graph */}
      <ConvergenceGraph nodes={convergenceNodes} edges={convergenceEdges} />

      {/* Solution list with filter */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">方案列表 ({filteredSolutions.length})</h2>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="篩選嚴重度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部嚴重度</SelectItem>
              <SelectItem value="fatal">Fatal 致命</SelectItem>
              <SelectItem value="major">Major 重大</SelectItem>
              <SelectItem value="minor">Minor 次要</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredSolutions.length === 0 ? (
          <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="font-medium">尚無方案</p>
              <p className="text-sm mt-1">請選擇矛盾並點擊「生成方案」。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSolutions.map((sol) => (
              <Card
                key={sol.id}
                className="rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                onClick={() => openDetail(sol)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{sol.name}</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{sol.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={`text-xs ${severityBadgeClass[sol.contradictionSeverity]}`}>
                      {sol.contradictionSeverity === "fatal" ? "Fatal" : sol.contradictionSeverity === "major" ? "Major" : "Minor"}
                    </Badge>
                    {sol.secondaryContradictions.some((sc) => !sc.resolved) && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        二次矛盾
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {sol.mustCriteria.map((m) => (
                        <span key={m.id}>{getMustIcon(m.passed)}</span>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      MUST {mustPassCount(sol)}/{mustTotal(sol)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      {isMobile ? (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>方案詳情</DialogTitle>
            </DialogHeader>
            {detailContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="w-[520px] sm:w-[560px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>方案詳情</SheetTitle>
            </SheetHeader>
            {detailContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default SolutionExplorer;
