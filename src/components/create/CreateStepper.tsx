import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { AccordionStepStatus } from "@/types/create";

interface CreateStepperProps {
  steps: { label: string; shortLabel: string }[];
  statuses: AccordionStepStatus[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function CreateStepper({ steps, statuses, currentStep, onStepClick }: CreateStepperProps) {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const status = statuses[i];
        const isCurrent = i === currentStep;
        const isComplete = status === "complete";
        const isClickable = true;

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            {/* Step circle + label */}
            <button
              onClick={() => isClickable && onStepClick(i)}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group min-w-[48px]",
                isClickable && "cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isComplete && !isCurrent && "bg-primary/15 text-primary",
                  !isCurrent && !isComplete && "bg-muted text-muted-foreground",
                  isClickable && !isCurrent && "group-hover:ring-2 group-hover:ring-primary/10"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight text-center transition-colors hidden sm:block",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {step.shortLabel}
              </span>
            </button>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 rounded-full min-w-[8px]">
                <div
                  className={cn(
                    "h-full rounded-full transition-colors",
                    isComplete ? "bg-primary/40" : "bg-muted"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
