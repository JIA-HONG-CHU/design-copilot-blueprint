import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { AccordionStepStatus } from "@/types/create";

interface StepInfo {
  index: number;
  shortLabel: string;
  status: AccordionStepStatus;
}

interface TrackCardProps {
  icon: string;
  label: string;
  subtitle: string;
  colorClass: string;       // border/accent color
  steps: StepInfo[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function TrackCard({
  icon,
  label,
  subtitle,
  colorClass,
  steps,
  currentStep,
  onStepClick,
}: TrackCardProps) {
  const allComplete = steps.every((s) => s.status === "complete");
  const hasActive = steps.some((s) => s.index === currentStep);

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-all",
        hasActive ? `${colorClass} shadow-sm` : "border-muted",
        allComplete && !hasActive && "border-muted bg-muted/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold">{label}</h3>
        {allComplete && <Check className="h-4 w-4 text-green-500 ml-auto" />}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

      {/* Mini stepper */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const isCurrent = step.index === currentStep;
          const isComplete = step.status === "complete";

          return (
            <div key={step.index} className="flex items-center">
              <button
                onClick={() => onStepClick(step.index)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                  "hover:bg-accent/50 cursor-pointer",
                  isCurrent && "bg-primary text-primary-foreground",
                  isComplete && !isCurrent && "bg-primary/10 text-primary",
                  !isCurrent && !isComplete && "text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">
                    {step.index + 1}
                  </span>
                )}
                {step.shortLabel}
              </button>
              {i < steps.length - 1 && (
                <span className="text-muted-foreground/40 mx-0.5">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
