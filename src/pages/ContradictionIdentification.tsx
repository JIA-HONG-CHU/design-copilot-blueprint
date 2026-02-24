import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
import { trizParameters } from "@/data/trizParameters";
import { mockContradictions } from "@/data/mockContradictions";
import { Contradiction } from "@/types/contradiction";

interface FormErrors {
  naturalDescription?: string;
  improvingParam?: string;
  worseningParam?: string;
  engineeringStatement?: string;
}

const emptyForm = {
  naturalDescription: "",
  improvingParam: null as number | null,
  worseningParam: null as number | null,
  engineeringStatement: "",
  physicalContradiction: "",
};

const ContradictionIdentification = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contradictions, setContradictions] = useState<Contradiction[]>(
    mockContradictions.filter((c) => c.projectId === id)
  );
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMobileEditOpen, setIsMobileEditOpen] = useState(false);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.naturalDescription || form.naturalDescription.length < 10)
      e.naturalDescription = "矛盾描述為必填項，且需至少 10 個字元。";
    if (!form.improvingParam) e.improvingParam = "改善參數為必填項。";
    if (!form.worseningParam) e.worseningParam = "惡化參數為必填項。";
    if (!form.engineeringStatement || form.engineeringStatement.length < 20)
      e.engineeringStatement = "工程表述為必填項，且需至少 20 個字元。";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setErrors({});
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    if (editingId) {
      setContradictions((prev) =>
        prev.map((c) =>
          c.id === editingId ? { ...c, ...form, updatedAt: now } : c
        )
      );
      toast.success("矛盾已更新");
    } else {
      const newContradiction: Contradiction = {
        id: `cont-${Date.now()}`,
        projectId: id || "",
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      setContradictions((prev) => [...prev, newContradiction]);
      toast.success("矛盾已新增");
    }
    resetForm();
    setIsMobileEditOpen(false);
  };

  const handleEdit = (c: Contradiction) => {
    setForm({
      naturalDescription: c.naturalDescription,
      improvingParam: c.improvingParam,
      worseningParam: c.worseningParam,
      engineeringStatement: c.engineeringStatement,
      physicalContradiction: c.physicalContradiction,
    });
    setEditingId(c.id);
    setErrors({});
    setIsMobileEditOpen(true);
  };

  const handleDelete = (cId: string) => {
    setContradictions((prev) => prev.filter((c) => c.id !== cId));
    toast.success("矛盾已刪除");
    if (editingId === cId) resetForm();
  };

  const handleAiTransform = async () => {
    if (!form.naturalDescription || form.naturalDescription.length < 10) {
      setErrors((e) => ({ ...e, naturalDescription: "請先輸入至少 10 個字元的描述。" }));
      return;
    }
    setIsAiLoading(true);
    // Mock AI response
    await new Promise((r) => setTimeout(r, 1500));
    setForm((prev) => ({
      ...prev,
      improvingParam: 9,
      worseningParam: 1,
      engineeringStatement: `當改善「${trizParameters[8].nameZh}」時，「${trizParameters[0].nameZh}」隨之惡化，需要在兩者之間找到平衡。`,
    }));
    setIsAiLoading(false);
    toast.info("AI 已生成建議的 TRIZ 矛盾句，請檢查並調整。");
  };

  const getParamLabel = (paramId: number | null) => {
    if (!paramId) return "—";
    const p = trizParameters.find((t) => t.id === paramId);
    return p ? `${p.id}. ${p.nameZh}` : "—";
  };

  /* ---- Form UI (shared between desktop inline and mobile dialog) ---- */
  const formContent = (
    <div className="space-y-4">
      {/* Natural description */}
      <div className="space-y-1.5">
        <Label htmlFor="naturalDesc">矛盾自然語言描述 *</Label>
        <Textarea
          id="naturalDesc"
          placeholder="例如：增加馬達轉速可以提高效能，但會增加噪音..."
          value={form.naturalDescription}
          onChange={(e) => setForm((f) => ({ ...f, naturalDescription: e.target.value }))}
          maxLength={500}
          rows={3}
          className={errors.naturalDescription ? "border-destructive" : ""}
        />
        {errors.naturalDescription && (
          <p className="text-xs text-destructive">{errors.naturalDescription}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAiTransform}
          disabled={isAiLoading}
          className="mt-1"
        >
          {isAiLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          AI 轉化
        </Button>
      </div>

      {/* Improving / Worsening params */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>改善參數 *</Label>
          <Select
            value={form.improvingParam?.toString() ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, improvingParam: Number(v) }))}
          >
            <SelectTrigger className={errors.improvingParam ? "border-destructive" : ""}>
              <SelectValue placeholder="選擇改善參數" />
            </SelectTrigger>
            <SelectContent>
              {trizParameters.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.id}. {p.nameZh}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.improvingParam && <p className="text-xs text-destructive">{errors.improvingParam}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>惡化參數 *</Label>
          <Select
            value={form.worseningParam?.toString() ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, worseningParam: Number(v) }))}
          >
            <SelectTrigger className={errors.worseningParam ? "border-destructive" : ""}>
              <SelectValue placeholder="選擇惡化參數" />
            </SelectTrigger>
            <SelectContent>
              {trizParameters.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.id}. {p.nameZh}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.worseningParam && <p className="text-xs text-destructive">{errors.worseningParam}</p>}
        </div>
      </div>

      {/* Engineering statement */}
      <div className="space-y-1.5">
        <Label htmlFor="engStatement">工程表述 *</Label>
        <Textarea
          id="engStatement"
          placeholder="當 X 改善時，Y 惡化..."
          value={form.engineeringStatement}
          onChange={(e) => setForm((f) => ({ ...f, engineeringStatement: e.target.value }))}
          maxLength={300}
          rows={2}
          className={errors.engineeringStatement ? "border-destructive" : ""}
        />
        {errors.engineeringStatement && (
          <p className="text-xs text-destructive">{errors.engineeringStatement}</p>
        )}
      </div>

      {/* Physical contradiction */}
      <div className="space-y-1.5">
        <Label htmlFor="physicalCont">物理矛盾（選填）</Label>
        <Textarea
          id="physicalCont"
          placeholder="同一物件需要同時具備屬性 A 和非屬性 A..."
          value={form.physicalContradiction}
          onChange={(e) => setForm((f) => ({ ...f, physicalContradiction: e.target.value }))}
          rows={2}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit}>
          <Plus className="mr-1.5 h-4 w-4" />
          {editingId ? "更新矛盾" : "新增矛盾"}
        </Button>
        {editingId && (
          <Button variant="outline" onClick={() => { resetForm(); setIsMobileEditOpen(false); }}>
            取消
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
            矛盾識別
          </h1>
          <p className="text-sm text-muted-foreground">將工程問題形式化為 TRIZ 矛盾句</p>
        </div>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input form – desktop */}
        <Card className="lg:col-span-2 hidden md:block rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{editingId ? "編輯矛盾" : "新增矛盾"}</CardTitle>
          </CardHeader>
          <CardContent>{formContent}</CardContent>
        </Card>

        {/* List */}
        <Card className="lg:col-span-3 rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">矛盾列表</CardTitle>
            <Button size="sm" className="md:hidden" onClick={() => { resetForm(); setIsMobileEditOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> 新增
            </Button>
          </CardHeader>
          <CardContent>
            {contradictions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-base font-medium">尚無矛盾</p>
                <p className="text-sm mt-1">請使用左側表單新增第一個 TRIZ 矛盾。</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>改善參數</TableHead>
                        <TableHead>惡化參數</TableHead>
                        <TableHead className="min-w-[200px]">工程表述</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contradictions.map((c, idx) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {getParamLabel(c.improvingParam)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {getParamLabel(c.worseningParam)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="line-clamp-2 text-sm cursor-default">{c.engineeringStatement}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">{c.engineeringStatement}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {contradictions.map((c, idx) => (
                    <Card key={c.id} className="rounded-lg">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">矛盾 #{idx + 1}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-xs">改善: {getParamLabel(c.improvingParam)}</Badge>
                          <Badge variant="outline" className="text-xs">惡化: {getParamLabel(c.worseningParam)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{c.engineeringStatement}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile edit dialog */}
      <Dialog open={isMobileEditOpen} onOpenChange={setIsMobileEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯矛盾" : "新增矛盾"}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContradictionIdentification;
