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
  mission?: string;
  hardConstraints?: string;
  softObjectives?: string;
  criticalKPIs?: CriticalKPI[];
}

export interface CriticalKPI {
  id: string;
  name: string;
  target: string;
  current: string;
  status: "on_track" | "at_risk" | "off_track";
}

export interface ProjectHistoryItem {
  id: string;
  date: string;
  title: string;
  summary: string;
  author: string;
  type: "decision" | "milestone" | "review" | "task";
  relatedPage?: string; // route path
}

export interface ProjectStage {
  id: string;
  label: string;
  path: string;
  phase: string;
  status: "completed" | "in_progress" | "not_started";
  icon: string; // lucide icon name
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "進行中",
  completed: "已完成",
  archived: "已封存",
};
