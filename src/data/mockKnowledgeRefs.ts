// Mock knowledge references (RAG + Web) for each Create step
export interface KnowledgeRef {
  id: string;
  type: 'rag' | 'web';
  title: string;
  source: string;
  relevance: 'High' | 'Medium' | 'Low';
  summary: string;
  url?: string;
}

// Step index → references
export const mockStepKnowledgeRefs: Record<number, KnowledgeRef[]> = {
  0: [ // Anti-Anchor
    { id: "KB-DEC-017", type: "rag", title: "過往專案路徑依賴分析報告", source: "歷史決策紀錄庫", relevance: "High", summary: "過去 3 個電動自行車專案皆採用中驅+皮帶傳動，無一探索直驅或磁力耦合。" },
    { id: "WEB-PAT-003", type: "web", title: "輪轂馬達專利佈局分析 (2024-2026)", source: "Google Patents", relevance: "High", summary: "近兩年輪轂馬達專利申請量年增 40%，顯示產業趨勢轉向。", url: "https://patents.google.com" },
    { id: "WEB-STD-012", type: "web", title: "ISO 4210-4 自行車傳動系統安全要求", source: "ISO 標準", relevance: "Medium", summary: "最新版本對傳動系統噪音與振動有更嚴格的要求。" },
  ],
  1: [ // TRIZ
    { id: "KB-FMEA-042", type: "rag", title: "齒輪傳動系統 FMEA 報告", source: "內部 FMEA 庫", relevance: "High", summary: "歷史失效模式分析顯示齒輪嚙合噪音佔 NVH 問題的 65%。" },
    { id: "WEB-TRIZ-001", type: "web", title: "TRIZ 矛盾矩陣在電機設計的應用", source: "Journal of Engineering Design, 2025", relevance: "High", summary: "針對「速度 vs 有害副作用」矛盾，原則 #18 和 #24 在馬達領域成功率最高。", url: "https://doi.org/example" },
    { id: "KB-CASE-008", type: "rag", title: "案例：高速馬達噪音降低 40% 的設計歷程", source: "內部知識庫", relevance: "High", summary: "採用變頻驅動+彈性減振結構，噪音降低 43%，效能維持 98%。" },
  ],
  2: [ // 子系統
    { id: "KB-ARCH-005", type: "rag", title: "傳動模組子系統拆分標準", source: "內部架構規範", relevance: "Medium", summary: "標準拆分包含動力傳動、殼體結構、散熱、密封四大模組。" },
    { id: "WEB-PAT-007", type: "web", title: "模組化電動傳動系統設計趨勢", source: "SAE Technical Paper, 2025", relevance: "Medium", summary: "趨勢顯示模組間介面標準化可降低 20% 的開發時間。" },
  ],
  3: [ // SCAMPER
    { id: "KB-SCAM-003", type: "rag", title: "過往 SCAMPER 變形紀錄—傳動系統", source: "內部創新紀錄庫", relevance: "High", summary: "「替代」動作中，磁力耦合器替代機械齒輪的方案曾在 2024 年被評估但未採用（成本過高）。" },
    { id: "WEB-MAT-002", type: "web", title: "碳纖維增強塑膠在殼體結構的應用", source: "Materials Today, 2025", relevance: "Medium", summary: "CFRP 殼體可減重 35% 且剛度不減，但模具成本增加 2.5 倍。", url: "https://materialstoday.com" },
  ],
  4: [ // 方案整合
    { id: "KB-ROUTE-011", type: "rag", title: "歷史 Concept Route 成功/失敗分析", source: "決策紀錄庫", relevance: "High", summary: "過去成功的方案 80% 具備完整的介面契約和至少 2 個備援路線。" },
    { id: "WEB-PAT-009", type: "web", title: "電動自行車傳動系統專利檢索", source: "Espacenet", relevance: "Medium", summary: "Shimano EP8 系統專利揭示了內置減速齒輪的緊湊設計。", url: "https://worldwide.espacenet.com" },
  ],
  5: [ // MUST
    { id: "KB-BOM-004", type: "rag", title: "歷史 BOM 成本基準數據", source: "成本管理庫", relevance: "High", summary: "同等級傳動系統 BOM 成本基準為 $85-$120，超過 $150 需特別審批。" },
    { id: "KB-DFM-006", type: "rag", title: "DFM 初步評估指南—製造路徑", source: "製程能力庫", relevance: "High", summary: "M6 製造路徑可行性需評估特殊成型、高精度加工、複雜組裝三項。" },
  ],
  6: [ // Pre-CAD
    { id: "KB-EM-002", type: "rag", title: "歷史 Evidence Matrix 填寫紀錄", source: "證據範本庫", relevance: "High", summary: "快速識別證據缺口的關鍵是先對照 E0-E4 等級定義。" },
    { id: "WEB-SIM-001", type: "web", title: "快速仿真工具比較：ANSYS Discovery vs SimScale", source: "Engineering.com, 2026", relevance: "Medium", summary: "SimScale 免費版可在 2 小時內完成 Pre-CAD 等級的粗仿真。", url: "https://engineering.com" },
    { id: "KB-CASE-012", type: "rag", title: "Pre-CAD 審查最佳實踐", source: "內部 SOP", relevance: "Medium", summary: "五維審查維度中，「失效機制風險」最常被遺漏，建議優先評估。" },
  ],
};
