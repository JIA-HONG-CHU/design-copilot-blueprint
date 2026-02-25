export type ProjectStatus = "in_progress" | "completed" | "archived";

export type StepStatus = "passed" | "in_progress" | "not_started";

export interface PhaseProgress {
  "1.1": StepStatus;
  "1.2": StepStatus;
  "1.3": StepStatus;
  "2.1": StepStatus;
  "2.2": StepStatus;
  "2.3": StepStatus;
  "3.2": StepStatus;
  "3.3": StepStatus;
}

export interface QuickStats {
  contradictions_count: number;
  assumptions_count: number;
  alternatives_count: number;
  risks_count: number;
  experiments_count: number;
  evidence_items_count: number;
}

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
  phase_progress: PhaseProgress;
  quick_stats: QuickStats;
  gates_passed: number;
  gates_total: number;
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

// 6+1 navigation card definition
export interface NavCardDef {
  id: string;
  enName: string;
  zhName: string;
  phase: "Phase 1" | "Phase 2" | "Phase 3";
  icon: string;
  route: string; // relative to /projects/:id/
  subSteps: number; // total sub-steps
  completedSteps: number;
  requiredGate?: string; // gate that must be passed to unlock
  locked: boolean;
  lockReason?: string;
}
