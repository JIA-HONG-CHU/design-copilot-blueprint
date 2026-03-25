import { cn } from "@/lib/utils";
import { Check, ArrowDown } from "lucide-react";
import type { AccordionStepStatus } from "@/types/create";

interface CreateStepperProps {
  steps: { label: string; shortLabel: string }[];
  statuses: AccordionStepStatus[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

/** Compact step chip used across tracks */
function StepChip({
  index, label, status, isCurrent, onClick, accentClass,
}: {
  index: number; label: string; status: AccordionStepStatus;
  isCurrent: boolean; onClick: () => void; accentClass?: string;
}) {
  const isComplete = status === "complete";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all group min-w-[48px] cursor-pointer">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
        isCurrent && (accentClass ?? "bg-primary text-primary-foreground ring-4 ring-primary/20"),
        isComplete && !isCurrent && "bg-primary/15 text-primary",
        !isCurrent && !isComplete && "bg-muted text-muted-foreground",
        !isCurrent && "group-hover:ring-2 group-hover:ring-primary/10",
      )}>
        {isComplete ? <Check className="h-4 w-4" /> : index + 1}
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
    <div className="flex-1 h-[2px] mx-1 rounded-full min-w-[8px]">
      <div className={cn("h-full rounded-full transition-colors", complete ? "bg-primary/40" : "bg-muted")} />
    </div>
  );
}

export function CreateStepper({ steps, statuses, currentStep, onStepClick }: CreateStepperProps) {
  // Step indices
  const ANTI_ANCHOR = 0;
  const SHARED_PIPELINE = [1, 2, 3]; // TRIZ, 子系統, SCAMPER
  const CONVERGE = [4, 5, 6];        // 方案整合, MUST, Pre-CAD

  return (
    <div className="space-y-3">
      {/* ── Dual source: two entry points feeding into shared pipeline ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reverse path: Anti-Anchor */}
        <div className={cn(
          "rounded-lg border-2 p-3 transition-all",
          currentStep === ANTI_ANCHOR ? "border-amber-400 shadow-sm" : "border-muted",
          statuses[ANTI_ANCHOR] === "complete" && currentStep !== ANTI_ANCHOR && "border-muted bg-muted/30",
        )}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🔄</span>
            <span className="text-xs font-semibold">反向路徑：打破框架</span>
            {statuses[ANTI_ANCHOR] === "complete" && <Check className="h-3.5 w-3.5 text-green-500 ml-auto" />}
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">從約束出發，AI 產出非典型架構 → 注入新矛盾至共享管線</p>
          <StepChip
            index={ANTI_ANCHOR}
            label={steps[ANTI_ANCHOR].shortLabel}
            status={statuses[ANTI_ANCHOR]}
            isCurrent={currentStep === ANTI_ANCHOR}
            onClick={() => onStepClick(ANTI_ANCHOR)}
            accentClass="bg-amber-500 text-white ring-4 ring-amber-200"
          />
        </div>

        {/* Forward path: CLD contradictions */}
        <div className={cn(
          "rounded-lg border-2 p-3 transition-all",
          currentStep === ANTI_ANCHOR ? "border-muted" : "border-muted",
          // Forward path is always "active" once contradictions exist
          SHARED_PIPELINE.includes(currentStep) ? "border-blue-400 shadow-sm" : "",
        )}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⚙️</span>
            <span className="text-xs font-semibold">正向路徑：系統化解矛盾</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">從 CLD 矛盾出發，直接進入 TRIZ 三路徑求解</p>
          <div className="flex items-center text-[10px] text-blue-600 font-medium">
            <ArrowDown className="h-3 w-3 mr-1" /> 進入共享管線
          </div>
        </div>
      </div>

      {/* ── Merge indicator ── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="h-px w-8 bg-border" />
          <span className="font-medium text-foreground/60">▼ 共享管線：兩條路徑的矛盾在此統一處理 ▼</span>
          <div className="h-px w-8 bg-border" />
        </div>
      </div>

      {/* ── Shared pipeline: TRIZ → 子系統 → SCAMPER ── */}
      <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
        {SHARED_PIPELINE.map((stepIdx, pos) => (
          <div key={stepIdx} className="flex items-center flex-1 min-w-0">
            <StepChip
              index={stepIdx}
              label={steps[stepIdx].shortLabel}
              status={statuses[stepIdx]}
              isCurrent={currentStep === stepIdx}
              onClick={() => onStepClick(stepIdx)}
              accentClass="bg-blue-600 text-white ring-4 ring-blue-200"
            />
            {pos < SHARED_PIPELINE.length - 1 && <Connector complete={statuses[stepIdx] === "complete"} />}
          </div>
        ))}
      </div>

      {/* ── Converge indicator ── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="h-px w-8 bg-border" />
          <span className="font-medium text-foreground/60">▼ 匯流評估 ▼</span>
          <div className="h-px w-8 bg-border" />
        </div>
      </div>

      {/* ── Converge pipeline: 方案整合 → MUST → Pre-CAD ── */}
      <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
        {CONVERGE.map((stepIdx, pos) => (
          <div key={stepIdx} className="flex items-center flex-1 min-w-0">
            <StepChip
              index={stepIdx}
              label={steps[stepIdx].shortLabel}
              status={statuses[stepIdx]}
              isCurrent={currentStep === stepIdx}
              onClick={() => onStepClick(stepIdx)}
              accentClass="bg-violet-600 text-white ring-4 ring-violet-200"
            />
            {pos < CONVERGE.length - 1 && <Connector complete={statuses[stepIdx] === "complete"} />}
          </div>
        ))}
      </div>
    </div>
  );
}
