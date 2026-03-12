import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ConvergenceState } from '@/types/convergence';

interface Props {
  state: ConvergenceState;
}

const healthConfig = {
  healthy: { color: 'bg-emerald-500', label: '健康', pulse: true },
  warning: { color: 'bg-amber-500', label: '警告', pulse: true },
  critical: { color: 'bg-red-500', label: '危險', pulse: false },
  circular: { color: 'bg-red-500', label: '循環矛盾', pulse: false },
} as const;

export function ConvergenceDashboard({ state }: Props) {
  const hcfg = healthConfig[state.health];
  const isExploring = state.status === 'exploring' || state.status === 'scanning';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-4">
        {/* Row 1: Confidence + Health + Iteration */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                Pre-CAD Confidence
              </span>
              <span className="text-lg font-bold tabular-nums">
                {state.confidence}%
              </span>
            </div>
            <Progress
              value={state.confidence}
              className="h-2.5"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Health indicator */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full ${hcfg.color} ${hcfg.pulse ? 'animate-pulse' : ''}`}
              />
              <span className="text-xs font-medium">{hcfg.label}</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {state.graph.nodes.filter((n) => n.type === 'contradiction').length} 節點
              </Badge>
            </div>

            {/* Iteration counter */}
            <Badge variant="secondary" className="text-xs tabular-nums">
              迴圈 #{state.iteration}
            </Badge>

            {isExploring && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                探索中
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Fatal / Major / Minor counters */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
            <p className="text-lg font-bold text-red-600 tabular-nums">
              {state.fatalCount.resolved}/{state.fatalCount.total}
            </p>
            <p className="text-[10px] text-muted-foreground">Fatal 收斂</p>
            {state.fatalCount.total > 0 && (
              <Progress
                value={(state.fatalCount.resolved / state.fatalCount.total) * 100}
                className="mt-1 h-1"
              />
            )}
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <p className="text-lg font-bold text-orange-600 tabular-nums">
              {state.majorCount.resolved}/{state.majorCount.total}
            </p>
            <p className="text-[10px] text-muted-foreground">Major 收斂</p>
            {state.majorCount.total > 0 && (
              <Progress
                value={(state.majorCount.resolved / state.majorCount.total) * 100}
                className="mt-1 h-1"
              />
            )}
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-muted-foreground tabular-nums">
              {state.minorCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Minor (Risk Register)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
