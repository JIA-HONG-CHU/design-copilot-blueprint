/**
 * SpatialConfidenceBadge
 * -----------------------
 * Small badge that surfaces the provenance + confidence layer of a
 * SpatialEstimate (library / rd_confirmed / estimate). Hover reveals
 * the full reference_source trace, rationale, and a legend mapping.
 *
 * @see docs/e2e/module/Forward_Subsystem_Discovery_Architecture.md §6.2
 */
import { CircleDot, HelpCircle, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SpatialEstimate } from "@/types/generated/subsystem";

// ---------------------------------------------------------------------------
// Visual config per confidence layer
// ---------------------------------------------------------------------------

type ConfidenceKey = "library" | "rd_confirmed" | "estimate" | "unknown";

const CONFIDENCE_CONFIG: Record<
  ConfidenceKey,
  { label: string; cls: string; Icon: typeof ShieldCheck }
> = {
  library: {
    label: "Library",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    Icon: CircleDot,
  },
  rd_confirmed: {
    label: "RD 確認",
    cls: "bg-teal-100 text-teal-900 border-teal-400 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-700",
    Icon: ShieldCheck,
  },
  estimate: {
    label: "估算",
    cls: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    Icon: HelpCircle,
  },
  unknown: {
    label: "未知",
    cls: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
    Icon: HelpCircle,
  },
};

// Legend describing reference_source prefixes.
const SOURCE_LEGEND: ReadonlyArray<{ prefix: string; meaning: string }> = [
  { prefix: "rd_override:", meaning: "RD 手動寫入" },
  { prefix: "learned:", meaning: "已推升庫" },
  { prefix: "web:", meaning: "搜尋推斷" },
  { prefix: "seed:", meaning: "種子庫" },
  { prefix: "llm_estimate", meaning: "模型估算" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUpdatedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `更新於 ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function resolveKey(spatial: SpatialEstimate): ConfidenceKey {
  const c = spatial.confidence;
  if (c === "library" || c === "rd_confirmed" || c === "estimate") return c;
  // spatial exists but confidence missing → treat as estimate
  return "estimate";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SpatialConfidenceBadgeProps {
  spatial?: SpatialEstimate | null;
  updatedAt?: string | null;
}

export function SpatialConfidenceBadge({
  spatial,
  updatedAt,
}: SpatialConfidenceBadgeProps) {
  if (!spatial) return null;

  const key = resolveKey(spatial);
  const cfg = CONFIDENCE_CONFIG[key];
  const { Icon } = cfg;

  const referenceSource = spatial.reference_source ?? "(no reference_source)";
  const updatedLine = formatUpdatedAt(updatedAt);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 px-2 py-0.5 text-[10px] font-medium cursor-help",
              cfg.cls,
            )}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span>{cfg.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs space-y-2 text-xs"
        >
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              reference_source
            </div>
            <code className="block break-all rounded bg-muted px-1.5 py-1 font-mono text-[11px]">
              {referenceSource}
            </code>
          </div>

          {updatedLine ? (
            <div className="text-[11px] text-muted-foreground">
              {updatedLine}
            </div>
          ) : null}

          {spatial.rationale ? (
            <div className="text-[11px] leading-snug">
              <span className="font-medium">理由：</span>
              {spatial.rationale}
            </div>
          ) : null}

          <div className="border-t pt-1.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Legend
            </div>
            <ul className="space-y-0.5">
              {SOURCE_LEGEND.map((entry) => (
                <li
                  key={entry.prefix}
                  className="flex gap-1.5 text-[10px] leading-tight"
                >
                  <code className="font-mono text-[10px]">{entry.prefix}</code>
                  <span className="text-muted-foreground">
                    {entry.meaning}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SpatialConfidenceBadge;
