# WBS - E2E 整合流程差距修正工作分解結構

> **專案**: RD Design Copilot — E2E 規格對齊
> **基準日期**: 2026-03-12
> **依據**: `docs/e2e/RD_Design_Copilot_整合流程.md` 差距分析

---

## WBS 總覽

```
1.0 Artifact 骨幹建設 (Foundation)
2.0 整合機制補齊 (Integration Mechanisms)
3.0 資料流串接 (Data Flow)
4.0 Gate 對齊 (Gate Alignment)
5.0 驗證與收尾 (Verification)
```

---

## 1.0 Artifact 骨幹建設

> 目標：建立 E2E 要求的 6 核心 Artifact 統一狀態機，實現跨步驟 Digital Thread

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **1.1** | 定義 ArtifactState 統一型別 | `Draft → Reviewed → Verified → Baselined → Released` 狀態 enum + 轉換規則 | C1 | `src/types/artifact.ts` (新增) |
| **1.2** | 定義 6 核心 Artifact 介面 | Constraint / Contradiction / Breakpoint / ConceptRoute / Evidence / Risk 各含 artifactId + state + timestamps | C1 | `src/types/artifact.ts` |
| **1.3** | 建立 Artifact Context | 全域 React Context 管理所有 Artifact 的 CRUD + 狀態轉換 | C1 | `src/contexts/ArtifactContext.tsx` (新增) |
| **1.4** | Gate-Artifact 狀態連動 | Gate 通過時批次觸發對應 Artifact 從 Draft→Reviewed 等轉換 | C1 | `src/hooks/useGateTransition.ts` (新增) |
| **1.5** | Artifact ID 生成與索引 | 統一 ID 格式 `{TYPE}-{SEQ}` (如 `CON-001`, `CTD-003`, `EVD-012`) | C1 | `src/utils/artifactId.ts` (新增) |

**前置條件**: 無
**完成標準**: `npx tsc --noEmit` 通過；Context Provider 掛載於 App root

---

## 2.0 整合機制補齊

> 目標：補齊 E2E 三大 AI 挑戰層 + Pre-CAD 路由 + 關鍵流程閉環

### 2.1 Socratic Category 7 — Reframing

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **2.1.1** | QuestionCategory 加入 `reframing` | union type 7 類 + CATEGORY_CONFIG 新增 label/color | C3 | `src/types/explore.ts` |
| **2.1.2** | SocraticTab UI 支援 Reframing | 新增 reframing 分類按鈕、問題模板、AI 提示文案 | C3 | `src/components/explore/SocraticTab.tsx` |
| **2.1.3** | Explore Gate 更新 | Gate 2 要求 7 categories 覆蓋 (含 reframing) | C3, H1 | `src/pages/Explore.tsx` |

### 2.2 Contradiction Convergence Graph 整合

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **2.2.1** | 二次矛盾掃描邏輯 | TRIZ 解法後自動比對 CLD/Interface Contract，產生 Fatal/Major/Minor 分類 | C2 | `src/hooks/useContradictionScan.ts` (新增) |
| **2.2.2** | HealthMonitor 整合至 Create | TRIZ 子步驟嵌入 HealthMonitor，nodes > 5 時阻擋並提示回到 Step 1 | C2 | `src/pages/Create.tsx` |
| **2.2.3** | ContradictionConvergenceCard 接入真實資料 | 從 Artifact Context 讀取矛盾節點數，取代 mock | C2 | `src/components/dashboard/ContradictionConvergenceCard.tsx` |
| **2.2.4** | Convergence Graph 視覺化 | 在 Create TRIZ 區段顯示矛盾收斂圖 (Fatal/Major 需歸零) | C2 | `src/components/solution/ConvergenceGraph.tsx` |

### 2.3 Pre-CAD Review 路由與 Gate

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **2.3.1** | App.tsx 新增 PreCadReview 路由 | `/projects/:id/pre-cad` 路由註冊 | C5 | `src/App.tsx` |
| **2.3.2** | Sidebar/MobileNav 新增 Step P 導覽 | projectSteps 陣列插入 Pre-CAD 項目 (Phase 2 與 Phase 3 之間) | C5 | `src/components/layouts/AppSidebar.tsx`, `MobileNav.tsx` |
| **2.3.3** | Pre-CAD Confidence Score 計算 | `Converged(Fatal+Major) / Total(Fatal+Major) × 100%`，Gate P = 100% | C4 | `src/pages/PreCadReview.tsx` |
| **2.3.4** | PreCadScoreGauge 接入計算值 | Dashboard gauge 從 Artifact Context 讀取真實分數 | C4 | `src/components/dashboard/PreCadScoreGauge.tsx` |

### 2.4 Gate 門檻修正

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **2.4.1** | Gate 3 breakpoint ≥3 | Phase Gate 1 條件從 ≥1 改為 ≥3 breakpoints | H1 | `src/pages/Explore.tsx` |
| **2.4.2** | PhaseProgress 加入 "3.1" | Review 步驟可追蹤進度 | H9 | `src/types/project.ts`, mock data |

**前置條件**: 1.0 完成 (Artifact Context 可用)
**完成標準**: Category 7 可操作；Create 頁 TRIZ 解法後觸發掃描；PreCadReview 可經路由訪問

---

## 3.0 資料流串接

> 目標：建立跨步驟真實資料流，取代 mock import；補齊缺失資料模型

### 3.1 Interface Contract 資料模型

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **3.1.1** | InterfaceContract type 定義 | 6 維：Envelope / Load path / Signal path / Thermal path / Datum-tolerance / Serviceability | H4 | `src/types/create.ts` |
| **3.1.2** | Alternative 加入 interfaceContract 欄位 | Create 頁面 Alternatives 步驟可編輯 Interface Contract | H4 | `src/types/create.ts`, `src/pages/Create.tsx` |

### 3.2 WANT 評分強化

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **3.2.1** | W7 驗證可行性標準 | 新增第 7 項 WANT criterion + anchor 定義 | H3 | `src/types/decisionRecord.ts`, `src/data/mockDecisionRecord.ts` |
| **3.2.2** | WANT Score 證據連結 | 每筆分數附 `artifactId: string` + `evidenceLevel: EvidenceLevel` | H2 | `src/types/decisionRecord.ts` |
| **3.2.3** | WANT 評分 UI 加入證據選擇器 | 分數旁顯示 Artifact 下拉選擇 + 證據等級標籤 | H2 | `src/pages/DecisionRecord.tsx` |

### 3.3 Adverse Consequences 評估

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **3.3.1** | AC type 定義 | `AdverseConsequence { riskId, probability, severity, level, mitigation }` | H6 | `src/types/decisionRecord.ts` |
| **3.3.2** | Decision 新增 AC Tab | 第三個 tab：MUST (已有) → WANT → AC；矩陣式 P×S 評分 | H6 | `src/pages/DecisionRecord.tsx` |

### 3.4 Knowledge Enhancement 擴展

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **3.4.1** | KnowledgeRefsPanel 通用化 | 元件接受 `stepId` prop，顯示該步驟對應的 RAG + Web 參考 | H5 | `src/components/shared/KnowledgeRefsPanel.tsx` |
| **3.4.2** | 各頁面嵌入 Knowledge Panel | Brief / Explore / Track / Review / Decide / Feynman 各加入 | H5 | 6 個 page 檔案 |

### 3.5 跨步驟 Context 串接

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **3.5.1** | ProjectDataContext 設計 | 統一 Context 管理 Brief→Explore→Track→Create→Review→Decide→Feynman 資料 | M1 | `src/contexts/ProjectDataContext.tsx` (新增) |
| **3.5.2** | 各頁面遷移至 Context | 移除 mock import，改從 Context 讀寫 | M1 | 所有 page 檔案 |

**前置條件**: 1.0 + 2.0 完成
**完成標準**: Decide 頁面有 MUST→WANT→AC 三 tab；WANT 每筆分數有 Artifact 連結

---

## 4.0 Gate 對齊

> 目標：所有 Gate 條件嚴格對齊 E2E 規格

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **4.1** | Gate 2 更新 | 要求 7 categories 覆蓋 + ≥10 assumptions (非 answers) | C3 | `src/pages/Explore.tsx` |
| **4.2** | Gate C 加入 North Star KPI | KPI 可標記為 North Star；Gate C 要求 North Star ≥ E2 | H7 | `src/types/project.ts`, `src/pages/DesignReview.tsx` |
| **4.3** | Gate C MUST 重新驗證 | DesignReview 讀取 Create 的 MUST 結果，要求以 E2+ 證據重新確認 | H8 | `src/pages/DesignReview.tsx` |
| **4.4** | Gate 7 證據強制 | WANT 評分不允許 E0 證據；所有 H/H* 風險須有緩解 | H2 | `src/pages/DecisionRecord.tsx` |
| **4.5** | Gate 8 Artifact 狀態檢查 | Feynman 完成要求所有核心 Artifact → Baselined | C1 | `src/pages/Feynman.tsx` |

### 4.6 Assumption Ledger 欄位補齊

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **4.6.1** | TrackAssumption 加欄位 | 新增 `worstConsequence`, `verificationCost`, `verificationDuration`, `sourceArtifactId` | M2 | `src/types/track.ts` |
| **4.6.2** | Track UI 更新 | Kanban 卡片/詳情顯示新欄位 | M2 | `src/pages/Track.tsx` |

### 4.7 Feynman 知識回寫結構化

| WBS ID | 工作包 | 交付物 | 關聯差距 | 修改檔案 |
|--------|--------|--------|----------|----------|
| **4.7.1** | 6 類資產回寫 type | Decision Record / Overturned Assumptions / Evidence Matrix / Risk Register / MUST-WANT Templates / Interface Contract | M3 | `src/types/feynman.ts` (新增或擴充) |
| **4.7.2** | Feynman UI 分類顯示 | 按 6 類分組顯示知識條目 + 回寫狀態 | M3 | `src/pages/Feynman.tsx` |

**前置條件**: 1.0 ~ 3.0 完成
**完成標準**: 所有 Gate 條件與 E2E 規格一致

---

## 5.0 驗證與收尾

| WBS ID | 工作包 | 交付物 | 關聯差距 |
|--------|--------|--------|----------|
| **5.1** | TypeScript 型別檢查 | `npx tsc --noEmit` 零錯誤 | ALL |
| **5.2** | 全流程走查 | 從 Brief → Feynman 完整走完 10 階段，截圖記錄 | ALL |
| **5.3** | Gate 條件逐項驗證 | 對照 E2E 規格表逐條 check | ALL |
| **5.4** | Artifact 狀態流驗證 | 模擬通過所有 Gate，確認 Artifact 狀態正確轉換至 Released | C1 |
| **5.5** | Mock Data 一致性 | 所有 mock data 符合新型別定義 | ALL |

---

## 依賴關係圖

```
1.0 Artifact 骨幹
 ├──→ 2.0 整合機制 (需要 Artifact Context)
 │     ├──→ 2.1 Socratic Reframing (獨立)
 │     ├──→ 2.2 Convergence Graph (需要 Artifact)
 │     ├──→ 2.3 Pre-CAD 路由 (需要 Artifact)
 │     └──→ 2.4 Gate 門檻 (獨立)
 │
 ├──→ 3.0 資料流串接 (需要 Artifact Context)
 │     ├──→ 3.1 Interface Contract (獨立)
 │     ├──→ 3.2 WANT 強化 (需要 Artifact ID)
 │     ├──→ 3.3 Adverse Consequences (獨立)
 │     ├──→ 3.4 Knowledge Panel (獨立)
 │     └──→ 3.5 Context 串接 (需要所有 type 定義)
 │
 └──→ 4.0 Gate 對齊 (需要 2.0 + 3.0)
       └──→ 5.0 驗證 (需要 4.0)
```

**可平行工作**:
- 2.1 + 2.4 可與 2.2 + 2.3 平行
- 3.1 + 3.3 + 3.4 可互相平行
- 4.6 + 4.7 可與 4.1~4.5 平行

---

## 工作包統計

| 階段 | 工作包數 | 新增檔案 | 修改檔案 |
|------|----------|----------|----------|
| 1.0 Artifact 骨幹 | 5 | 4 | 0 |
| 2.0 整合機制 | 11 | 1 | 9 |
| 3.0 資料流串接 | 9 | 2 | ~12 |
| 4.0 Gate 對齊 | 9 | 1 | ~8 |
| 5.0 驗證 | 5 | 0 | 0 |
| **合計** | **39** | **8** | **~29** |
