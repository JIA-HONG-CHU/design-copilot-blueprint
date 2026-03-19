import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Star, Loader2, Check, Maximize2, Minimize2 } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeChange,
  applyNodeChanges,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import type { CausalLoop, CausalNode, CausalEdge } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import { cldGenerate } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/api/useQueryConfig";

interface CldTabProps {
  causalLoop: CausalLoop | null;
  onUpdateCausalLoop: (cl: CausalLoop) => void;
  projectId: string;
  contradictions?: string[];
  assumptions?: string[];
  mission?: string;
  constraints?: string[];
  kpis?: string[];
}

const NODE_W = 140;
const NODE_H = 40;

// ── Dagre auto-layout ────────────────────────────────────────────────────────

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  Dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}

// ── Map CausalLoop → React Flow nodes/edges ──────────────────────────────────

function toFlowNodes(causalNodes: CausalNode[]): Node[] {
  return causalNodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: { label: n.label, isBreakpoint: n.isBreakpoint },
    style: {
      width: NODE_W,
      height: NODE_H,
      borderRadius: 8,
      border: n.isBreakpoint ? "2px dashed #dc3545" : "1px solid #e9ecef",
      background: n.isBreakpoint ? "#fff5f5" : "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: n.isBreakpoint ? 600 : 400,
      cursor: "pointer",
    },
  }));
}

function toFlowEdges(causalEdges: CausalEdge[]): Edge[] {
  return causalEdges.map((e) => {
    const isPositive = e.feedbackType === "positive";
    const color = isPositive ? "#3B82F6" : "#dc3545";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      label: isPositive ? "+" : "−",
      labelStyle: { fill: color, fontWeight: 700, fontSize: 14 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4,
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    };
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function CldTab({ causalLoop, onUpdateCausalLoop, projectId, contradictions = [], assumptions = [], mission, constraints, kpis }: CldTabProps) {
  const qc = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  const selectedNode = causalLoop?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const breakpointsCount = causalLoop?.nodes.filter((n) => n.isBreakpoint).length ?? 0;

  const invalidateCld = () => {
    qc.invalidateQueries({ queryKey: queryKeys.cld_nodes.byProject(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.cld_edges.byProject(projectId) });
  };

  // ── React Flow data (memoized) ──────────────────────────────────────────

  const flowEdges = useMemo(() => (causalLoop ? toFlowEdges(causalLoop.edges) : []), [causalLoop]);

  const flowNodes = useMemo(() => {
    if (!causalLoop) return [];
    const raw = toFlowNodes(causalLoop.nodes);
    // Apply dagre layout for clean positioning
    return layoutWithDagre(raw, flowEdges);
  }, [causalLoop, flowEdges]);

  const [localNodes, setLocalNodes] = useState<Node[]>([]);

  // Sync flowNodes → localNodes when data changes
  useMemo(() => {
    setLocalNodes(flowNodes);
  }, [flowNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setLocalNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    const cn = causalLoop?.nodes.find((n) => n.id === node.id);
    setEditReason(cn?.breakpointReason ?? "");
  }, [causalLoop]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await cldGenerate({
        project_id: projectId,
        contradictions,
        assumptions,
        mission,
        constraints,
        kpis,
      });

      // Delete existing CLD data for this project
      await supabase.from("cld_edges").delete().eq("project_id", projectId);
      await supabase.from("cld_nodes").delete().eq("project_id", projectId);

      // Persist nodes (position will be computed by dagre on render)
      const nodeRows = result.nodes.map((n, i) => ({
        project_id: projectId,
        label: n.label,
        x: i * 150,
        y: 0,
        node_type: n.type || "variable",
        is_leverage: result.breakpoints.includes(n.id),
      }));

      const { data: insertedNodes, error: nodesErr } = await supabase
        .from("cld_nodes")
        .insert(nodeRows)
        .select();
      if (nodesErr) throw nodesErr;

      // Build mapping from backend node IDs to Supabase IDs
      const idMap = new Map<string, string>();
      result.nodes.forEach((n, i) => {
        if (insertedNodes?.[i]) {
          idMap.set(n.id, insertedNodes[i].id);
        }
      });

      // Persist edges with mapped node IDs
      const edgeRows = result.edges
        .filter((e) => idMap.has(e.from_node) && idMap.has(e.to_node))
        .map((e) => ({
          project_id: projectId,
          from_node: idMap.get(e.from_node)!,
          to_node: idMap.get(e.to_node)!,
          polarity: e.polarity === "+" ? "positive" : "negative",
        }));

      if (edgeRows.length > 0) {
        const { error: edgesErr } = await supabase.from("cld_edges").insert(edgeRows);
        if (edgesErr) throw edgesErr;
      }

      invalidateCld();
      toast.success("AI 已生成因果迴路圖");
    } catch (err) {
      console.error("CLD generation failed:", err);
      const { mockCausalLoop } = await import("@/data/mockExplore");
      if (mockCausalLoop[projectId]) {
        onUpdateCausalLoop(mockCausalLoop[projectId]);
      }
      toast.error("AI 生成失敗，已載入範例資料");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleBreakpoint = async (nodeId: string) => {
    if (!causalLoop) return;
    const node = causalLoop.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.isBreakpoint) {
      const { error } = await supabase
        .from("cld_nodes")
        .update({ is_leverage: false })
        .eq("id", nodeId);
      if (error) { toast.error(`更新失敗：${error.message}`); return; }
      invalidateCld();
      toast.success("已取消斷路點標記");
    } else {
      if (editReason.trim().length < 10) {
        toast.error("斷路點理由至少 10 個字元");
        return;
      }
      const { error } = await supabase
        .from("cld_nodes")
        .update({ is_leverage: true })
        .eq("id", nodeId);
      if (error) { toast.error(`更新失敗：${error.message}`); return; }
      setEditReason("");
      invalidateCld();
      toast.success("已標記為斷路點");
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────

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

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Purpose intro */}
      <SectionIntro text="因果迴路圖（CLD）呈現設計變量之間的因果關係。正回饋 (+) 表示同向變化，負回饋 (-) 表示反向變化。找出迴路中的「斷路點」——即最值得優先突破的瓶頸變量——可以有效打破惡性循環。拖拉節點以調整佈局。" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">因果迴路圖 (Causal Loop Diagram)</h2>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-[#3B82F6] text-white text-xs">{breakpointsCount} 斷路點</Badge>
          <HelpTooltip text="「斷路點」是因果迴路中最具槓桿效應的節點。在此處介入改變，可以打破整個迴路的負面循環，是設計創新的最佳切入點。" />
        </div>
      </div>

      {/* React Flow Canvas */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background"
            : "relative rounded-lg border overflow-hidden bg-muted/30"
        }
        style={isFullscreen ? undefined : { height: 500 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? "退出全螢幕" : "全螢幕"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <ReactFlow
          nodes={localNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e5e7eb" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[#3B82F6]" />
          <span>正回饋 (+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[#dc3545]" />
          <span>負回饋 (−)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-[2px] border border-dashed border-[#dc3545]" />
          <span>斷路點 ★</span>
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
