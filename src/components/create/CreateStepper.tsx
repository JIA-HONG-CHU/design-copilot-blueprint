import { cn } from "@/lib/utils";
import { Check, ArrowRight, Zap, Target } from "lucide-react";
import type { AccordionStepStatus } from "@/types/create";

interface CreateStepperProps {
  steps: { label: string; shortLabel: string }[];
  statuses: AccordionStepStatus[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

// ── Internal helpers ────────────────────────────────────────────────────────

function PipelineChip({
  displayNum, label, status, isCurrent, onClick,
}: {
  displayNum: number; label: string; status: AccordionStepStatus;
  isCurrent: boolean; onClick: () => void;
}) {
  const isComplete = status === "complete";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all group min-w-[44px] cursor-pointer">
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
        isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
        isComplete && !isCurrent && "bg-primary/15 text-primary",
        !isCurrent && !isComplete && "bg-muted text-muted-foreground",
        !isCurrent && "group-hover:ring-2 group-hover:ring-primary/10",
      )}>
        {isComplete ? <Check className="h-3.5 w-3.5" /> : displayNum}
      </div>
      <span className={cn(
        "text-[10px] leading-tight text-center transition-colors hidden sm:block",
        isCurrent ? "text-primary font-medium" : "text-muted-foreground",
      )}>
        {label}
      </span>
    </button>
  );
}

function Connector({ complete }: { complete: boolean }) {
  return (
    <div className="flex-1 h-[2px] mx-0.5 rounded-full min-w-[6px]">
      <div className={cn("h-full rounded-full transition-colors", complete ? "bg-primary/40" : "bg-muted")} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CreateStepper({ steps, statuses, currentStep, onStepClick }: CreateStepperProps) {
  const ENTRY_INDEX = 0;          // Anti-Anchor (internal index 0)
  const PIPELINE = [1, 2, 3, 4, 5, 6]; // TRIZ → 子系統 → SCAMPER → 候選方案 → MUST → Pre-CAD

  const entryComplete = statuses[ENTRY_INDEX] === "complete";
  const isEntryActive = currentStep === ENTRY_INDEX;

  return (
    <div className="space-y-3">

      {/* ── Layer 1: Entry Modes ── */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">起始模式</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Entry A: Anti-Anchor */}
          <button
            onClick={() => onStepClick(ENTRY_INDEX)}
            className={cn(
              "text-left rounded-lg border p-3 transition-all cursor-pointer",
              "hover:border-amber-300 hover:bg-amber-50/50",
              isEntryActive && "border-amber-400 bg-amber-50/80 shadow-sm",
              entryComplete && !isEntryActive && "border-muted bg-muted/20",
              !isEntryActive && !entryComplete && "border-muted",
            )}
          >
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", isEntryActive ? "text-amber-500" : "text-muted-foreground")} />
              <span className="text-xs font-semibold">入口 A｜反向探索</span>
              {entryComplete && <Check className="h-3.5 w-3.5 text-green-500 ml-auto" />}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              跳脫既有假設，AI 產出非典型架構，注入新矛盾至主幹
            </p>
          </button>

          {/* Entry B: Direct-to-TRIZ */}
          <button
            onClick={() => onStepClick(1)}
            className={cn(
              "text-left rounded-lg border p-3 transition-all cursor-pointer",
              "hover:border-blue-300 hover:bg-blue-50/50",
              PIPELINE.includes(currentStep) && !isEntryActive && "border-blue-300 bg-blue-50/50",
              !PIPELINE.includes(currentStep) && !isEntryActive && "border-muted",
            )}
          >
            <div className="flex items-center gap-2">
              <Target className={cn("h-4 w-4", PIPELINE.includes(currentStep) ? "text-blue-500" : "text-muted-foreground")} />
              <span className="text-xs font-semibold">入口 B｜直接解矛盾</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              從已識別矛盾直接進入 TRIZ 三路徑求解
            </p>
          </button>
        </div>

        {/* Cognitive correction line */}
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          兩種入口皆匯入同一主幹流程
        </p>
      </div>

      {/* ── Merge node ── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-px w-10 bg-border" />
          <div className="px-3 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            ▼ 統一匯流至主幹
          </div>
          <div className="h-px w-10 bg-border" />
        </div>
      </div>

      {/* ── Layer 2: Core Pipeline ── */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">主幹流程</p>
        <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
          {PIPELINE.map((stepIdx, pos) => (
            <div key={stepIdx} className="flex items-center flex-1 min-w-0">
              <PipelineChip
                displayNum={pos + 1}
                label={steps[stepIdx].shortLabel}
                status={statuses[stepIdx]}
                isCurrent={currentStep === stepIdx}
                onClick={() => onStepClick(stepIdx)}
              />
              {pos < PIPELINE.length - 1 && <Connector complete={statuses[stepIdx] === "complete"} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
