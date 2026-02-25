import { useRef, useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pencil, Trash2 } from "lucide-react";
import type { Subsystem, SubsystemSource } from "@/types/create";

interface SubsystemBlockDiagramProps {
  systemName: string;
  subsystems: Subsystem[];
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

interface CouplingLine {
  fromId: string;
  toId: string;
  contradictionId: string;
}

const SOURCE_CONFIG: Record<SubsystemSource, { label: string; badgeClass: string; borderClass: string }> = {
  rd: { label: "RD", badgeClass: "bg-primary/15 text-primary border-primary/30", borderClass: "border-l-4 border-l-primary" },
  ai: { label: "AI", badgeClass: "bg-muted text-muted-foreground border-muted-foreground/30", borderClass: "border-l-4 border-l-muted-foreground/40" },
  ai_edited: { label: "AI+RD", badgeClass: "bg-accent/15 text-accent-foreground border-accent/30", borderClass: "border-l-4 border-l-accent" },
};

export function SubsystemBlockDiagram({ systemName, subsystems, onToggle, onEdit, onDelete }: SubsystemBlockDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; label: string }[]>([]);
  const isMobile = useIsMobile();

  // Find coupling lines: subsystems sharing the same contradiction
  const couplings: CouplingLine[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < subsystems.length; i++) {
    for (let j = i + 1; j < subsystems.length; j++) {
      const shared = subsystems[i].relatedContradictions.filter(c =>
        subsystems[j].relatedContradictions.includes(c)
      );
      shared.forEach(cId => {
        const key = `${subsystems[i].id}-${subsystems[j].id}-${cId}`;
        if (!seen.has(key)) {
          seen.add(key);
          couplings.push({ fromId: subsystems[i].id, toId: subsystems[j].id, contradictionId: cId });
        }
      });
    }
  }

  const calcLines = useCallback(() => {
    if (isMobile || !containerRef.current) {
      setLines([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines = couplings.map(c => {
      const fromEl = moduleRefs.current.get(c.fromId);
      const toEl = moduleRefs.current.get(c.toId);
      if (!fromEl || !toEl) return null;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      return {
        x1: fromRect.left + fromRect.width / 2 - containerRect.left,
        y1: fromRect.top + fromRect.height / 2 - containerRect.top,
        x2: toRect.left + toRect.width / 2 - containerRect.left,
        y2: toRect.top + toRect.height / 2 - containerRect.top,
        label: c.contradictionId,
      };
    }).filter(Boolean) as typeof lines;
    setLines(newLines);
  }, [subsystems, isMobile, couplings.length]);

  useEffect(() => {
    calcLines();
    window.addEventListener("resize", calcLines);
    return () => window.removeEventListener("resize", calcLines);
  }, [calcLines]);

  useEffect(() => {
    const t = setTimeout(calcLines, 100);
    return () => clearTimeout(t);
  }, [subsystems, calcLines]);

  const setModuleRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) moduleRefs.current.set(id, el);
    else moduleRefs.current.delete(id);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="border-2 border-border rounded-xl p-4 md:p-6 bg-card">
        <div className="text-center mb-4 md:mb-6">
          <Badge variant="outline" className="text-xs font-mono mb-1">System</Badge>
          <p className="text-sm font-semibold">{systemName}</p>
        </div>

        {/* SVG overlay for coupling lines (desktop only) */}
        {!isMobile && lines.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: "visible" }}>
            {lines.map((line, i) => {
              const midX = (line.x1 + line.x2) / 2;
              const midY = (line.y1 + line.y2) / 2;
              return (
                <g key={i}>
                  <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
                  <rect x={midX - 24} y={midY - 10} width="48" height="20" rx="4" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="1" opacity="0.9" />
                  <text x={midX} y={midY + 4} textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))" fontFamily="monospace">{line.label}</text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Module grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 relative z-20">
          {subsystems.map((ss) => {
            const cfg = SOURCE_CONFIG[ss.source];
            return (
              <div
                key={ss.id}
                ref={(el) => setModuleRef(ss.id, el)}
                onClick={() => onToggle(ss.id)}
                className={`
                  relative rounded-lg p-4 cursor-pointer transition-all duration-200
                  ${cfg.borderClass}
                  ${ss.confirmed
                    ? "border-2 border-primary bg-primary/5 shadow-sm"
                    : "border-2 border-dashed border-muted-foreground/30 bg-muted/30"
                  }
                  hover:shadow-md
                `}
              >
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 z-30">
                  {onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(ss.id); }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="編輯"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  {onDelete && ss.source === "rd" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(ss.id); }}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={ss.confirmed}
                    onCheckedChange={() => onToggle(ss.id)}
                    className="mt-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{ss.name}</span>
                      <Badge variant="outline" className={`text-[9px] h-4 ${cfg.badgeClass}`}>{cfg.label}</Badge>
                      {ss.confirmed && (
                        <Badge variant="default" className="text-[9px] h-4">已確認</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ss.reason}</p>

                    {ss.relatedContradictions.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {ss.relatedContradictions.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px] font-mono border-destructive/40 text-destructive">
                            ⚡ {c}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {isMobile && ss.relatedContradictions.length > 0 && (
                      <div className="mt-2">
                        {couplings
                          .filter(cp => cp.fromId === ss.id || cp.toId === ss.id)
                          .map((cp, i) => {
                            const otherId = cp.fromId === ss.id ? cp.toId : cp.fromId;
                            const other = subsystems.find(s => s.id === otherId);
                            return (
                              <p key={i} className="text-[10px] text-muted-foreground">
                                ↔ {other?.name}（{cp.contradictionId}）
                              </p>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border-l-4 border-l-primary border border-primary/30 bg-primary/5" />
          <span className="text-[10px] text-muted-foreground">RD 定義</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border-l-4 border-l-muted-foreground/40 border border-muted-foreground/20 bg-muted/30" />
          <span className="text-[10px] text-muted-foreground">AI 建議</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border-l-4 border-l-accent border border-accent/30 bg-accent/5" />
          <span className="text-[10px] text-muted-foreground">AI+RD 混合</span>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-1.5">
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" /></svg>
            <span className="text-[10px] text-muted-foreground">矛盾耦合連線</span>
          </div>
        )}
      </div>
    </div>
  );
}
