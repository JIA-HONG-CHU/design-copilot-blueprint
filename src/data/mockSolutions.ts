import { Solution } from "@/types/solution";

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
    createdAt: "2026-02-22T14:00:00Z",
    updatedAt: "2026-02-22T14:00:00Z",
  },
];
