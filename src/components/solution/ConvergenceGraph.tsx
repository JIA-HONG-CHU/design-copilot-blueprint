import { useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConvergenceNode, ConvergenceEdge } from "@/types/solution";
import { ContradictionSeverity } from "@/types/contradiction";

interface ConvergenceGraphProps {
  nodes: ConvergenceNode[];
  edges: ConvergenceEdge[];
}

const severityColor: Record<ContradictionSeverity, string> = {
  fatal: "hsl(var(--destructive))",
  major: "hsl(30, 90%, 50%)",
  minor: "hsl(var(--muted-foreground))",
};

const severityLabel: Record<ContradictionSeverity, string> = {
  fatal: "致命",
  major: "重大",
  minor: "輕微",
};

const NODE_W = 180;
const NODE_H = 52;

const ConvergenceGraph = ({ nodes, edges }: ConvergenceGraphProps) => {
  // Local positions: override node.x/y when dragged
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; origDx: number; origDy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getPos = useCallback(
    (node: ConvergenceNode) => {
      const o = offsets[node.id];
      return { x: node.x + (o?.dx ?? 0), y: node.y + (o?.dy ?? 0) };
    },
    [offsets]
  );

  const positioned = useMemo(() => {
    return nodes.map((n) => ({ ...n, ...getPos(n) }));
  }, [nodes, getPos]);

  const { width, height } = useMemo(() => {
    if (positioned.length === 0) return { width: 500, height: 200 };
    const maxX = Math.max(...positioned.map((n) => n.x)) + NODE_W + 40;
    const maxY = Math.max(...positioned.map((n) => n.y)) + NODE_H + 40;
    return { width: Math.max(500, maxX), height: Math.max(200, maxY) };
  }, [positioned]);

  const leafNodes = useMemo(() => {
    const fromSet = new Set(edges.map((e) => e.from));
    return nodes.filter((n) => !fromSet.has(n.id) && n.type === "contradiction");
  }, [nodes, edges]);

  const allConverged = leafNodes.length > 0 && leafNodes.every((n) => n.resolved);
  const hasUnresolved = leafNodes.some((n) => !n.resolved);

  // --- Drag handlers ---
  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    return { x: (clientX - ctm.e) / ctm.a, y: (clientY - ctm.f) / ctm.d };
  }, []);

  const handlePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      const pt = getSvgPoint(e.clientX, e.clientY);
      const o = offsets[nodeId] ?? { dx: 0, dy: 0 };
      dragRef.current = { nodeId, startX: pt.x, startY: pt.y, origDx: o.dx, origDy: o.dy };
    },
    [offsets, getSvgPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { nodeId, startX, startY, origDx, origDy } = dragRef.current;
      const pt = getSvgPoint(e.clientX, e.clientY);
      setOffsets((prev) => ({
        ...prev,
        [nodeId]: { dx: origDx + (pt.x - startX), dy: origDy + (pt.y - startY) },
      }));
    },
    [getSvgPoint]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contradiction Convergence Graph</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">可拖曳節點</span>
            <Badge
              variant={allConverged ? "default" : "destructive"}
              className={`text-xs ${allConverged ? "bg-emerald-600" : ""}`}
            >
              {allConverged ? "已收斂" : hasUnresolved ? "進行中" : "— 無數據"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">尚無收斂圖數據，請生成方案後查看。</div>
        ) : (
          <div className="overflow-x-auto">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="min-w-[500px] select-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 3 L 0 6 z" fill="hsl(var(--muted-foreground))" />
                </marker>
              </defs>
              {/* Edges */}
              {edges.map((e, i) => {
                const from = positioned.find((n) => n.id === e.from);
                const to = positioned.find((n) => n.id === e.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x + NODE_W / 2}
                    y1={from.y + NODE_H / 2}
                    x2={to.x}
                    y2={to.y + NODE_H / 2}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                    opacity={0.5}
                  />
                );
              })}
              {/* Nodes */}
              {positioned.map((node) => {
                const isContradiction = node.type === "contradiction";
                const fill = isContradiction
                  ? node.severity
                    ? severityColor[node.severity]
                    : "hsl(var(--muted))"
                  : "hsl(var(--primary))";
                const textColor = "white";
                const opacity = node.resolved ? 0.5 : 1;
                const isDragging = dragRef.current?.nodeId === node.id;
                return (
                  <g key={node.id} opacity={opacity}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g
                          className={isDragging ? "cursor-grabbing" : "cursor-grab"}
                          onPointerDown={(e) => handlePointerDown(node.id, e)}
                        >
                          <rect
                            x={node.x}
                            y={node.y}
                            width={NODE_W}
                            height={NODE_H}
                            rx={isContradiction ? 4 : 20}
                            fill={fill}
                            stroke={isDragging ? "hsl(var(--primary))" : "transparent"}
                            strokeWidth={isDragging ? 2 : 0}
                          />
                          <text
                            x={node.x + NODE_W / 2}
                            y={node.y + NODE_H / 2 + 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={10}
                            fontWeight={500}
                            pointerEvents="none"
                          >
                            {node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label}
                          </text>
                          {isContradiction && node.severity && (
                            <text
                              x={node.x + NODE_W - 4}
                              y={node.y + 10}
                              textAnchor="end"
                              fontSize={8}
                              fill={textColor}
                              fontWeight={700}
                              pointerEvents="none"
                            >
                              {severityLabel[node.severity]}
                            </text>
                          )}
                          {node.resolved && (
                            <text x={node.x + 6} y={node.y + 12} fontSize={10} pointerEvents="none">·</text>
                          )}
                        </g>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{node.label}</p>
                          <p>類型: {isContradiction ? "矛盾" : "方案"}</p>
                          {node.severity && <p>嚴重度: {severityLabel[node.severity]}</p>}
                          {node.resolved !== undefined && <p>狀態: {node.resolved ? "已解決" : "未解決"}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        {/* Legend with severity definitions */}
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ background: severityColor.fatal }} /> Fatal
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ background: severityColor.major }} /> Major
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ background: severityColor.minor }} /> Minor
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-primary" /> 方案
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="opacity-50">■</span> 半透明 = 已解決
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2.5">
            <div className="flex items-start gap-1.5">
              <div className="w-2 h-2 rounded-sm mt-0.5 shrink-0" style={{ background: severityColor.fatal }} />
              <span><strong className="text-red-600 dark:text-red-400">Fatal</strong> — 架構層級衝突，必須解決才能收斂。未解決則 Confidence 無法達 100%。</span>
            </div>
            <div className="flex items-start gap-1.5">
              <div className="w-2 h-2 rounded-sm mt-0.5 shrink-0" style={{ background: severityColor.major }} />
              <span><strong className="text-orange-600 dark:text-orange-400">Major</strong> — 影響核心功能的重大矛盾，必須解決。與 Fatal 共同計入 Confidence 分母。</span>
            </div>
            <div className="flex items-start gap-1.5">
              <div className="w-2 h-2 rounded-sm mt-0.5 shrink-0" style={{ background: severityColor.minor }} />
              <span><strong className="text-muted-foreground">Minor</strong> — 次要矛盾，不阻斷流程。記入 Risk Register 供後續追蹤。</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConvergenceGraph;
