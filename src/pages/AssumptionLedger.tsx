import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssumptionEditor } from "@/components/assumption/AssumptionEditor";
import { mockAssumptions } from "@/data/mockAssumptions";
import { ASSUMPTION_STATUS_LABELS, type Assumption, type AssumptionStatus, type AssumptionFormValues } from "@/types/assumption";
import { ArrowLeft, Plus, Pencil, AlertCircle, RefreshCw, FileQuestion } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusVariantMap: Record<AssumptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  validating: "default",
  validated: "secondary",
  refuted: "destructive",
};

export default function AssumptionLedger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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

  const openCreate = () => {
    setEditingAssumption(null);
    setEditorOpen(true);
  };

  const openEdit = (assumption: Assumption) => {
    setEditingAssumption(assumption);
    setEditorOpen(true);
  };

  const handleSave = (data: AssumptionFormValues, existingId?: string) => {
    if (existingId) {
      setAssumptions((prev) =>
        prev.map((a) =>
          a.id === existingId ? { ...a, ...data, updatedAt: new Date().toISOString() } : a
        )
      );
      toast({ title: "假設已更新", description: "假設內容已成功儲存。" });
    } else {
      const newAssumption: Assumption = {
        id: `asm-${Date.now()}`,
        ...data,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAssumptions((prev) => [...prev, newAssumption]);
      toast({ title: "假設已新增", description: "新假設已成功加入台帳。" });
    }
  };

  const handleStatusChange = (assumptionId: string, newStatus: AssumptionStatus) => {
    setAssumptions((prev) =>
      prev.map((a) =>
        a.id === assumptionId ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
      )
    );
    toast({ title: "狀態已更新" });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />返回專案儀表板
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">假設台帳</h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理所有設計假設，追蹤驗證狀態與潛在影響。
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />新增假設
          </Button>
        </div>
      </div>

      {/* Content */}
      {assumptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">尚無假設</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            點擊「新增假設」開始記錄設計前提與假設。
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />新增假設
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[200px]">假設內容</TableHead>
                      <TableHead className="min-w-[120px]">依據來源</TableHead>
                      <TableHead className="min-w-[120px]">最壞後果</TableHead>
                      <TableHead className="min-w-[100px]">驗證成本</TableHead>
                      <TableHead className="w-[130px]">狀態</TableHead>
                      <TableHead className="w-16">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assumptions.map((asm, index) => (
                      <TableRow key={asm.id}>
                        <TableCell className="text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                        <TableCell className="text-sm max-w-[300px]">
                          <p className="line-clamp-2">{asm.content}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px]">
                          <p className="line-clamp-1">{asm.source}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px]">
                          <p className="line-clamp-1">{asm.worstConsequence}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{asm.validationCost}</TableCell>
                        <TableCell>
                          <Select value={asm.status} onValueChange={(v) => handleStatusChange(asm.id, v as AssumptionStatus)}>
                            <SelectTrigger className="h-7 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(ASSUMPTION_STATUS_LABELS) as [AssumptionStatus, string][]).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asm)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-3">
            {assumptions.map((asm, index) => (
              <Card key={asm.id} className="cursor-pointer" onClick={() => openEdit(asm)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                      <Badge variant={statusVariantMap[asm.status]} className="text-xs">
                        {ASSUMPTION_STATUS_LABELS[asm.status]}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); openEdit(asm); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{asm.content}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">依據：</span> {asm.source}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">成本：</span> {asm.validationCost}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
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

      {/* Editor Drawer */}
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
