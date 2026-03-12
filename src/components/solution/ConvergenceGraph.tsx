import { useMemo } from "react";
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
  fatal: "Fatal",
  major: "Major",
  minor: "Minor",
};

const ConvergenceGraph = ({ nodes, edges }: ConvergenceGraphProps) => {
  const { width, height, positioned } = useMemo(() => {
    if (nodes.length === 0) return { width: 500, height: 200, positioned: [] };
    const maxX = Math.max(...nodes.map((n) => n.x)) + 160;
    const maxY = Math.max(...nodes.map((n) => n.y)) + 80;
    return { width: Math.max(500, maxX), height: Math.max(200, maxY), positioned: nodes };
  }, [nodes]);

  const leafNodes = useMemo(() => {
    const fromSet = new Set(edges.map((e) => e.from));
    return nodes.filter((n) => !fromSet.has(n.id) && n.type === "contradiction");
  }, [nodes, edges]);

  const allConverged = leafNodes.length > 0 && leafNodes.every((n) => n.resolved);
  const hasUnresolved = leafNodes.some((n) => !n.resolved);

  return (
    <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contradiction Convergence Graph</CardTitle>
          <Badge
            variant={allConverged ? "default" : "destructive"}
            className={`text-xs ${allConverged ? "bg-emerald-600" : ""}`}
          >
            {allConverged ? "✅ 已收斂" : hasUnresolved ? "⚠️ 進行中" : "— 無數據"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">尚無收斂圖數據，請生成方案後查看。</div>
        ) : (
          <div className="overflow-x-auto">
            <svg width={width} height={height} className="min-w-[500px]">
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
                    x1={from.x + 60}
                    y1={from.y + 20}
                    x2={to.x}
                    y2={to.y + 20}
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
                return (
                  <g key={node.id} opacity={opacity}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g className="cursor-pointer">
                          <rect
                            x={node.x}
                            y={node.y}
                            width={120}
                            height={40}
                            rx={isContradiction ? 4 : 20}
                            fill={fill}
                          />
                          <text
                            x={node.x + 60}
                            y={node.y + 22}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={10}
                            fontWeight={500}
                          >
                            {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
                          </text>
                          {isContradiction && node.severity && (
                            <text
                              x={node.x + 120 - 4}
                              y={node.y + 10}
                              textAnchor="end"
                              fontSize={8}
                              fill={textColor}
                              fontWeight={700}
                            >
                              {severityLabel[node.severity]}
                            </text>
                          )}
                          {node.resolved && (
                            <text x={node.x + 6} y={node.y + 12} fontSize={10}>✓</text>
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
        <div className="flex gap-3 mt-3 flex-wrap">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default ConvergenceGraph;
