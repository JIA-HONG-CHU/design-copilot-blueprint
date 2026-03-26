/**
 * ConvergenceGraph — React Flow + Dagre auto-layout graph
 *
 * Replaces the old hand-written SVG implementation. Uses @xyflow/react for
 * pan/zoom/drag and @dagrejs/dagre for automatic DAG positioning.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  applyNodeChanges,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import type { ConvergenceNode, ConvergenceEdge } from "@/types/solution";
import type { ContradictionSeverity } from "@/types/contradiction";

// ── Styles ───────────────────────────────────────────────────────────────────

const graphStyles = `
  .convergence-flow .react-flow {
    background: hsl(var(--muted) / 0.2) !important;
    border-radius: 8px;
  }
  .convergence-flow .react-flow__controls-button {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
  }
  .convergence-flow .react-flow__controls-button svg {
    fill: hsl(var(--foreground));
  }
  .convergence-flow .react-flow__minimap {
    border: 1px solid hsl(var(--border));
    border-radius: 4px;
  }
`;

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 56;

const SEVERITY_COLOR: Record<ContradictionSeverity, string> = {
  fatal: "#DC2626",   // red-600
  major: "#EA580C",   // orange-600
  minor: "#9CA3AF",   // gray-400
};

const SEVERITY_BG: Record<ContradictionSeverity, string> = {
  fatal: "#FEF2F2",   // red-50
  major: "#FFF7ED",   // orange-50
  minor: "#F9FAFB",   // gray-50
};

const SEVERITY_LABEL: Record<ContradictionSeverity, string> = {
  fatal: "Fatal",
  major: "Major",
  minor: "Minor",
};

// ── Dagre layout ─────────────────────────────────────────────────────────────

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 70 });

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

// ── Map domain types → React Flow types ──────────────────────────────────────

function toFlowNodes(nodes: ConvergenceNode[]): Node[] {
  return nodes.map((n) => {
    const isContradiction = n.type === "contradiction";
    const severity = n.severity ?? "minor";
    const borderColor = isContradiction ? SEVERITY_COLOR[severity] : "hsl(var(--primary))";
    const bgColor = isContradiction ? SEVERITY_BG[severity] : "hsl(var(--primary) / 0.08)";
    const opacity = n.resolved ? 0.45 : 1;

    const label = n.label.length > 60 ? n.label.slice(0, 57) + "..." : n.label;

    return {
      id: n.id,
      position: { x: n.x, y: n.y },
      data: {
        label: (
          <div style={{ opacity, padding: "4px 8px", lineHeight: 1.3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              {isContradiction && n.severity && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "white",
                  background: SEVERITY_COLOR[severity],
                  borderRadius: 3,
                  padding: "1px 4px",
                  lineHeight: 1,
                }}>
                  {SEVERITY_LABEL[severity]}
                </span>
              )}
              {!isContradiction && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                }}>
                  方案
                </span>
              )}
              {n.resolved && (
                <span style={{ fontSize: 9, color: "#16A34A" }}>
                  ✓ 已解決
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "hsl(var(--foreground))" }}>
              {label}
            </div>
          </div>
        ),
      },
      style: {
        width: NODE_W,
        minHeight: NODE_H,
        borderRadius: isContradiction ? 6 : 20,
        border: `2px solid ${borderColor}`,
        background: bgColor,
        padding: 0,
        cursor: "grab",
      },
    };
  });
}

function toFlowEdges(edges: ConvergenceEdge[]): Edge[] {
  return edges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "hsl(var(--muted-foreground))",
      width: 14,
      height: 14,
    },
  }));
}

// ── Minimap color ────────────────────────────────────────────────────────────

function minimapNodeColor(node: Node): string {
  const style = node.style as Record<string, string> | undefined;
  return style?.border?.includes("#DC2626")
    ? "#DC2626"
    : style?.border?.includes("#EA580C")
    ? "#EA580C"
    : style?.border?.includes("#9CA3AF")
    ? "#9CA3AF"
    : "#6366F1";
}

// ── Component ────────────────────────────────────────────────────────────────

interface ConvergenceGraphProps {
  nodes: ConvergenceNode[];
  edges: ConvergenceEdge[];
}

const ConvergenceGraph = ({ nodes, edges }: ConvergenceGraphProps) => {
  const flowEdges = useMemo(() => toFlowEdges(edges), [edges]);

  const initialNodes = useMemo(() => {
    const raw = toFlowNodes(nodes);
    return layoutWithDagre(raw, flowEdges);
  }, [nodes, flowEdges]);

  const [localNodes, setLocalNodes] = useState<Node[]>(initialNodes);

  // Sync when props change
  useMemo(() => {
    setLocalNodes(initialNodes);
  }, [initialNodes]);

  const onNodesChange = (changes: NodeChange[]) => {
    setLocalNodes((prev) => applyNodeChanges(changes, prev));
  };

  const leafNodes = useMemo(() => {
    const fromSet = new Set(edges.map((e) => e.from));
    return nodes.filter((n) => !fromSet.has(n.id) && n.type === "contradiction");
  }, [nodes, edges]);

  const allConverged = leafNodes.length > 0 && leafNodes.every((n) => n.resolved);
  const hasUnresolved = leafNodes.some((n) => !n.resolved);

  // Compute height based on node count — compact when few nodes
  const graphHeight = Math.max(220, Math.min(500, nodes.length * 80 + 80));

  return (
    <Card className="rounded-lg">
      <style>{graphStyles}</style>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">矛盾收斂圖</CardTitle>
          <Badge
            variant={allConverged ? "default" : "secondary"}
            className={`text-[10px] ${allConverged ? "bg-emerald-600 text-white" : ""}`}
          >
            {allConverged ? "已收斂" : hasUnresolved ? "探索中" : "無數據"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {nodes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            尚無收斂圖數據
          </div>
        ) : (
          <div className="convergence-flow" style={{ height: graphHeight }}>
            <ReactFlow
              nodes={localNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} color="hsl(var(--border) / 0.3)" />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={minimapNodeColor}
                maskColor="hsl(var(--background) / 0.7)"
                style={{ height: 80, width: 120 }}
              />
            </ReactFlow>
          </div>
        )}
        {/* Compact legend */}
        <div className="mt-2 flex gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: SEVERITY_COLOR.fatal }} /> Fatal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: SEVERITY_COLOR.major }} /> Major</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: SEVERITY_COLOR.minor }} /> Minor</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#6366F1" }} /> 方案</span>
          <span className="opacity-50">半透明 = 已解決</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConvergenceGraph;
