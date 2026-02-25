import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project, PhaseProgress, StepStatus } from "@/types/project";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline"> = {
  in_progress: "default",
  completed: "secondary",
  archived: "outline",
};

/** Phase color band segments */
const PHASE_STEPS: { phase: 1 | 2 | 3; keys: (keyof PhaseProgress)[] }[] = [
  { phase: 1, keys: ["1.1", "1.2", "1.3"] },
  { phase: 2, keys: ["2.1", "2.2", "2.3"] },
  { phase: 3, keys: ["3.2", "3.3"] },
];

const phaseColors: Record<number, string> = {
  1: "bg-[hsl(217,91%,60%)]",   // blue
  2: "bg-[hsl(38,92%,50%)]",    // orange
  3: "bg-[hsl(160,64%,43%)]",   // green
};

const phaseColorsMuted: Record<number, string> = {
  1: "bg-[hsl(217,91%,60%/0.2)]",
  2: "bg-[hsl(38,92%,50%/0.2)]",
  3: "bg-[hsl(160,64%,43%/0.2)]",
};

function getPhaseSegmentFill(keys: (keyof PhaseProgress)[], progress: PhaseProgress): number {
  const passed = keys.filter((k) => progress[k] === "passed").length;
  return Math.round((passed / keys.length) * 100);
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const formattedDate = new Date(project.updatedAt).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Phase color band top */}
      <div className="flex h-1">
        {PHASE_STEPS.map(({ phase, keys }) => {
          const fill = getPhaseSegmentFill(keys, project.phase_progress);
          return (
            <div key={phase} className={cn("flex-1 relative", phaseColorsMuted[phase])}>
              <div
                className={cn("absolute inset-y-0 left-0", phaseColors[phase])}
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>

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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {project.createdBy}
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {project.gates_passed}/{project.gates_total} Gates
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{project.phase}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
