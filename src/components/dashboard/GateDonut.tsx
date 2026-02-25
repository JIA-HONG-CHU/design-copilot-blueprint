import { cn } from "@/lib/utils";

interface GateDonutProps {
  passed: number;
  total: number;
}

export function GateDonut({ passed, total }: GateDonutProps) {
  const pct = total > 0 ? (passed / total) * 100 : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{passed}/{total}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold">Gates Passed</div>
        <div className="text-xs text-muted-foreground">{Math.round(pct)}% 完成</div>
      </div>
    </div>
  );
}
