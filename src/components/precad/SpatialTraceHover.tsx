import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { SpatialTrace } from "@/lib/api";

/**
 * Pre-CAD spatial_score with a hover-card trace (WBS 10.3).
 *
 * Backs the "WHY did I get this spatial score?" UX: on hover the RD sees the
 * underlying bbox, total mass, clash pairs, module count, and provenance
 * label. When no trace is present (legacy callers), the score is rendered
 * alone with a small muted "(no spatial trace)" suffix and no hover.
 */
export interface SpatialTraceHoverProps {
  trace?: SpatialTrace | null;
  score: number;
}

const SOURCE_LABEL: Record<SpatialTrace["source"], string> = {
  validator: "來自 Validator",
  llm_fallback: "LLM 後援",
  empty: "無子系統",
};

function formatBbox(bbox: [number, number, number]): string {
  const [x, y, z] = bbox;
  return `${Math.round(x)} × ${Math.round(y)} × ${Math.round(z)} mm`;
}

function formatMass(mass_g: number): string {
  if (mass_g >= 1000) return `${(mass_g / 1000).toFixed(2)} kg`;
  return `${Math.round(mass_g)} g`;
}

function formatClashes(pairs: [string, string][]): string {
  if (pairs.length === 0) return "無碰撞";
  const preview = pairs.slice(0, 3).map(([a, b]) => `${a} ↔ ${b}`).join("、");
  const more = pairs.length > 3 ? `（+${pairs.length - 3} 更多）` : "";
  return `${pairs.length} 組：${preview}${more}`;
}

export function SpatialTraceHover({ trace, score }: SpatialTraceHoverProps) {
  if (!trace) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-semibold">{score}</span>
        <span className="text-xs text-muted-foreground">（無空間追蹤）</span>
      </span>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span
          className="font-semibold underline decoration-dotted underline-offset-4 cursor-help"
          aria-label={`空間分數 ${score}，懸停查看驗證追蹤`}
        >
          {score}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">空間追蹤</span>
          <span className="text-xs text-muted-foreground">{SOURCE_LABEL[trace.source]}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">模組數</span>
          <span className="text-right">{trace.module_count}</span>
          <span className="text-muted-foreground">總質量</span>
          <span className="text-right">{formatMass(trace.total_mass_g)}</span>
          <span className="text-muted-foreground">總包絡</span>
          <span className="text-right">{formatBbox(trace.total_bbox_mm)}</span>
          <span className="text-muted-foreground">碰撞</span>
          <span className="text-right">{formatClashes(trace.clash_pairs)}</span>
        </div>
        {trace.notes.length > 0 && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">備註</p>
            <ul className="text-xs space-y-0.5 list-disc list-inside">
              {trace.notes.slice(0, 3).map((note, i) => (
                <li key={i} className="line-clamp-1">{note}</li>
              ))}
            </ul>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export default SpatialTraceHover;
