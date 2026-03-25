import { cn } from "@/lib/utils";
import { Check, Zap, Target, LayoutGrid } from "lucide-react";
import type { AccordionStepStatus } from "@/types/create";

export type AnalysisTrack = "reverse" | "forward" | null;

interface CreateStepperProps {
  steps: { label: string; shortLabel: string }[];
  statuses: AccordionStepStatus[];
  currentStep: number;
  activeTrack: AnalysisTrack;
  onStepClick: (step: number, track: AnalysisTrack) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function TrackStep({
  label, status, isCurrent, onClick,
}: {
  label: string; status: AccordionStepStatus;
  isCurrent: boolean; onClick: () => void;
}) {
  const isComplete = status === "complete";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded transition-all cursor-pointer",
        "hover:bg-accent/50",
        isCurrent && "bg-primary/10 text-primary font-medium",
        isComplete && !isCurrent && "text-primary/70",
        !isCurrent && !isComplete && "text-muted-foreground",
      )}
    >
      {isComplete ? <Check className="h-3 w-3 shrink-0" /> : <span className="w-3 h-3 rounded-full border shrink-0" />}
      {label}
    </button>
  );
}

function EvalChip({
  label, status, isCurrent, onClick,
}: {
  label: string; status: AccordionStepStatus;
  isCurrent: boolean; onClick: () => void;
}) {
  const isComplete = status === "complete";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
        "hover:bg-accent/50",
        isCurrent && "bg-primary text-primary-foreground",
        isComplete && !isCurrent && "bg-primary/10 text-primary",
        !isCurrent && !isComplete && "text-muted-foreground bg-muted",
      )}
    >
      {isComplete && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export function CreateStepper({ steps, statuses, currentStep, activeTrack, onStepClick }: CreateStepperProps) {
  const HUB = 4;
  const EVAL = [5, 6];

  const reverseSteps = [
    { idx: 0, label: "Anti-Anchor" },
    { idx: 1, label: "TRIZ" },
    { idx: 2, label: "子系統" },
    { idx: 3, label: "SCAMPER" },
  ];
  const forwardSteps = [
    { idx: 1, label: "TRIZ" },
    { idx: 2, label: "子系統" },
    { idx: 3, label: "SCAMPER" },
  ];

  // A step is "current in this track" only if BOTH the index matches AND the track matches
  const isCurrentInTrack = (stepIdx: number, track: AnalysisTrack) =>
    currentStep === stepIdx && activeTrack === track;

  const isReverseActive = activeTrack === "reverse";
  const isForwardActive = activeTrack === "forward";
  const isHubActive = currentStep === HUB && activeTrack === null;

  const reverseHasProgress = statuses[0] !== "not_started";
  const forwardHasProgress = statuses[1] !== "not_started";

  return (
    <div className="space-y-3">

      {/* ── Layer 1: Dual Analysis Tracks ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">雙軌分析</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Reverse Track */}
        <div className={cn(
          "rounded-lg border-2 p-3 transition-all",
          isReverseActive ? "border-amber-400 shadow-sm bg-amber-50/30" : "border-muted",
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={cn("h-4 w-4", isReverseActive ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-xs font-semibold">反向路徑</span>
            <span className="text-[10px] text-muted-foreground ml-auto">打破框架</span>
          </div>
          <div className="space-y-0.5">
            {reverseSteps.map((s) => (
              <TrackStep
                key={`r-${s.idx}-${s.label}`}
                label={s.label}
                status={s.idx === 0 ? statuses[s.idx] : "not_started"}
                isCurrent={isCurrentInTrack(s.idx, "reverse")}
                onClick={() => onStepClick(s.idx, "reverse")}
              />
            ))}
          </div>
          {reverseHasProgress && (
            <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1.5">
              方案數：{statuses[0] === "complete" ? "待整合" : "分析中..."}
            </p>
          )}
        </div>

        {/* Forward Track */}
        <div className={cn(
          "rounded-lg border-2 p-3 transition-all",
          isForwardActive ? "border-blue-400 shadow-sm bg-blue-50/30" : "border-muted",
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Target className={cn("h-4 w-4", isForwardActive ? "text-blue-500" : "text-muted-foreground")} />
            <span className="text-xs font-semibold">正向路徑</span>
            <span className="text-[10px] text-muted-foreground ml-auto">系統化解矛盾</span>
          </div>
          <div className="space-y-0.5">
            {forwardSteps.map((s) => (
              <TrackStep
                key={`f-${s.idx}-${s.label}`}
                label={s.label}
                status={statuses[s.idx]}
                isCurrent={isCurrentInTrack(s.idx, "forward")}
                onClick={() => onStepClick(s.idx, "forward")}
              />
            ))}
          </div>
          {forwardHasProgress && (
            <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1.5">
              方案數：{statuses[3] === "complete" ? "待整合" : "分析中..."}
            </p>
          )}
        </div>
      </div>

      {/* ── Layer 2: Decision Hub ── */}
      <div className="flex items-center justify-center py-1">
        <div className="h-px w-8 bg-border" />
        <span className="text-[10px] text-muted-foreground mx-2">▼ 方案匯流 ▼</span>
        <div className="h-px w-8 bg-border" />
      </div>

      <button
        onClick={() => onStepClick(HUB, null)}
        className={cn(
          "w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer",
          "hover:border-violet-300 hover:bg-violet-50/30",
          isHubActive && "border-violet-500 bg-violet-50/50 shadow-sm",
          !isHubActive && "border-muted",
        )}
      >
        <div className="flex items-center gap-2">
          <LayoutGrid className={cn("h-4 w-4", isHubActive ? "text-violet-600" : "text-muted-foreground")} />
          <span className="text-xs font-semibold">候選方案決策中心</span>
          {statuses[HUB] === "complete" && <Check className="h-3.5 w-3.5 text-green-500 ml-auto" />}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          攤平兩條路徑的所有方案，橫向比較來源、機制、假設、驗證需求與信心等級
        </p>
      </button>

      {/* ── Layer 3: Unified Evaluation ── */}
      <div className="flex items-center justify-center gap-2">
        {EVAL.map((stepIdx) => (
          <EvalChip
            key={stepIdx}
            label={steps[stepIdx].shortLabel}
            status={statuses[stepIdx]}
            isCurrent={currentStep === stepIdx && activeTrack === null}
            onClick={() => onStepClick(stepIdx, null)}
          />
        ))}
      </div>
    </div>
  );
}
