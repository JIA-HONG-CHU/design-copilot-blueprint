import { Solution, ConvergenceNode, ConvergenceEdge } from "@/types/solution";

export const mockSolutions: Solution[] = [
  {
    id: "sol-001",
    projectId: "proj-001",
    name: "可變轉速控制系統",
    description: "採用變頻驅動技術，根據負載需求動態調整馬達轉速，在高效能與低噪音之間取得平衡。",
    mechanism:
      "利用變頻器（VFD）控制馬達轉速，搭配主動降噪技術與彈性減振結構。系統根據感測器回饋的負載數據，即時調整輸出頻率，使馬達在最佳效率點運行。減振結構採用橡膠阻尼器與浮動安裝座，有效隔離振動傳遞路徑。",
    assumptions: ["變頻器可在目標功率範圍內穩定運行", "橡膠阻尼器壽命可達設計要求"],
    risks: [
      { id: "r1", description: "變頻器散熱問題", severity: "medium", mitigation: "增加散熱片面積或加裝風扇" },
      { id: "r2", description: "電磁干擾影響感測器", severity: "low", mitigation: "加裝 EMI 濾波器" },
    ],
    minValidation: "建立 1:5 比例原型，在隔音室內測試不同轉速下的噪音水平與效能輸出。",
    mustCriteria: [
      { id: "m1", label: "成本 ≤ 預算上限", passed: true },
      { id: "m2", label: "符合 IEC 噪音標準", passed: true },
      { id: "m3", label: "尺寸 ≤ 現有空間", passed: null },
    ],
    relatedContradictionIds: ["cont-001"],
    secondaryContradictions: [
      { id: "sc-001", description: "變頻器散熱需求增加空間佔用", severity: "minor", resolved: true },
    ],
    contradictionSeverity: "major",
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
  },
  {
    id: "sol-002",
    projectId: "proj-001",
    name: "碳纖維複合結構替代方案",
    description: "使用碳纖維複合材料替代傳統金屬，在保持強度的同時大幅降低重量。",
    mechanism:
      "採用碳纖維增強聚合物（CFRP）疊層結構，透過有限元素分析優化纖維方向與層數配置。關鍵承載區域使用單向預浸料，非關鍵區域使用編織布以降低成本。接合處採用共固化技術確保結構完整性。",
    assumptions: ["CFRP 供應商可穩定供貨", "共固化接合強度滿足疲勞壽命要求"],
    risks: [
      { id: "r3", description: "碳纖維成本偏高", severity: "high", mitigation: "評估局部混合材料方案" },
      { id: "r4", description: "維修困難度增加", severity: "medium", mitigation: "設計可拆卸模組化結構" },
    ],
    minValidation: "製作 3 片測試件進行三點彎曲與疲勞測試，驗證與 FEA 模擬結果的一致性。",
    mustCriteria: [
      { id: "m1", label: "成本 ≤ 預算上限", passed: false },
      { id: "m2", label: "符合 IEC 噪音標準", passed: true },
      { id: "m3", label: "尺寸 ≤ 現有空間", passed: true },
    ],
    relatedContradictionIds: ["cont-002"],
    secondaryContradictions: [
      { id: "sc-002", description: "CFRP 成本超出預算上限，與成本約束衝突", severity: "fatal", resolved: false },
      { id: "sc-003", description: "維修困難度增加影響長期可靠性", severity: "major", resolved: false },
    ],
    contradictionSeverity: "fatal",
    createdAt: "2026-02-22T14:00:00Z",
    updatedAt: "2026-02-22T14:00:00Z",
  },
];

export const mockConvergenceNodes: ConvergenceNode[] = [
  { id: "cont-001", label: "速度↑ → 噪音↑", type: "contradiction", severity: "major", resolved: true, x: 50, y: 50 },
  { id: "sol-001", label: "可變轉速控制", type: "solution", x: 200, y: 50 },
  { id: "sc-001", label: "散熱↑ → 空間↑", type: "contradiction", severity: "minor", resolved: true, x: 350, y: 50 },
  { id: "cont-002", label: "強度↑ → 重量↑", type: "contradiction", severity: "fatal", resolved: false, x: 50, y: 150 },
  { id: "sol-002", label: "碳纖維替代", type: "solution", x: 200, y: 150 },
  { id: "sc-002", label: "成本超標", type: "contradiction", severity: "fatal", resolved: false, x: 350, y: 130 },
  { id: "sc-003", label: "維修困難↑", type: "contradiction", severity: "major", resolved: false, x: 350, y: 180 },
];

export const mockConvergenceEdges: ConvergenceEdge[] = [
  { from: "cont-001", to: "sol-001" },
  { from: "sol-001", to: "sc-001" },
  { from: "cont-002", to: "sol-002" },
  { from: "sol-002", to: "sc-002" },
  { from: "sol-002", to: "sc-003" },
];
