import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Lock, Star } from "lucide-react";

interface MissionSummaryCardProps {
  mission?: string;
  hardConstraints?: string;
  softObjectives?: string;
}

export function MissionSummaryCard({ mission, hardConstraints, softObjectives }: MissionSummaryCardProps) {
  if (!mission && !hardConstraints && !softObjectives) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">任務摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mission && (
          <div className="flex gap-2">
            <Target className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Mission</div>
              <p className="text-sm leading-relaxed">{mission}</p>
            </div>
          </div>
        )}
        {hardConstraints && (
          <div className="flex gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Hard Constraints</div>
              <p className="text-sm leading-relaxed">{hardConstraints}</p>
            </div>
          </div>
        )}
        {softObjectives && (
          <div className="flex gap-2">
            <Star className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Soft Objectives</div>
              <p className="text-sm leading-relaxed">{softObjectives}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
