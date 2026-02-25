import type { BriefData, TaskDefinition5W1H } from "@/types/taskDefinition";

export const mockBriefData: Record<string, BriefData> = {
  "proj-001": {
    mission:
      "在城市通勤場景下，系統必須提供高效動力傳動，且續航 80km、最大時速 25km/h 的指標不得超標。",
    constraints: [
      { id: "c1", constraint_code: "M1", description: "重量 ≤ 5kg", source: "客戶需求書 v2.1" },
      { id: "c2", constraint_code: "M2", description: "成本 ≤ $150 USD", source: "專案預算" },
      { id: "c3", constraint_code: "M3", description: "符合 EN 15194 法規", source: "法規要求" },
      { id: "c4", constraint_code: "M4", description: "IP55 防護等級", source: "產品規格書" },
    ],
    kpis: [
      { id: "k1", kpi_name: "傳動效率", target_value: "≥ 85%", unit: "%", measurement_method: "實驗室台架測試" },
      { id: "k2", kpi_name: "系統重量", target_value: "≤ 5", unit: "kg", measurement_method: "秤重驗證" },
      { id: "k3", kpi_name: "單位成本", target_value: "≤ 150", unit: "USD", measurement_method: "BOM 成本分析" },
    ],
    task_definition_5w1h: {
      who: "動力系統 RD 團隊 (王大明主導)",
      what: "設計城市通勤電動自行車的動力傳動系統，涵蓋馬達選型、減速比優化與扭矩控制。",
      where: "研發實驗室 + 供應商協作",
      when: "2026 Q1-Q2，共 6 個月",
      why: "現有傳動系統效率不足 (78%)，需提升至 85% 以上以滿足市場競爭力。",
      how: "透過 TRIZ 矛盾分析 + SCAMPER 方案發散 + 最小實驗驗證。",
    },
  },
  "proj-004": {
    mission:
      "在城市與郊區混合路況下，系統必須提供可靠的 ABS 輔助制動，且制動距離不超過 6m (20km/h)。",
    constraints: [
      { id: "c1", constraint_code: "M1", description: "制動距離 ≤ 6m (20km/h)", source: "安全規範" },
      { id: "c2", constraint_code: "M2", description: "符合 ISO 4210 標準", source: "國際標準" },
      { id: "c3", constraint_code: "M3", description: "工作溫度 -10°C ~ 60°C", source: "環境規格" },
    ],
    kpis: [
      { id: "k1", kpi_name: "制動距離", target_value: "≤ 6", unit: "m", measurement_method: "實車路測" },
      { id: "k2", kpi_name: "ABS 觸發精準度", target_value: "≥ 95", unit: "%", measurement_method: "HIL 模擬測試" },
      { id: "k3", kpi_name: "系統成本", target_value: "≤ 80", unit: "USD", measurement_method: "BOM 成本分析" },
    ],
    task_definition_5w1h: null,
  },
};

// Mock AI suggestion for mission rewrite
export const mockMissionSuggestion = "在城市通勤情境中，設計一套高效動力傳動系統，確保續航里程 ≥ 80km 且最高時速 ≤ 25km/h，同時在 5kg 重量與 $150 成本約束下實現 85% 以上傳動效率。";

// Mock AI constraint suggestions
export const mockConstraintSuggestions = [
  { description: "振動等級 ≤ 2.5 m/s²", source: "ISO 5349-1" },
  { description: "MTBF ≥ 5000 小時", source: "可靠度目標" },
];

// Mock AI KPI suggestions
export const mockKpiSuggestions = [
  { kpi_name: "噪音等級", target_value: "≤ 55", unit: "dB", measurement_method: "消音室測試 (ISO 3744)" },
  { kpi_name: "爬坡能力", target_value: "≥ 15", unit: "%", measurement_method: "坡道實測" },
];

// Mock 5W1H for AI generation
export const mockGenerated5W1H: TaskDefinition5W1H = {
  who: "動力系統 RD 團隊",
  what: "設計城市通勤電動自行車的動力傳動系統",
  where: "研發實驗室與供應商合作",
  when: "6 個月開發週期",
  why: "提升傳動效率至 85% 以上，滿足市場競爭需求",
  how: "TRIZ 矛盾分析 + SCAMPER + 最小實驗驗證",
};

// Keep legacy mock for backward compat
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
    softObjectives: [
      "手感線性",
      "低維護成本",
      "模組化設計",
    ],
    nonGoals: [],
    criticalKPIs: [
      { id: "kpi-1", name: "制動距離", target: "≤ 6m", method: "實車路測" },
      { id: "kpi-2", name: "ABS 觸發精準度", target: "≥ 95%", method: "HIL 模擬測試" },
      { id: "kpi-3", name: "系統成本", target: "≤ $80", method: "BOM 成本分析" },
    ],
  },
};
