import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Check, X, FileDown, PenLine, CalendarDays, User, Shield } from "lucide-react";
import { mockDecisionRecord } from "@/data/mockDecisionRecord";
import { DecisionRecord, ActionItem } from "@/types/decisionRecord";

const DesignDecisionRecord = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<DecisionRecord>({ ...mockDecisionRecord });

  const toggleAction = (aId: string) => {
    setRecord((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((a) =>
        a.id === aId ? { ...a, completed: !a.completed } : a
      ),
    }));
  };

  const handleSign = (idx: number) => {
    setRecord((prev) => ({
      ...prev,
      signOffs: prev.signOffs.map((s, i) =>
        i === idx ? { ...s, signed: true, signedAt: new Date().toISOString() } : s
      ),
    }));
    toast.success("簽核完成");
  };

  const allSigned = record.signOffs.every((s) => s.signed);

  const handleExport = () => {
    toast.info("報告匯出功能開發中");
  };

  const riskBadge = (level: string) => {
    const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      low: "outline", medium: "secondary", high: "default", critical: "destructive",
    };
    return map[level] || "outline";
  };

  const riskLabel = (level: string) => {
    const map: Record<string, string> = { low: "低", medium: "中", high: "高", critical: "嚴重" };
    return map[level] || level;
  };

  // Group WANT results by solution
  const solutionNames = [...new Set(record.wantResults.map((w) => w.solutionName))];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
            決策記錄
          </h1>
          <p className="text-sm text-muted-foreground">記錄設計決策的過程、依據與結論</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileDown className="mr-1 h-4 w-4" /> 匯出報告
        </Button>
      </div>

      {/* 1. Decision Overview */}
      <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PenLine className="h-5 w-5" /> 決策概覽
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">{record.statement}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {record.decider}（{record.deciderRole}）</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {record.date}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">主路線</p>
              <Badge variant="default" className="text-sm">{record.primarySolution}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">備援方案</p>
              <Badge variant="secondary" className="text-sm">{record.backupSolution}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KT Analysis */}
      <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">KT 決策分析結果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MUST */}
          <div>
            <h3 className="text-sm font-semibold mb-2">MUST 結果</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>方案</TableHead>
                  <TableHead className="w-[80px]">結果</TableHead>
                  <TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.mustResults.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{m.solutionName}</TableCell>
                    <TableCell>
                      {m.passed ? (
                        <Badge variant="default" className="text-xs"><Check className="mr-1 h-3 w-3" />通過</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs"><X className="mr-1 h-3 w-3" />淘汰</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* WANT */}
          <div>
            <h3 className="text-sm font-semibold mb-2">WANT 評分</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>方案</TableHead>
                    <TableHead>評估準則</TableHead>
                    <TableHead className="text-right">權重</TableHead>
                    <TableHead className="text-right">評分</TableHead>
                    <TableHead className="text-right">加權分</TableHead>
                    <TableHead>證據</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {record.wantResults.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{w.solutionName}</TableCell>
                      <TableCell className="text-sm">{w.criteria}</TableCell>
                      <TableCell className="text-right text-sm">{w.weight}</TableCell>
                      <TableCell className="text-right text-sm">{w.score}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{w.weightedScore}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.evidenceLink}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals per solution */}
                  {solutionNames.map((name) => {
                    const total = record.wantResults
                      .filter((w) => w.solutionName === name)
                      .reduce((sum, w) => sum + w.weightedScore, 0);
                    return (
                      <TableRow key={`total-${name}`} className="bg-muted/50 font-semibold">
                        <TableCell className="text-sm">{name}</TableCell>
                        <TableCell className="text-sm">合計</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-sm">{total}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Risks */}
          <div>
            <h3 className="text-sm font-semibold mb-2">風險評估</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>風險描述</TableHead>
                  <TableHead className="w-[80px]">等級</TableHead>
                  <TableHead>緩解措施</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.risks.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell>
                      <Badge variant={riskBadge(r.level)} className="text-xs">{riskLabel(r.level)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.mitigation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Action Items */}
      <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">行動項目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {record.actionItems.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/30 transition-colors">
                <Checkbox checked={a.completed} onCheckedChange={() => toggleAction(a.id)} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.task}</p>
                  <p className="text-xs text-muted-foreground">{a.owner} · {a.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Sign-off */}
      <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> 簽核
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {record.signOffs.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-md border">
              <div>
                <p className="text-sm font-medium">{s.role}：{s.name}</p>
                {s.signed && s.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    簽核於 {new Date(s.signedAt).toLocaleString("zh-TW")}
                  </p>
                )}
              </div>
              {s.signed ? (
                <Badge variant="default" className="text-xs"><Check className="mr-1 h-3 w-3" />已簽核</Badge>
              ) : (
                <Button size="sm" onClick={() => handleSign(idx)}>簽核</Button>
              )}
            </div>
          ))}
          {allSigned && (
            <p className="text-sm text-primary font-medium pt-2">✓ 所有簽核已完成，決策記錄為最終狀態。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DesignDecisionRecord;
