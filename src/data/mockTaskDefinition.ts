import type { TaskDefinitionData } from "@/types/taskDefinition";

export const mockTaskDefinitions: Record<string, TaskDefinitionData> = {
  "proj-001": {
    mission:
      "設計一款適用於城市通勤場景的高效動力傳動系統，滿足續航 80km、最大時速 25km/h 的需求。",
    hardConstraints: [
      "重量 ≤ 5kg",
      "成本 ≤ $150 USD",
      "符合 EN 15194 法規",
      "IP55 防護等級",
    ],
    softObjectives: [
      "噪音 < 55dB",
      "傳動效率 > 85%",
      "支援坡度 15% 爬坡",
      "可維護性佳",
    ],
    nonGoals: ["不考慮競速場景", "不涵蓋電池設計"],
    criticalKPIs: [
      { id: "kpi-1", name: "傳動效率", target: "≥ 85%", method: "實驗室台架測試" },
      { id: "kpi-2", name: "系統重量", target: "≤ 5kg", method: "秤重驗證" },
      { id: "kpi-3", name: "單位成本", target: "≤ $150", method: "BOM 成本分析" },
    ],
  },
  "proj-004": {
    mission:
      "驗證油壓碟煞系統在 ABS 輔助下的制動力分配方案，確保安全性與舒適性。",
    hardConstraints: [
      "制動距離 ≤ 6m (20km/h)",
      "符合 ISO 4210 標準",
      "工作溫度 -10°C ~ 60°C",
    ],
    softObjectives: ["手感線性", "低維護成本", "模組化設計"],
    nonGoals: [],
    criticalKPIs: [
      { id: "kpi-1", name: "制動距離", target: "≤ 6m", method: "實車路測" },
      { id: "kpi-2", name: "ABS 觸發精準度", target: "≥ 95%", method: "HIL 模擬測試" },
      { id: "kpi-3", name: "系統成本", target: "≤ $80", method: "BOM 成本分析" },
    ],
  },
};
