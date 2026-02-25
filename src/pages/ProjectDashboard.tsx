import { useParams, useNavigate } from "react-router-dom";
import { mockProjects } from "@/data/mockProjects";
import { mockProjectDetails, mockProjectHistory } from "@/data/mockDashboard";
import { getMockNavCards } from "@/data/mockNavCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseProgressBar } from "@/components/dashboard/PhaseProgressBar";
import { QuickStatsGrid } from "@/components/dashboard/QuickStatsGrid";
import { GateDonut } from "@/components/dashboard/GateDonut";
import { NavCards } from "@/components/dashboard/NavCards";
import { ProjectTimeline } from "@/components/dashboard/ProjectTimeline";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import { ArrowLeft, AlertCircle, Calendar, User } from "lucide-react";

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = mockProjects.find((p) => p.id === id);
  const details = id ? mockProjectDetails[id] : undefined;
  const history = id ? mockProjectHistory[id] ?? [] : [];

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

  const navCards = getMockNavCards(project.phase_progress);
  const createdDate = new Date(project.createdAt).toLocaleDateString("zh-TW");
  const isZeroData = Object.values(project.quick_stats).every((v) => v === 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
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
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{createdDate}</span>
            </div>
          </div>
          <GateDonut passed={project.gates_passed} total={project.gates_total} />
        </div>
      </div>

      {/* Phase Progress Bar */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <PhaseProgressBar progress={project.phase_progress} />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Quick Stats</h2>
        {isZeroData ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">從 Brief 開始你的設計旅程</p>
              <Button className="mt-3" size="sm" onClick={() => navigate(`/projects/${id}/task-definition`)}>
                開始 Brief
              </Button>
            </CardContent>
          </Card>
        ) : (
          <QuickStatsGrid stats={project.quick_stats} />
        )}
      </div>

      {/* 6+1 Navigation Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">功能導航</h2>
        <NavCards cards={navCards} />
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">專案歷程</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTimeline projectId={project.id} history={history} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
