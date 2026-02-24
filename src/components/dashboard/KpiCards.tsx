import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CriticalKPI } from "@/types/project";
import { TrendingUp, AlertTriangle, XCircle } from "lucide-react";

interface KpiCardsProps {
  kpis: CriticalKPI[];
}

const statusConfig: Record<CriticalKPI["status"], { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }> = {
  on_track: { label: "正常", variant: "default", icon: TrendingUp },
  at_risk: { label: "風險中", variant: "secondary", icon: AlertTriangle },
  off_track: { label: "偏離", variant: "destructive", icon: XCircle },
};

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => {
        const config = statusConfig[kpi.status];
        const Icon = config.icon;
        return (
          <Card key={kpi.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.name}
                </CardTitle>
                <Badge variant={config.variant} className="text-xs">
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.current}</div>
              <p className="text-xs text-muted-foreground mt-1">目標：{kpi.target}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
