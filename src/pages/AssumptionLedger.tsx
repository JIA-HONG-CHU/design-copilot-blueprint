import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssumptionEditor } from "@/components/assumption/AssumptionEditor";
import { CausalLoopDiagram } from "@/components/assumption/CausalLoopDiagram";
import { VerificationKanban } from "@/components/assumption/VerificationKanban";
import { ContradictionTraceability } from "@/components/assumption/ContradictionTraceability";
import {
  mockAssumptions,
  mockCLDNodes, mockCLDEdges, mockCLDLoops,
  mockLinkedContradictions, mockSocraticFeedback, mockConvergenceImpact,
} from "@/data/mockAssumptions";
import {
  ASSUMPTION_STATUS_LABELS,
  SEVERITY_LABELS,
  type Assumption, type AssumptionStatus, type AssumptionFormValues, type VerificationStage,
} from "@/types/assumption";
import {
  ArrowLeft, Plus, Pencil, AlertCircle, RefreshCw, FileQuestion, Trash2, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusVariantMap: Record<AssumptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  validating: "default",
  validated: "secondary",
  refuted: "destructive",
};

const severityColor: Record<Assumption["worstSeverity"], string> = {
  critical: "text-destructive",
  high: "text-warning",
  medium: "text-info",
  low: "text-muted-foreground",
};

export default function AssumptionLedger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<Assumption | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (id && mockAssumptions[id]) {
        setAssumptions(mockAssumptions[id]);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [id]);

  const selectedAssumption = assumptions.find((a) => a.id === selectedId) ?? null;

  const openCreate = () => { setEditingAssumption(null); setEditorOpen(true); };
  const openEdit = (assumption: Assumption) => { setEditingAssumption(assumption); setEditorOpen(true); };

  const handleSave = (data: AssumptionFormValues, existingId?: string) => {
    if (existingId) {
      setAssumptions((prev) =>
        prev.map((a) => a.id === existingId ? {
          ...a, ...data,
          impactScope: data.impactScope ?? a.impactScope,
          updatedAt: new Date().toISOString(),
        } : a)
      );
      toast({ title: "假設已更新" });
    } else {
      const newAssumption: Assumption = {
        id: `asm-${Date.now()}`,
        code: `A-${String(assumptions.length + 1).padStart(3, "0")}`,
        content: data.content,
        source: data.source,
        sourceType: "manual",
        worstConsequence: data.worstConsequence,
        worstSeverity: data.worstSeverity,
        minValidation: data.minValidation,
        validationCost: data.validationCost,
        validationMethod: data.validationMethod,
        estimatedDays: data.estimatedDays,
        status: "pending",
        verificationStage: "unplanned",
        impactScope: data.impactScope ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAssumptions((prev) => [...prev, newAssumption]);
      toast({ title: "假設已新增" });
    }
  };

  const handleStatusChange = (assumptionId: string, newStatus: AssumptionStatus) => {
    setAssumptions((prev) =>
      prev.map((a) => a.id === assumptionId ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a)
    );
    if (newStatus === "refuted") {
      const asm = assumptions.find((a) => a.id === assumptionId);
      const impact = mockConvergenceImpact[assumptionId];
      if (impact) {
        toast({ title: "⚠️ 收斂圖受影響", description: impact.message, variant: "destructive" });
      }
    }
  };

  const handleVerificationStageChange = (assumptionId: string, newStage: VerificationStage) => {
    setAssumptions((prev) =>
      prev.map((a) => a.id === assumptionId ? {
        ...a,
        verificationStage: newStage,
        status: newStage === "refuted" ? "refuted" : newStage === "completed" ? "validated" : newStage === "in_progress" ? "validating" : a.status,
        updatedAt: new Date().toISOString(),
      } : a)
    );
    toast({ title: "驗證階段已更新" });
  };

  const handleDelete = (assumptionId: string) => {
    setAssumptions((prev) => prev.filter((a) => a.id !== assumptionId));
    if (selectedId === assumptionId) setSelectedId(null);
    toast({ title: "假設已刪除" });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center mx-auto max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">載入失敗</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">無法取得假設台帳資料。</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />重試
        </Button>
      </div>
    );
  }

  const cldNodes = id ? mockCLDNodes[id] ?? [] : [];
  const cldEdges = id ? mockCLDEdges[id] ?? [] : [];
  const cldLoops = id ? mockCLDLoops[id] ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />返回專案儀表板
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-phase-1" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">假設台帳</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Step 1.2 · 管理設計假設、因果建模與結構化驗證規劃
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />新增假設
          </Button>
        </div>
      </div>

      {assumptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">尚無假設</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">點擊「新增假設」開始記錄設計前提與假設。</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新增假設</Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main content */}
          <div className="space-y-6 min-w-0">
            {/* CLD */}
            <CausalLoopDiagram
              nodes={cldNodes}
              edges={cldEdges}
              loops={cldLoops}
              selectedAssumptionId={selectedId}
              onNodeClick={(asmId) => setSelectedId(asmId ?? null)}
            />

            {/* Tabs: Table + Kanban */}
            <Tabs defaultValue="table">
              <TabsList>
                <TabsTrigger value="table">假設列表</TabsTrigger>
                <TabsTrigger value="kanban">驗證看板</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-3">
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">編號</TableHead>
                            <TableHead className="min-w-[180px]">假設內容</TableHead>
                            <TableHead className="min-w-[100px]">來源</TableHead>
                            <TableHead className="w-16">嚴重度</TableHead>
                            <TableHead className="w-20">成本</TableHead>
                            <TableHead className="w-[120px]">狀態</TableHead>
                            <TableHead className="w-16">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assumptions.map((asm) => (
                            <TableRow
                              key={asm.id}
                              className={cn("cursor-pointer", selectedId === asm.id && "bg-muted/50")}
                              onClick={() => setSelectedId(asm.id)}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {asm.code}
                                {asm.sourceType === "ai_extracted" && (
                                  <Badge variant="secondary" className="text-[8px] ml-1 px-1"><Sparkles className="h-2 w-2" /></Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm max-w-[250px]"><p className="line-clamp-2">{asm.content}</p></TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[120px]"><p className="line-clamp-1">{asm.source}</p></TableCell>
                              <TableCell>
                                <span className={cn("text-xs font-medium", severityColor[asm.worstSeverity])}>
                                  {SEVERITY_LABELS[asm.worstSeverity]}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{asm.validationCost}</TableCell>
                              <TableCell>
                                <Select value={asm.status} onValueChange={(v) => handleStatusChange(asm.id, v as AssumptionStatus)}>
                                  <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.entries(ASSUMPTION_STATUS_LABELS) as [AssumptionStatus, string][]).map(([val, label]) => (
                                      <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(asm); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(asm.id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {assumptions.map((asm) => (
                    <Card
                      key={asm.id}
                      className={cn("cursor-pointer", selectedId === asm.id && "ring-2 ring-primary")}
                      onClick={() => setSelectedId(asm.id)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{asm.code}</span>
                            {asm.sourceType === "ai_extracted" && <Badge variant="secondary" className="text-[9px]">AI 提取</Badge>}
                            <Badge variant={statusVariantMap[asm.status]} className="text-xs">{ASSUMPTION_STATUS_LABELS[asm.status]}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(asm); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(asm.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{asm.content}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className={cn("font-medium", severityColor[asm.worstSeverity])}>{SEVERITY_LABELS[asm.worstSeverity]}</span>
                          <span>{asm.validationCost}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="mt-3">
                <VerificationKanban
                  assumptions={assumptions}
                  onMoveStage={handleVerificationStageChange}
                  onSelect={(asm) => { setSelectedId(asm.id); openEdit(asm); }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel: Contradiction Traceability */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <ContradictionTraceability
                assumptionId={selectedId}
                assumptionCode={selectedAssumption?.code}
                isRefuted={selectedAssumption?.status === "refuted"}
                linkedContradictions={selectedId ? mockLinkedContradictions[selectedId] ?? [] : []}
                socraticFeedback={selectedId ? mockSocraticFeedback[selectedId] ?? [] : []}
                convergenceImpact={selectedId ? mockConvergenceImpact[selectedId] : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate(`/projects/${id}/task-definition`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />上一步：任務定義
        </Button>
        <Button onClick={() => navigate(`/projects/${id}/contradiction-identification`)}>
          下一步：矛盾識別
        </Button>
      </div>

      {/* Editor */}
      <AssumptionEditor
        key={editingAssumption?.id ?? "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        assumption={editingAssumption}
        onSave={handleSave}
      />
    </div>
  );
}
