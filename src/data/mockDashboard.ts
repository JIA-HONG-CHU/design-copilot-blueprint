import type { Project, ProjectHistoryItem, ProjectStage } from "@/types/project";

export const mockProjectDetails: Record<string, Partial<Project>> = {
  "proj-001": {
    mission: "設計一款適用於城市通勤場景的高效動力傳動系統，滿足續航 80km、最大時速 25km/h 的需求。",
    hardConstraints: "重量 ≤ 5kg、成本 ≤ $150 USD、符合 EN 15194 法規、IP55 防護等級",
    softObjectives: "噪音 < 55dB、效率 > 85%、支援坡度 15% 爬坡、可維護性佳",
    criticalKPIs: [
      { id: "kpi-1", name: "傳動效率", target: "≥ 85%", current: "82%", status: "at_risk" },
      { id: "kpi-2", name: "系統重量", target: "≤ 5kg", current: "4.8kg", status: "on_track" },
      { id: "kpi-3", name: "單位成本", target: "≤ $150", current: "$145", status: "on_track" },
    ],
  },
  "proj-004": {
    mission: "驗證油壓碟煞系統在 ABS 輔助下的制動力分配方案，確保安全性與舒適性。",
    hardConstraints: "制動距離 ≤ 6m (20km/h)、符合 ISO 4210 標準、工作溫度 -10°C ~ 60°C",
    softObjectives: "手感線性、低維護成本、模組化設計",
    criticalKPIs: [
      { id: "kpi-1", name: "制動距離", target: "≤ 6m", current: "待測試", status: "off_track" },
      { id: "kpi-2", name: "ABS 觸發精準度", target: "≥ 95%", current: "待測試", status: "off_track" },
      { id: "kpi-3", name: "系統成本", target: "≤ $80", current: "$72", status: "on_track" },
    ],
  },
};

export const mockProjectHistory: Record<string, ProjectHistoryItem[]> = {
  "proj-001": [
    {
      id: "hist-1",
      date: "2026-02-22T14:20:00Z",
      title: "TRIZ 矛盾分析完成",
      summary: "完成傳動效率 vs. 系統重量的技術矛盾分析，識別出 3 個改善參數與 5 條發明原理。",
      author: "王大明",
      type: "milestone",
      relatedPage: "contradiction-identification",
    },
    {
      id: "hist-2",
      date: "2026-02-18T10:00:00Z",
      title: "方案探索：生成 4 條概念路線",
      summary: "基於 TRIZ 與 SCAMPER 方法，生成了皮帶傳動、齒輪傳動、直驅、軸傳動等 4 條概念路線。",
      author: "王大明",
      type: "task",
      relatedPage: "solution-explorer",
    },
    {
      id: "hist-3",
      date: "2026-02-10T09:00:00Z",
      title: "假設台帳更新：新增 5 項關鍵假設",
      summary: "識別並記錄馬達扭矩、減速比、材料強度等 5 項關鍵設計假設，其中 2 項為高風險。",
      author: "李小芳",
      type: "task",
      relatedPage: "assumption-ledger",
    },
    {
      id: "hist-4",
      date: "2026-01-28T15:30:00Z",
      title: "任務定義確認",
      summary: "完成任務邊界定義，確認 Mission、Hard Constraints 與 3 個 Critical KPIs。",
      author: "王大明",
      type: "milestone",
      relatedPage: "task-definition",
    },
    {
      id: "hist-5",
      date: "2026-01-15T08:30:00Z",
      title: "專案建立",
      summary: "專案「E-Bike 動力傳動系統設計」正式建立。",
      author: "王大明",
      type: "milestone",
    },
  ],
};

export function getMockProjectStages(projectId: string): ProjectStage[] {
  // For proj-001 (Phase II, 45% progress)
  const isAdvanced = projectId === "proj-002" || projectId === "proj-003" || projectId === "proj-005";
  const isEarly = projectId === "proj-004";

  return [
    {
      id: "task-definition",
      label: "任務定義",
      path: "task-definition",
      phase: "Phase I",
      status: "completed",
      icon: "ClipboardList",
    },
    {
      id: "assumption-ledger",
      label: "假設台帳",
      path: "assumption-ledger",
      phase: "Phase I",
      status: isEarly ? "in_progress" : "completed",
      icon: "FileQuestion",
    },
    {
      id: "contradiction-identification",
      label: "矛盾識別",
      path: "contradiction-identification",
      phase: "Phase I",
      status: isEarly ? "not_started" : "completed",
      icon: "GitBranch",
    },
    {
      id: "solution-explorer",
      label: "方案探索",
      path: "solution-explorer",
      phase: "Phase II",
      status: isEarly ? "not_started" : isAdvanced ? "completed" : "in_progress",
      icon: "Lightbulb",
    },
    {
      id: "pre-cad-review",
      label: "Pre-CAD 審查",
      path: "pre-cad-review",
      phase: "Phase II",
      status: isAdvanced ? "completed" : "not_started",
      icon: "FileCheck",
    },
    {
      id: "design-review",
      label: "設計審查",
      path: "design-review",
      phase: "Phase III",
      status: isAdvanced ? "in_progress" : "not_started",
      icon: "Search",
    },
    {
      id: "decision-record",
      label: "決策記錄",
      path: "decision-record",
      phase: "Phase III",
      status: "not_started",
      icon: "FileSignature",
    },
  ];
}
