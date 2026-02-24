import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/types/project";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import { Calendar, User } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline"> = {
  in_progress: "default",
  completed: "secondary",
  archived: "outline",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const formattedDate = new Date(project.updatedAt).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-bold leading-snug line-clamp-2">
            {project.name}
          </CardTitle>
          <Badge variant={statusVariantMap[project.status]} className="shrink-0 text-xs">
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-sm mt-1">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{project.phase}</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {project.createdBy}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
