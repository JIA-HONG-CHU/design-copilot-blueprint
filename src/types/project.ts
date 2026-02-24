export type ProjectStatus = "in_progress" | "completed" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0-100
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  phase: string; // e.g. "Phase I", "Phase II", "Phase III"
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "進行中",
  completed: "已完成",
  archived: "已封存",
};
