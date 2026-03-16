import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Star, Loader2, ZoomIn, ZoomOut, Maximize2, Check } from "lucide-react";
import type { CausalLoop, CausalNode, CausalEdge } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import { cldGenerate } from "@/lib/api";

interface CldTabProps {
  causalLoop: CausalLoop | null;
  onUpdateCausalLoop: (cl: CausalLoop) => void;
  projectId: string;
}

const CANVAS_W = 550;
const CANVAS_H = 350;
const NODE_W = 100;
const NODE_H = 36;

export function CldTab({ causalLoop, onUpdateCausalLoop, projectId }: CldTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [editReason, setEditReason] = useState('');

  const selectedNode = causalLoop?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const breakpointsCount = causalLoop?.nodes.filter((n) => n.isBreakpoint).length ?? 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await cldGenerate({
        project_id: projectId,
        contradictions: [],
        assumptions: [],
      });
      // Map backend response to frontend CausalLoop shape
      const SPACING_X = 140;
      const SPACING_Y = 80;
      const COLS = 4;
      const cld: CausalLoop = {
        nodes: result.nodes.map((n, i) => ({
          id: n.id,
          label: n.label,
          position: { x: (i % COLS) * SPACING_X + 30, y: Math.floor(i / COLS) * SPACING_Y + 30 },
          isBreakpoint: result.breakpoints.includes(n.id),
          breakpointReason: result.breakpoints.includes(n.id) ? 'AI identified breakpoint' : null,
          relatedContradictions: [],
        })),
        edges: result.edges.map((e, i) => ({
          id: `e-${i}`,
          source: e.from_node,
          target: e.to_node,
          feedbackType: e.polarity === '+' ? 'positive' as const : 'negative' as const,
        })),
      };
      onUpdateCausalLoop(cld);
      toast.success('AI 已生成因果迴路圖');
    } catch (err) {
      console.error("CLD generation failed:", err);
      // Fallback to mock data
      const { mockCausalLoop } = await import("@/data/mockExplore");
      if (mockCausalLoop[projectId]) {
        onUpdateCausalLoop(mockCausalLoop[projectId]);
      }
      toast.error('AI 生成失敗，已載入範例資料');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleBreakpoint = (nodeId: string) => {
    if (!causalLoop) return;
    const node = causalLoop.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.isBreakpoint) {
      // Unmark
      const updated = {
        ...causalLoop,
        nodes: causalLoop.nodes.map((n) =>
          n.id === nodeId ? { ...n, isBreakpoint: false, breakpointReason: null } : n
        ),
      };
      onUpdateCausalLoop(updated);
      toast.success('已取消斷路點標記');
    } else {
      // Mark - need reason
      if (editReason.trim().length < 10) {
        toast.error('斷路點理由至少 10 個字元');
        return;
      }
      const updated = {
        ...causalLoop,
        nodes: causalLoop.nodes.map((n) =>
          n.id === nodeId ? { ...n, isBreakpoint: true, breakpointReason: editReason } : n
        ),
      };
      onUpdateCausalLoop(updated);
      setEditReason('');
      toast.success('已標記為斷路點');
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const node = causalLoop?.nodes.find((n) => n.id === nodeId);
    setEditReason(node?.breakpointReason ?? '');
  };

  if (!causalLoop) {
    return (
      <div className="space-y-5">
        <h2 className="text-lg font-semibold">因果迴路圖 (Causal Loop Diagram)</h2>
        {isGenerating ? (
          <div className="space-y-4 py-8">
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <p className="text-sm text-muted-foreground text-center">AI 正在建構因果迴路圖...</p>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-muted-foreground font-medium">尚無因果迴路圖</p>
            <p className="text-sm text-muted-foreground">點擊下方按鈕，AI 將根據問答和矛盾生成因果迴路圖</p>
            <Button onClick={handleGenerate}>
              <Sparkles className="h-4 w-4 mr-1" /> AI 生成因果迴路
              <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Simple SVG-based CLD renderer
  const renderEdge = (edge: CausalEdge) => {
    const src = causalLoop.nodes.find((n) => n.id === edge.source);
    const tgt = causalLoop.nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) return null;

    const sx = src.position.x + NODE_W / 2;
    const sy = src.position.y + NODE_H / 2;
    const tx = tgt.position.x + NODE_W / 2;
    const ty = tgt.position.y + NODE_H / 2;
    const color = edge.feedbackType === 'positive' ? '#3B82F6' : '#dc3545';
    const label = edge.feedbackType === 'positive' ? '+' : '-';

    // Midpoint for label
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;

    return (
      <g key={edge.id}>
        <line
          x1={sx} y1={sy} x2={tx} y2={ty}
          stroke={color}
          strokeWidth={2}
          markerEnd={`url(#arrow-${edge.feedbackType})`}
        />
        <circle cx={mx} cy={my} r={10} fill="white" stroke={color} strokeWidth={1} />
        <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fontWeight="bold" fill={color}>
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-5">
      {/* Purpose intro */}
      <SectionIntro text="因果迴路圖（CLD）呈現設計變量之間的因果關係。正回饋 (+) 表示同向變化，負回饋 (-) 表示反向變化。找出迴路中的「斷路點」——即最值得優先突破的瓶頸變量——可以有效打破惡性循環。" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">因果迴路圖 (Causal Loop Diagram)</h2>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-[#3B82F6] text-white text-xs">{breakpointsCount} 斷路點</Badge>
          <HelpTooltip text="「斷路點」是因果迴路中最具槓桿效應的節點。在此處介入改變，可以打破整個迴路的負面循環，是設計創新的最佳切入點。" />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-muted/50 rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex gap-1 bg-background/90 rounded-md border p-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* AI badge */}
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-[10px]">AI</Badge>
        </div>

        {/* SVG Canvas */}
        <div className="overflow-auto" style={{ maxHeight: '450px' }}>
          <svg
            width={CANVAS_W * zoom}
            height={CANVAS_H * zoom}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="mx-auto"
          >
            {/* Arrow markers */}
            <defs>
              <marker id="arrow-positive" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
              </marker>
              <marker id="arrow-negative" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc3545" />
              </marker>
            </defs>

            {/* Edges */}
            {causalLoop.edges.map(renderEdge)}

            {/* Nodes */}
            {causalLoop.nodes.map((node) => (
              <g
                key={node.id}
                onClick={() => handleSelectNode(node.id)}
                className="cursor-pointer"
              >
                <rect
                  x={node.position.x}
                  y={node.position.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill="white"
                  stroke={node.isBreakpoint ? '#dc3545' : selectedNodeId === node.id ? '#3B82F6' : '#e9ecef'}
                  strokeWidth={node.isBreakpoint ? 2 : 1}
                  strokeDasharray={node.isBreakpoint ? '6 3' : 'none'}
                />
                {node.isBreakpoint && (
                  <text x={node.position.x + NODE_W - 10} y={node.position.y + 12} fontSize={10} fill="#dc3545">★</text>
                )}
                <text
                  x={node.position.x + NODE_W / 2}
                  y={node.position.y + NODE_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#333"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-background/90 rounded-md border px-3 py-2 text-[10px] space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#3B82F6]" /> <span>正回饋 (+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#dc3545]" /> <span>負回饋 (-)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border border-dashed border-[#dc3545]" /> <span>斷路點 ★</span>
          </div>
        </div>
      </div>

      {/* Confirm breakpoints bar */}
      {breakpointsCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">確認斷路點選擇</p>
              <p className="text-xs text-muted-foreground">
                已標記 {breakpointsCount} 個斷路點。確認後將鎖定斷路點並作為後續 TRIZ 求解的輸入。
              </p>
            </div>
            <Button
              onClick={() => {
                toast.success(`已確認 ${breakpointsCount} 個斷路點，可進行下一步`);
              }}
              className="shrink-0"
            >
              <Check className="h-4 w-4 mr-1" /> 確認斷路點
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          AI 重新生成
          <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
        </Button>
      </div>

      {/* Breakpoints list */}
      {causalLoop.nodes.some((n) => n.isBreakpoint) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">已標記斷路點</h3>
            {causalLoop.nodes
              .filter((n) => n.isBreakpoint)
              .map((n, i) => (
                <div key={n.id} className="flex items-start gap-3 p-2 rounded border text-sm">
                  <span className="text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="font-medium">{n.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.breakpointReason}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive shrink-0"
                    onClick={() => handleToggleBreakpoint(n.id)}
                  >
                    取消標記
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Node detail panel */}
      <Sheet open={!!selectedNodeId} onOpenChange={(open) => !open && setSelectedNodeId(null)}>
        <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>節點詳情</SheetTitle>
          </SheetHeader>
          {selectedNode && (
            <div className="space-y-4 py-4">
              <div>
                <span className="text-xs text-muted-foreground">變量名稱</span>
                <p className="font-medium">{selectedNode.label}</p>
              </div>

              {selectedNode.relatedContradictions.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">相關矛盾</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.relatedContradictions.map((cId) => (
                      <Badge key={cId} variant="outline" className="text-xs">{cId}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">斷路點狀態</span>
                {selectedNode.isBreakpoint ? (
                  <div className="space-y-2">
                    <Badge className="bg-[#dc3545] text-white text-xs">★ 已標記為斷路點</Badge>
                    <p className="text-sm">{selectedNode.breakpointReason}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleToggleBreakpoint(selectedNode.id)}
                    >
                      取消標記
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="請說明為何此節點是關鍵斷路點 (至少 10 字元)"
                      rows={3}
                      maxLength={300}
                    />
                    {editReason.length > 0 && editReason.length < 10 && (
                      <p className="text-xs text-destructive">理由至少 10 個字元</p>
                    )}
                    <Button
                      size="sm"
                      className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                      onClick={() => handleToggleBreakpoint(selectedNode.id)}
                    >
                      <Star className="h-3 w-3 mr-1" /> 設為斷路點 ★
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
