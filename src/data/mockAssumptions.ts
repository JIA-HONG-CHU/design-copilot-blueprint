import type { Assumption, CLDNode, CLDEdge, CLDLoop, LinkedContradiction, SocraticFeedback, ConvergenceImpact } from "@/types/assumption";

export const mockAssumptions: Record<string, Assumption[]> = {
  "proj-001": [
    {
      id: "asm-001", code: "A-001",
      content: "中驅馬達的額定扭矩在 40Nm 以上即可滿足 15% 坡度爬坡需求",
      source: "馬達供應商規格書 (Model X-350)", sourceType: "manual",
      worstConsequence: "爬坡測試失敗，需更換更大扭矩馬達，導致重量與成本超標",
      worstSeverity: "critical",
      minValidation: "使用台架模擬 15% 坡度負載，量測馬達輸出扭矩與電流",
      validationCost: "NT$ 15,000 / 1 週", validationMethod: "原型測試", estimatedDays: 7,
      status: "validated", verificationStage: "completed",
      impactScope: ["CTR-001", "CTR-003"],
      createdAt: "2026-01-20T08:00:00Z", updatedAt: "2026-02-10T10:00:00Z",
    },
    {
      id: "asm-002", code: "A-002",
      content: "減速比 1:3.5 可同時兼顧最高時速 25km/h 與起步扭矩需求",
      source: "內部計算模型 v2.1", sourceType: "manual",
      worstConsequence: "時速不達標或起步加速不足，需重新設計傳動比",
      worstSeverity: "high",
      minValidation: "數值模擬不同減速比下的速度-扭矩曲線",
      validationCost: "NT$ 5,000 / 3 天", validationMethod: "仿真分析", estimatedDays: 3,
      status: "validating", verificationStage: "in_progress",
      impactScope: ["CTR-001"],
      createdAt: "2026-01-22T09:00:00Z", updatedAt: "2026-02-15T14:00:00Z",
    },
    {
      id: "asm-003", code: "A-003",
      content: "PA66+GF30 材料可承受傳動箱殼體的最大應力，且符合耐溫要求",
      source: "材料數據手冊 (DuPont Zytel)", sourceType: "ai_extracted",
      worstConsequence: "殼體在高溫或高負載下破裂，安全風險與整體重設計",
      worstSeverity: "critical",
      minValidation: "進行 FEA 有限元素分析，模擬最大負載與溫度工況",
      validationCost: "NT$ 20,000 / 2 週", validationMethod: "仿真分析", estimatedDays: 14,
      status: "pending", verificationStage: "planned",
      impactScope: ["CTR-002"],
      createdAt: "2026-02-01T10:00:00Z", updatedAt: "2026-02-01T10:00:00Z",
    },
    {
      id: "asm-004", code: "A-004",
      content: "皮帶傳動的效率損失可控制在 5% 以內",
      source: "Gates 皮帶技術白皮書", sourceType: "manual",
      worstConsequence: "傳動效率未達 85% 目標，影響續航里程",
      worstSeverity: "high",
      minValidation: "台架測試量測皮帶傳動在不同負載下的效率",
      validationCost: "NT$ 10,000 / 1 週", validationMethod: "實測驗證", estimatedDays: 7,
      status: "refuted", verificationStage: "refuted",
      impactScope: ["CTR-001", "CTR-003"],
      createdAt: "2026-02-05T08:00:00Z", updatedAt: "2026-02-18T16:00:00Z",
    },
    {
      id: "asm-005", code: "A-005",
      content: "IP55 防護等級可透過現有密封膠條設計達成",
      source: "過往專案經驗 (Project B-220)", sourceType: "ai_extracted",
      worstConsequence: "防水測試失敗，需開發新密封結構",
      worstSeverity: "medium",
      minValidation: "使用現有密封設計製作原型，進行 IP55 噴水測試",
      validationCost: "NT$ 8,000 / 5 天", validationMethod: "原型測試", estimatedDays: 5,
      status: "pending", verificationStage: "unplanned",
      impactScope: [],
      createdAt: "2026-02-08T09:00:00Z", updatedAt: "2026-02-08T09:00:00Z",
    },
  ],
  "proj-004": [
    {
      id: "asm-101", code: "A-001",
      content: "ABS 控制閥的響應時間在 50ms 以內即可滿足制動安全需求",
      source: "Bosch ABS 技術規格書", sourceType: "manual",
      worstConsequence: "ABS 觸發延遲，制動距離超標，安全風險增大",
      worstSeverity: "critical",
      minValidation: "HIL 模擬測試 ABS 閥響應時間",
      validationCost: "NT$ 30,000 / 2 週", validationMethod: "仿真分析", estimatedDays: 14,
      status: "pending", verificationStage: "planned",
      impactScope: ["CTR-101"],
      createdAt: "2026-02-12T08:00:00Z", updatedAt: "2026-02-12T08:00:00Z",
    },
  ],
};

// CLD mock data
export const mockCLDNodes: Record<string, CLDNode[]> = {
  "proj-001": [
    { id: "n1", label: "馬達扭矩", x: 100, y: 80, type: "assumption", assumptionId: "asm-001" },
    { id: "n2", label: "減速比", x: 300, y: 80, type: "assumption", assumptionId: "asm-002" },
    { id: "n3", label: "材料強度", x: 500, y: 80, type: "assumption", assumptionId: "asm-003" },
    { id: "n4", label: "傳動效率", x: 200, y: 220, type: "variable", isLeverage: true },
    { id: "n5", label: "系統重量", x: 400, y: 220, type: "variable" },
    { id: "n6", label: "皮帶效率", x: 100, y: 220, type: "assumption", assumptionId: "asm-004" },
    { id: "n7", label: "密封設計", x: 500, y: 220, type: "assumption", assumptionId: "asm-005" },
  ],
};

export const mockCLDEdges: Record<string, CLDEdge[]> = {
  "proj-001": [
    { id: "e1", from: "n1", to: "n4", polarity: "+" },
    { id: "e2", from: "n2", to: "n4", polarity: "+" },
    { id: "e3", from: "n6", to: "n4", polarity: "+" },
    { id: "e4", from: "n3", to: "n5", polarity: "-" },
    { id: "e5", from: "n4", to: "n5", polarity: "-" },
    { id: "e6", from: "n5", to: "n7", polarity: "+" },
  ],
};

export const mockCLDLoops: Record<string, CLDLoop[]> = {
  "proj-001": [
    { id: "loop-1", type: "B", nodeIds: ["n4", "n5"], label: "B1: 效率-重量平衡" },
  ],
};

// Contradiction traceability mock
export const mockLinkedContradictions: Record<string, LinkedContradiction[]> = {
  "asm-001": [
    { id: "CTR-001", description: "馬達扭矩 vs. 系統重量", severity: "major", resolved: false },
    { id: "CTR-003", description: "傳動效率 vs. 成本控制", severity: "minor", resolved: true },
  ],
  "asm-002": [
    { id: "CTR-001", description: "馬達扭矩 vs. 系統重量", severity: "major", resolved: false },
  ],
  "asm-003": [
    { id: "CTR-002", description: "材料強度 vs. 重量限制", severity: "fatal", resolved: false },
  ],
  "asm-004": [
    { id: "CTR-001", description: "馬達扭矩 vs. 系統重量", severity: "major", resolved: false },
    { id: "CTR-003", description: "傳動效率 vs. 成本控制", severity: "minor", resolved: true },
  ],
};

export const mockSocraticFeedback: Record<string, SocraticFeedback[]> = {
  "asm-001": [
    { id: "sf-1", type: "causal_inquiry", content: "若馬達額定扭矩為 40Nm，在持續爬坡場景下峰值扭矩需求是否會超出額定值？建議確認持續與瞬時扭矩的差異。", timestamp: "2026-02-10T10:00:00Z" },
    { id: "sf-2", type: "assumption_challenge", content: "40Nm 的假設基於單一供應商規格，若供應商數據有誤差 (±5%)，是否仍能滿足需求？", timestamp: "2026-02-11T08:00:00Z" },
  ],
  "asm-004": [
    { id: "sf-3", type: "assumption_challenge", content: "皮帶傳動效率 5% 損失的假設基於新皮帶狀態，但使用後磨損可能使損失增至 8-12%，建議評估壽命週期效率。", timestamp: "2026-02-15T14:00:00Z" },
  ],
};

export const mockConvergenceImpact: Record<string, ConvergenceImpact> = {
  "asm-004": {
    affectedRoutes: 2,
    severity: "high",
    message: "此假設推翻影響 2 條解法路線（皮帶傳動方案），建議重新掃描矛盾收斂圖。",
  },
};
