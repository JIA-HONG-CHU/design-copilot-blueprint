import { DecisionRecord } from "@/types/decisionRecord";

export const mockDecisionRecord: DecisionRecord = {
  id: "dr-001",
  projectId: "proj-001",
  statement: "採用可變轉速控制系統作為主路線方案，碳纖維複合結構作為備援方案",
  decider: "王大明",
  deciderRole: "RD 主管",
  date: "2026-02-23",
  primarySolution: "可變轉速控制系統",
  backupSolution: "碳纖維複合結構替代方案",
  mustResults: [
    { solutionName: "可變轉速控制系統", passed: true, reason: "所有 MUST 條件均通過" },
    { solutionName: "碳纖維複合結構替代方案", passed: false, reason: "成本超出預算上限" },
  ],
  wantResults: [
    { solutionName: "可變轉速控制系統", criteria: "效能提升", weight: 10, score: 8, weightedScore: 80, evidenceLink: "模擬報告 R-001" },
    { solutionName: "可變轉速控制系統", criteria: "噪音降低", weight: 8, score: 7, weightedScore: 56, evidenceLink: "測試報告 T-003" },
    { solutionName: "可變轉速控制系統", criteria: "製造成本", weight: 9, score: 6, weightedScore: 54, evidenceLink: "BOM 估算 B-002" },
    { solutionName: "碳纖維複合結構替代方案", criteria: "效能提升", weight: 10, score: 7, weightedScore: 70, evidenceLink: "FEA 報告 F-001" },
    { solutionName: "碳纖維複合結構替代方案", criteria: "噪音降低", weight: 8, score: 9, weightedScore: 72, evidenceLink: "測試報告 T-005" },
    { solutionName: "碳纖維複合結構替代方案", criteria: "製造成本", weight: 9, score: 3, weightedScore: 27, evidenceLink: "供應商報價 Q-001" },
  ],
  risks: [
    { id: "rk1", description: "變頻器散熱問題導致系統過熱", level: "medium", mitigation: "增加散熱片面積或加裝風扇" },
    { id: "rk2", description: "EMI 干擾影響感測器精度", level: "low", mitigation: "加裝 EMI 濾波器" },
    { id: "rk3", description: "供應商交期不穩定", level: "high", mitigation: "備選供應商評估與合約保障" },
  ],
  actionItems: [
    { id: "a1", task: "完成變頻器散熱模擬分析", owner: "李工程師", dueDate: "2026-03-05", completed: false },
    { id: "a2", task: "訂購 MR 流體阻尼器原型", owner: "張工程師", dueDate: "2026-03-10", completed: false },
    { id: "a3", task: "供應商合約談判", owner: "陳採購", dueDate: "2026-03-15", completed: false },
    { id: "a4", task: "更新專案時程表", owner: "林PM", dueDate: "2026-03-01", completed: true },
  ],
  signOffs: [
    { role: "決策者", name: "王大明", signed: false, signedAt: null },
    { role: "審核者", name: "陳副總", signed: false, signedAt: null },
  ],
};
