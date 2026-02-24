import { useParams, useNavigate } from "react-router-dom";
import { mockProjects } from "@/data/mockProjects";
import { mockProjectDetails, mockProjectHistory, getMockProjectStages } from "@/data/mockDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { ProjectTimeline } from "@/components/dashboard/ProjectTimeline";
import { StageNavigation } from "@/components/dashboard/StageNavigation";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import { ArrowLeft, AlertCircle, Calendar, User, Target, ShieldAlert, Crosshair } from "lucide-react";

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find project from mock data
  const project = mockProjects.find((p) => p.id === id);
  const details = id ? mockProjectDetails[id] : undefined;
  const history = id ? mockProjectHistory[id] ?? [] : [];
  const stages = id ? getMockProjectStages(id) : [];

  // Error: project not found
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center mx-auto max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">專案不存在</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          找不到指定的專案，請確認 URL 是否正確。
        </p>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回專案列表
        </Button>
      </div>
    );
  }

  const mission = details?.mission ?? project.description;
  const hardConstraints = details?.hardConstraints;
  const kpis = details?.criticalKPIs ?? [];
  const createdDate = new Date(project.createdAt).toLocaleDateString("zh-TW");
  const updatedDate = new Date(project.updatedAt).toLocaleDateString("zh-TW");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Back + Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回專案列表
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant={project.status === "completed" ? "secondary" : "default"}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{project.createdBy}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />建立：{createdDate}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />更新：{updatedDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{project.phase}</span>
            <Progress value={project.progress} className="w-32 h-2" />
            <span className="text-sm font-semibold">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* Main content: 2-column on desktop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          {/* Mission & Constraints */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{mission}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Hard Constraints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{hardConstraints ?? "尚未定義"}</p>
              </CardContent>
            </Card>
          </div>

          {/* KPIs */}
          {kpis.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" />
                關鍵 KPI
              </h2>
              <KpiCards kpis={kpis} />
            </div>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">專案歷程</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTimeline projectId={project.id} history={history} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Stage Navigation */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">階段任務</CardTitle>
            </CardHeader>
            <CardContent>
              <StageNavigation stages={stages} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
