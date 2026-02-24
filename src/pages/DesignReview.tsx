import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Loader2, FileText, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { mockSolutions } from "@/data/mockSolutions";
import { createDefaultReview } from "@/data/mockDesignReview";
import { DesignReviewData, EvidenceItem, RiskItem } from "@/types/designReview";

const QUALITY_OPTIONS = [
  { value: "strong", label: "強" },
  { value: "moderate", label: "中" },
  { value: "weak", label: "弱" },
  { value: "none", label: "無" },
];

const LEVEL_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "critical", label: "嚴重" },
];

const DesignReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const candidates = mockSolutions.filter(
    (s) => s.projectId === id && s.mustCriteria.some((m) => m.passed === true)
  );

  const [reviews, setReviews] = useState<Record<string, DesignReviewData>>(() => {
    const init: Record<string, DesignReviewData> = {};
    candidates.forEach((s) => { init[s.id] = createDefaultReview(s.id); });
    return init;
  });

  const [editingSolId, setEditingSolId] = useState<string | null>(null);
  const [conclusion, setConclusion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---- Evidence Matrix helpers ---- */
  const updateEvidence = (solId: string, eId: string, field: keyof EvidenceItem, value: string) => {
    setReviews((prev) => ({
      ...prev,
      [solId]: {
        ...prev[solId],
        evidenceMatrix: prev[solId].evidenceMatrix.map((e) =>
          e.id === eId ? { ...e, [field]: value } : e
        ),
      },
    }));
  };

  const addEvidence = (solId: string) => {
    const newE: EvidenceItem = {
      id: `e-${Date.now()}`, category: "", requirement: "", currentEvidence: "",
      evidenceQuality: "none", evidenceGap: "", nextExperiment: "", owner: "", dueDate: "",
    };
    setReviews((prev) => ({
      ...prev,
      [solId]: { ...prev[solId], evidenceMatrix: [...prev[solId].evidenceMatrix, newE] },
    }));
  };

  const removeEvidence = (solId: string, eId: string) => {
    setReviews((prev) => ({
      ...prev,
      [solId]: { ...prev[solId], evidenceMatrix: prev[solId].evidenceMatrix.filter((e) => e.id !== eId) },
    }));
  };

  /* ---- Risk Register helpers ---- */
  const updateRisk = (solId: string, rId: string, field: keyof RiskItem, value: string) => {
    setReviews((prev) => ({
      ...prev,
      [solId]: {
        ...prev[solId],
        riskRegister: prev[solId].riskRegister.map((r) =>
          r.id === rId ? { ...r, [field]: value } : r
        ),
      },
    }));
  };

  const addRisk = (solId: string) => {
    const newR: RiskItem = {
      id: `rk-${Date.now()}`, description: "", failureMode: "",
      probability: "low", severity: "low", riskLevel: "low", mitigation: "", monitoringMetric: "",
    };
    setReviews((prev) => ({
      ...prev,
      [solId]: { ...prev[solId], riskRegister: [...prev[solId].riskRegister, newR] },
    }));
  };

  const removeRisk = (solId: string, rId: string) => {
    setReviews((prev) => ({
      ...prev,
      [solId]: { ...prev[solId], riskRegister: prev[solId].riskRegister.filter((r) => r.id !== rId) },
    }));
  };

  const setDisposition = (solId: string, value: string) => {
    setReviews((prev) => ({
      ...prev,
      [solId]: { ...prev[solId], disposition: value as DesignReviewData["disposition"] },
    }));
  };

  const markReviewed = (solId: string) => {
    const r = reviews[solId];
    if (!r.disposition) { toast.error("請選擇方案去向"); return; }
    setReviews((prev) => ({ ...prev, [solId]: { ...prev[solId], reviewed: true } }));
    setEditingSolId(null);
    toast.success("方案審查完成");
  };

  const allReviewed = candidates.every((c) => reviews[c.id]?.reviewed);

  const handleApprove = async () => {
    if (!allReviewed) { toast.error("請完成所有方案的審查"); return; }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    toast.success("設計審查已完成，專案推進至下一階段");
    navigate(`/projects/${id}`);
  };

  const editingCandidate = candidates.find((c) => c.id === editingSolId);
  const editingReview = editingSolId ? reviews[editingSolId] : null;

  const qualityBadge = (q: string) => {
    const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      strong: "default", moderate: "secondary", weak: "outline", none: "destructive",
    };
    return map[q] || "outline";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
            設計審查
          </h1>
          <p className="text-sm text-muted-foreground">MVP CAD 初步審查，識別設計缺陷與證據缺口</p>
        </div>
      </div>

      {/* Candidate cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">審查方案 ({candidates.length})</h2>
        {candidates.length === 0 ? (
          <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="font-medium">沒有審查方案</p>
              <p className="text-sm mt-1">請先完成 Pre-CAD 審查。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map((sol) => {
              const r = reviews[sol.id];
              return (
                <Card key={sol.id} className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{sol.name}</h3>
                      <Badge variant={r?.reviewed ? "default" : "outline"} className="text-xs shrink-0">
                        {r?.reviewed ? "已審查" : "待審查"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{sol.description}</p>
                    {r?.reviewed && r.disposition && (
                      <Badge
                        variant={r.disposition === "approve" ? "default" : r.disposition === "revise" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {r.disposition === "approve" ? "批准" : r.disposition === "revise" ? "修訂" : "淘汰"}
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingSolId(sol.id)}>
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        {r?.reviewed ? "查看" : "審查"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Conclusion */}
      {candidates.length > 0 && (
        <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> 審查結論
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>審查結論備註（選填）</Label>
              <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="記錄審查會議的關鍵討論和決策原因..." maxLength={500} rows={3} />
            </div>
            <Button onClick={handleApprove} disabled={!allReviewed || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              批准審查
            </Button>
            {!allReviewed && <p className="text-xs text-muted-foreground">* 需完成所有方案的審查後才能批准</p>}
          </CardContent>
        </Card>
      )}

      {/* DR EM + Risk Register Dialog */}
      <Dialog open={!!editingSolId} onOpenChange={(o) => !o && setEditingSolId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCandidate?.name} — 設計審查</DialogTitle>
          </DialogHeader>
          {editingReview && editingSolId && (
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="evidence"><FileText className="mr-1 h-3.5 w-3.5" /> DR EM</TabsTrigger>
                <TabsTrigger value="risk"><ShieldAlert className="mr-1 h-3.5 w-3.5" /> 風險登錄</TabsTrigger>
                <TabsTrigger value="decision">決策</TabsTrigger>
              </TabsList>

              {/* Evidence Matrix */}
              <TabsContent value="evidence" className="space-y-3 mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">類別</TableHead>
                        <TableHead className="min-w-[100px]">要求</TableHead>
                        <TableHead className="min-w-[120px]">目前證據</TableHead>
                        <TableHead className="min-w-[70px]">品質</TableHead>
                        <TableHead className="min-w-[120px]">缺口</TableHead>
                        <TableHead className="min-w-[120px]">最小實驗</TableHead>
                        <TableHead className="min-w-[80px]">Owner</TableHead>
                        <TableHead className="min-w-[100px]">Due</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingReview.evidenceMatrix.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Input value={e.category} onChange={(ev) => updateEvidence(editingSolId, e.id, "category", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={e.requirement} onChange={(ev) => updateEvidence(editingSolId, e.id, "requirement", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={e.currentEvidence} onChange={(ev) => updateEvidence(editingSolId, e.id, "currentEvidence", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Select value={e.evidenceQuality} onValueChange={(v) => updateEvidence(editingSolId, e.id, "evidenceQuality", v)}>
                              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {QUALITY_OPTIONS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input value={e.evidenceGap} onChange={(ev) => updateEvidence(editingSolId, e.id, "evidenceGap", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={e.nextExperiment} onChange={(ev) => updateEvidence(editingSolId, e.id, "nextExperiment", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={e.owner} onChange={(ev) => updateEvidence(editingSolId, e.id, "owner", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input type="date" value={e.dueDate} onChange={(ev) => updateEvidence(editingSolId, e.id, "dueDate", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEvidence(editingSolId, e.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" size="sm" onClick={() => addEvidence(editingSolId)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> 新增證據項
                </Button>
              </TabsContent>

              {/* Risk Register */}
              <TabsContent value="risk" className="space-y-3 mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">描述</TableHead>
                        <TableHead className="min-w-[120px]">失效模式</TableHead>
                        <TableHead className="min-w-[70px]">機率</TableHead>
                        <TableHead className="min-w-[70px]">嚴重度</TableHead>
                        <TableHead className="min-w-[70px]">等級</TableHead>
                        <TableHead className="min-w-[120px]">緩解措施</TableHead>
                        <TableHead className="min-w-[100px]">監控指標</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingReview.riskRegister.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Input value={r.description} onChange={(ev) => updateRisk(editingSolId, r.id, "description", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={r.failureMode} onChange={(ev) => updateRisk(editingSolId, r.id, "failureMode", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Select value={r.probability} onValueChange={(v) => updateRisk(editingSolId, r.id, "probability", v)}>
                              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={r.severity} onValueChange={(v) => updateRisk(editingSolId, r.id, "severity", v)}>
                              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={r.riskLevel} onValueChange={(v) => updateRisk(editingSolId, r.id, "riskLevel", v)}>
                              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{RISK_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input value={r.mitigation} onChange={(ev) => updateRisk(editingSolId, r.id, "mitigation", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Input value={r.monitoringMetric} onChange={(ev) => updateRisk(editingSolId, r.id, "monitoringMetric", ev.target.value)} className="text-xs h-8" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRisk(editingSolId, r.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" size="sm" onClick={() => addRisk(editingSolId)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> 新增風險項
                </Button>
              </TabsContent>

              {/* Decision */}
              <TabsContent value="decision" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>方案去向 *</Label>
                  <RadioGroup
                    value={editingReview.disposition || ""}
                    onValueChange={(v) => setDisposition(editingSolId, v)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="approve" id="dr-approve" />
                      <Label htmlFor="dr-approve" className="text-sm cursor-pointer">批准</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="revise" id="dr-revise" />
                      <Label htmlFor="dr-revise" className="text-sm cursor-pointer">修訂</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="reject" id="dr-reject" />
                      <Label htmlFor="dr-reject" className="text-sm cursor-pointer">淘汰</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => markReviewed(editingSolId)}>完成審查</Button>
                  <Button variant="outline" onClick={() => setEditingSolId(null)}>關閉</Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignReview;
