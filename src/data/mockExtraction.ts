import type { ExtractedItem } from "@/components/task-definition/AIExtractionResults";
import type { FeasibilityConflict } from "@/components/task-definition/FeasibilityValidation";

// Mock AI extraction results
export const mockExtractionResults: ExtractedItem[] = [
  { id: "ex-1", type: "constraint", content: "重量 ≤ 5kg", source: "產品規格書_v2.1.pdf", accepted: false, editing: false },
  { id: "ex-2", type: "constraint", content: "成本 ≤ $150 USD", source: "專案預算表.xlsx", accepted: false, editing: false },
  { id: "ex-3", type: "constraint", content: "符合 EN 15194 法規", source: "法規摘要.pdf", accepted: false, editing: false },
  { id: "ex-4", type: "constraint", content: "IP55 防護等級", source: "產品規格書_v2.1.pdf", accepted: false, editing: false },
  { id: "ex-5", type: "assumption", content: "馬達扭矩需求約 40Nm，基於典型城市通勤路況", source: "產品規格書_v2.1.pdf", accepted: false, editing: false },
  { id: "ex-6", type: "assumption", content: "減速比 1:5 可滿足最大爬坡需求", source: "技術分析報告.pdf", accepted: false, editing: false },
  { id: "ex-7", type: "data", content: "目標續航 80km (250Wh 電池)", source: "專案預算表.xlsx", accepted: false, editing: false },
  { id: "ex-8", type: "data", content: "最大時速 25km/h (法規限制)", source: "法規摘要.pdf", accepted: false, editing: false },
];

// Mock feasibility conflicts
export const mockFeasibilityConflictsWarning: FeasibilityConflict[] = [
  {
    id: "fc-1",
    constraintA: "重量 ≤ 5kg",
    constraintB: "成本 ≤ $150 USD",
    reason: "在 5kg 重量限制下使用輕量化材料（如鋁合金或碳纖維），可能導致材料成本超出 $150 預算。需權衡材料選擇與製程優化。",
    suggestion: "建議考慮鋁合金壓鑄方案，可在重量 5.2kg 內控制成本至 $140，或放寬重量約束至 5.5kg。",
  },
];

export const mockFeasibilityConflictsConflict: FeasibilityConflict[] = [
  {
    id: "fc-2",
    constraintA: "傳動效率 ≥ 85%",
    constraintB: "系統重量 ≤ 3kg",
    reason: "在 3kg 重量限制下實現 85% 傳動效率在現有技術條件下物理不可行。高效傳動系統（行星齒輪或諧波減速器）的最小重量約為 4.2kg。",
    suggestion: "建議將重量約束放寬至 ≤ 5kg，或將效率目標調整為 ≥ 80%。",
  },
];
