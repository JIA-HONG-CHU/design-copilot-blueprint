# TRIZ 分層 Drill-Down 開發 WBS（Create · Tab ①）

> **版本**：1.0 | **日期**：2026-04-09 | **狀態**：Draft · 待啟動（feature flag off） | **Owner**：Create FE + TRIZ Solver Backend
> **範圍**：正向分析 E2E 內 **Tab ① TRIZ 解矛盾** 從「TC/PC/SF 三選一候選池」升級為「`LayeredTrizSolution` 分層 drill-down 診斷報告」的前後端開發、契約修訂、Phase B 邏輯修訂與下游（F2 / 決策中心 / Phase B / MUST）銜接。
> **對齊文件**：
> - `docs/diagrams/create-ux-spec.md` v7（Tab ① 區塊 A/B/C、layered 卡片、差異面板、Phase B 規則）
> - `docs/e2e/TRIZ_Layered_DrillDown_Optimization.md` v1.0（§4 架構、§5 schema、§6 文件修改指引、§8 下游契約、§9 遷移路徑）
> - `docs/e2e/TRIZ_Multi_Solution_Adoption_Strategy.md` v1.1（§2 M6 情境、§4.2 Concept Route `layered` type）
> - `docs/e2e/module/Forward_TRIZ_Solver_Architecture.md`（現有三條 solver primitive 作為底層）
> - `docs/e2e/module/Forward_Subsystem_Discovery_Architecture.md` v2.1 §3.1 §6.4.4（F1→F2 hand-off 契約）
> - `docs/diagrams/triz-to-scamper-flow.md`（Phase B 掃描邏輯修訂目標）

---

## 使用者決策（已凍結）

| # | 項目 | 決策 | 備註 |
|---|------|------|------|
| 1 | 升級模式 | **新增 `solve_triz_layered` orchestrator**，既有 `_solve_tc` / `_solve_pc` / `_solve_sf` primitive 不動 | §9.1 遷移路徑；舊 `/triz/solve` 端點保留 |
| 2 | 層級必跑 / 條件跑 | **L1 必跑、L3 必跑平行旁路、L2 條件跑** | L2 觸發條件 = critic ∨ severity≥major ∨ principle_hits≤2 ∨ RD 手動 ∨ force_l2 |
| 3 | quick_mode 策略 | `quick_mode=on` + `severity=minor` → **強制跳過 L2** | 避免微調矛盾被過度深挖 |
| 4 | Feature flag | **`triz_layered_mode` 預設 off**，§9.3 四階段灰度 | 舊 `/triz/solve` 行為在 flag off 時完全不變 |
| 5 | Phase B 衝突判定 | **同 `contradiction_id` + 同 `lts_id` → SKIP**；跨矛盾衝突仍 check | 對應 §8.3 偽代碼；移除「同矛盾多路徑警告」 |
| 6 | Concept Route 擴展 | 新增 `type=layered`，`layered_solution` 欄位對齊 `TRIZ_Multi_Solution_Adoption_Strategy.md` v1.1 §4.2 | `single` / `composite` 保留 |
| 7 | 命名解耦 | 本 WBS 的 **L1/L2/L3** 僅指 F1 分析層，與 F2 的 System/Module/Component 完全隔離 | 配 grep lint 規則 |
| 8 | L3 呈現原則 | **L3 永遠呈現**（即使 L1/L2 已採納） | 結構視角旁路，不被採納狀態遮蔽 |
| 9 | Critic 低信心 | `confidence < 0.5` 時**不自動觸發** L2，改顯示「🔽 深挖 L2」手動按鈕 | 對應 Anti-Pattern §10 第 4 條 |

---

## 邏輯流程（摘要）

```
Phase A → contradictions[{id, pair, severity}]
    ↓
solve_triz_layered orchestrator (NEW)
    ├── L1：_solve_tc (既有 primitive，永遠跑)
    │     └── critic (NEW)：判「trade-off 折衷」→ 觸發 L2
    ├── L2：_derive_pc_from_tc (NEW deepen_link) → _solve_pc (既有 primitive)
    │     觸發條件：critic / severity≥major / RD 手動 / force_l2=true
    │     quick_mode=on + severity=minor → 跳過
    └── L3：_solve_sf (既有 primitive，永遠跑，角色=structural_lens)
    ↓
LayeredTrizSolution (NEW schema) + differential_analysis (LLM)
    ↓
FE 分層診斷卡（L1/L2/L3 垂直堆疊 + deepen_link 視覺化 + recommended_route）
    ↓
RD 採納 [推薦 / 自訂 / 只採 L1] → 產出 Concept Route type=layered|single|composite
    ↓
決策中心 → Phase B (phase_b_directive: 同 LTS 跨層 SKIP) → MUST → Pre-CAD
    ↓
F2 subsystem-suggestions 以 adopted_route 為 related_contradictions 主綁定
```

---

## MVP 切分與建議順序

| 優先 | 標籤 | 說明 |
|------|------|------|
| P0 | 資料模型 + orchestrator 骨架 | 無此則 LayeredTrizSolution 無法閉環 |
| P0 | L1 critic + L2 deepen_link | drill-down 的核心 ARIZ 落地 |
| P0 | 分層診斷卡 FE（區塊 B 垂直堆疊） | v7 UX 的單一最大變動 |
| P0 | 採納三按鈕 → 產出 layered Concept Route | Tab ① → 決策中心閉環 |
| P1 | differential_analysis LLM prompt | 無此則 recommended_route 無鑒別力 |
| P1 | Phase B 修訂 + ConceptRouteCard layered 渲染 | 移除「同矛盾多路徑警告」的關鍵 |
| P1 | F2 hand-off 升級為 `layered_triz_solutions` | 向後相容 fallback 仍保留扁平格式 |
| P2 | quick_mode flag（severity=minor → L2 skip） | 避免微調矛盾被過度深挖 |
| P2 | feature flag `triz_layered_mode` 灰度 | `§9.3` 遷移路徑 |
| P3 | 回歸測試 + 文件同步 §6 三份文件 | 避免語意漂移 |

---

## WBS 總覽

| ID | 工作包 | 主要交付物 |
|----|--------|------------|
| 1 | 基線與契約凍結 | schema 型別、OpenAPI 快照、feature flag、命名對齊 |
| 2 | 後端：LayeredTrizSolution 資料模型 | Pydantic model + TS mirror + 測試 |
| 3 | 後端：solve_triz_layered orchestrator | 三層編排 + quick_mode + force_l2 |
| 4 | 後端：L1 critic + L2 deepen_link | critic helper + _derive_pc_from_tc |
| 5 | 後端：differential_analysis prompt | LLM 跨層比對 + recommended_route |
| 6 | 後端：API endpoint + Phase B 修訂 | `POST /triz/solve-layered` + `phase_b_directive` 消費 |
| 7 | 前端：區塊 A 矛盾總覽 + Phase A | severity badge、quick_mode toggle |
| 8 | 前端：區塊 B 分層診斷卡 | L1/L2/L3 垂直堆疊 + critic badge + deepen_link 視覺化 |
| 9 | 前端：區塊 B differential_analysis 面板 + 採納三按鈕 | recommended_route + 自訂對話框 |
| 10 | 前端：決策中心 layered 卡片類型 | ConceptRouteCard 擴展 + 層採納徽章 |
| 11 | 整合、狀態與下游銜接 | F2 hand-off 升級、MUST/Pre-CAD 消費、Phase A 回饋 |
| 12 | 遷移、測試、可觀測性、文件 | feature flag 灰度、契約測、E2E、§6 文件同步 |

---

## 1.0 基線與契約凍結

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 1.1 | 從 `TRIZ_Layered_DrillDown_Optimization.md` §5 匯出 **TypeScript + Pydantic** 對齊的 `LayeredTrizSolution` 型別：`L1_surface` / `L2_root_cause` / `L3_structural_check` / `differential_analysis` / `phase_b_directive` | 型別定義 PR；與 §5 YAML 範例雙向可追溯 | — |
| 1.2 | **layer_role** 枚舉凍結：`phenomenon` / `root_cause` / `structural_lens`；**depth_indicator** 字串集合凍結：`trade-off 改良` / `根因突破` / `功能鏈缺陷修補` | 常量表 + lint/單測禁止漂移 | 1.1 |
| 1.3 | **L2 觸發條件表**（§4.2）寫入檢查清單：(a) critic 判定 (b) severity ≥ major (c) principle_hits ≤ 2 (d) RD 手動 (e) force_l2 param | Review checklist；prompt 與 FE 驗證一致 | 1.1 |
| 1.4 | **feature flag** `triz_layered_mode` 新增（backend config + FE runtime flag），預設 **off**；確保舊 `POST /triz/solve` 行為不變 | flag 文件 + 開關測試 | — |
| 1.5 | Concept Route 資料模型擴展：`type` 新增 `layered` 枚舉值；`layered_solution` 欄位對齊 `TRIZ_Multi_Solution_Adoption_Strategy.md` v1.1 §4.2 | Pydantic + TS 同步；schema migration 文件 | 1.1 |
| 1.6 | **命名解耦**：本 WBS 的 **L1/L2/L3** 僅指 F1 分析層，與 F2 的 System/Module/Component 樹階完全隔離（對應 F2 SA §8.1.1） | 文件補充一行提醒 + grep lint 規則 | 1.1 |

---

## 2.0 後端：LayeredTrizSolution 資料模型

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 2.1 | `backend/app/models/schemas.py` 新增 `LayeredTrizSolution` Pydantic model，含三層 sub-model（`L1Surface` / `L2RootCause` / `L3StructuralCheck`）與 `DeepenLink` / `DifferentialAnalysis` / `PhaseBDirective` | 型別定義 + 序列化往返測試 | 1.1 |
| 2.2 | 每層 `suggestions[]` 保留既有 `TrizSuggestion` 結構（復用），僅新增 `layer_role` / `depth_indicator` / `evidence_level_floor` | 不破壞既有 API 消費者 | 2.1, 1.1 |
| 2.3 | `LayeredTrizSolution.id` 生成規則：`LTS-{project}-{seq}` 與既有 contradiction_id 建立 FK 語意 | id helper + 單元測試 | 2.1 |
| 2.4 | `phase_b_directive` 預設值：`same_contradiction_intra_layer_conflict=skip` / `cross_contradiction_conflict=check` | 預設值測試 + 反序列化測試 | 2.1 |

---

## 3.0 後端：solve_triz_layered Orchestrator

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 3.1 | `backend/app/agents/triz_solver.py` 新增 `solve_triz_layered(req)` orchestrator，**復用** 既有 `_solve_tc` / `_solve_pc` / `_solve_sf` primitive（§9.1） | 編排單元測試；primitive 不動 | 2.x |
| 3.2 | **L1 必跑**：呼叫 `_solve_tc` → 產出 `L1Surface` + principles；填入 `depth_indicator="trade-off 改良"` | 單元測試 | 3.1 |
| 3.3 | **L3 必跑平行旁路**：呼叫 `_solve_sf` → 產出 `L3StructuralCheck` + `role=structural_lens`；**與 L1 並發**執行 | 並發測試；時序圖 | 3.1 |
| 3.4 | **L2 條件跑**：依 1.3 條件表判斷是否觸發；未觸發時 `L2_root_cause=None` 並記錄 `trigger_reason` | 五種觸發路徑各一測試 | 3.1, 4.1 |
| 3.5 | **quick_mode** 支援：`req.quick_mode=true` 且 `severity=minor` → 強制跳過 L2；在 `L2_root_cause.trigger_reason` 標註 "quick_mode skipped" | 單元測試：minor+quick 不呼叫 `_derive_pc_from_tc` | 3.4 |
| 3.6 | **force_l2** 支援：`req.force_l2=true` 覆蓋所有條件，強制跑 L2；記錄 `trigger_reason="RD manual"` | 單元測試 | 3.4 |
| 3.7 | orchestrator 失敗策略：L1 失敗整體失敗；L2 失敗降級為 `skipped + error`；L3 失敗不阻擋整體回傳 | 故障注入測試 | 3.2, 3.3, 3.4 |

---

## 4.0 後端：L1 Critic + L2 Deepen_link

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 4.1 | `triz_solver._l1_critic(l1_surface)` helper：規則（principle_hits ≤ 2）+ LLM（判「trade-off 折衷」）複合判定 | 回傳 `{trigger_l2: bool, reason: str, confidence: float}` | 2.x |
| 4.2 | critic 低信心處理：`confidence < 0.5` 時不自動觸發 L2，改為回傳 `suggest_manual_decision=true`（FE 顯示「🔽 深挖 L2」按鈕） | 對應 Anti-Pattern §10 第 4 條 | 4.1 |
| 4.3 | `triz_solver._derive_pc_from_tc(tc_pair)` helper：依 §4.3 契約，把 `(improving_param, worsening_param)` 自動產出 `derived_physical_parameter` + `contradiction_statement` + `separation_type_candidates[]`（time/space/condition/whole_part + rationale） | LLM prompt + 規則 fallback；至少 e-bike 案例（#21, #17 → P(t), time）可重現 §7.3 | 2.x |
| 4.4 | deepen_link 完成後呼叫既有 `_solve_pc` primitive 完成 L2；把 `deepen_link` 物件掛到 `L2RootCause` | 整合測試：`(#1, #14) → 結構斷面厚度 t` 推導符合 §4.3 | 4.3 |
| 4.5 | **deepen_link confidence**：分離類型選擇帶機率分數（§7.3 `time: 0.85`），FE 可呈現 chip | 斷言測試 | 4.3 |

---

## 5.0 後端：differential_analysis Prompt

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 5.1 | `backend/app/prompts/triz_solver.py` 新增 `DIFFERENTIAL_ANALYSIS_PROMPT`：輸入 L1/L2/L3 內容，輸出三對比對（L1vsL2 / L1vsL3 / L2vsL3） + `recommended_route` + `fallback` + `rationale` | prompt 模板 + 黃金輸出測試 | 3.x |
| 5.2 | recommended_route 決策規則：severity=major + 有 L2 + 有 L3 → primary="L2+L3"；否則依現有層組合擇優 | 決策矩陣文件 | 5.1 |
| 5.3 | L3 `relationship_to_other_layers`（§4.4）：LLM 產出三段話（supports_L1 / supports_L2 / standalone_value） | e-bike 案例可重現 §7.4 | 3.3, 5.1 |
| 5.4 | prompt 輸出 JSON schema 驗證（reject 未知鍵、缺欄位） | validator + 錯誤碼 | 5.1 |

---

## 6.0 後端：API Endpoint + Phase B 修訂

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 6.1 | `backend/app/routers/triz.py` 新增 **`POST /triz/solve-layered`** endpoint；舊 `/triz/solve` 保留為 primitive | OpenAPI snapshot；FE 可呼叫 | 3.x, 5.x |
| 6.2 | 請求體：`contradictions[]` + `quick_mode?` + `force_l2?` + `project_id`；回應體：`layered_triz_solutions[]` | 契約測試 | 6.1 |
| 6.3 | **Phase B 掃描邏輯修訂**（§8.3 偽代碼）：`same contradiction_id + same lts_id` → **SKIP**；否則正常比對 | 單元測試覆蓋四個分支（same/diff × intra/inter） | 2.4 |
| 6.4 | `backend/app/routers/convergence.py` 或同等 Phase B scanner 消費 `phase_b_directive.same_contradiction_intra_layer_conflict` | 整合測試：同 LTS 採納 L1+L2+L3 → Phase B converged，無 warning | 6.3 |
| 6.5 | 移除既有「同矛盾多路徑警告」告警碼或降級為 deprecation log（若仍有 flag off 消費者） | grep 清查 + 日誌只在 flag off 時觸發 | 6.4 |

---

## 7.0 前端：Tab ① 區塊 A — 矛盾總覽 + Phase A

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 7.1 | 沿用既有 `ConvergenceDashboard` + `HumanReviewPanel`；新增矛盾列表每列顯示 **severity badge**（fatal/major/minor） | UX v7 區塊 A 表格 | — |
| 7.2 | **quick_mode toggle**（專案層級 switch）：持久化到 project settings；呼叫 `solve-layered` 時帶 `quick_mode` | 切換即時生效；L2 狀態顯示「quick_mode 跳過 ⊘」 | 6.2 |
| 7.3 | `[啟動 Phase A]` / `[重新執行]` 對接新的 `solve-layered` endpoint（flag on 時） | flag off 時回退舊 endpoint | 1.4, 6.1 |
| 7.4 | 每矛盾展開時 **lazy fetch** 對應 LayeredTrizSolution（避免一次載入全部） | 前端測試：展開一筆才 fetch | 6.1 |

---

## 8.0 前端：Tab ① 區塊 B — LayeredTrizSolution 分層診斷卡

> 本工作包是 v7 UX 變動的核心，需新建一個頂層元件 `LayeredSolutionCard.tsx` 與三個子元件 `L1SurfaceSection` / `L2RootCauseSection` / `L3StructuralSection`。

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 8.1 | **`LayeredSolutionCard.tsx`**：矛盾 header（id + 自然語言描述 + severity badge）+ 三層垂直堆疊容器 | 對應 UX v7 區塊 B ASCII 示意圖 | 1.1 |
| 8.2 | **`L1SurfaceSection.tsx`**：藍色主題 header「必跑 ✓」+ suggestions 列表 + depth_indicator chip + `[採納全部] [採納選取] [🔽 深挖 L2]` | critic 觸發時紅字警示；按 `[🔽 深挖 L2]` 呼叫 `solve-layered?force_l2=true` | 4.2, 6.2 |
| 8.3 | **`L1CriticBadge.tsx`**：顯示 `trade-off 折衷` 警示 + hover 顯示 critic reason；confidence < 0.5 時改顯示「需 RD 判斷」 | 兩種狀態截圖 | 8.2 |
| 8.4 | **`L2RootCauseSection.tsx`**：黃色主題 header + 狀態徽章（必跑/已觸發/條件未達/quick_mode 跳過）+ trigger_reason tooltip | 四種狀態各一 Storybook story | 8.1 |
| 8.5 | **`DeepenLinkVisualization.tsx`**：以箭頭圖呈現 `(#21, #17) ─ARIZ 深挖─▶ 瞬時功率 P(t)`；兩難陳述文字下方顯示 | SVG 或 CSS flex；無資料時整區塊隱藏 | 4.3, 8.4 |
| 8.6 | **SeparationTypeChips**：time / space / condition / whole_part 四種 chip 帶 confidence 分數（§4.5）；主推類型以粗體 | UX「⏱ time (0.85) │ 🎚 condition (0.62)」 | 4.5, 8.4 |
| 8.7 | L2 `[RD 手動編輯]` 對話框：允許修改 `derived_parameter` 與 separation_type 後 re-fetch L2 | editDeepenLink() API or 本地 override | 8.5 |
| 8.8 | **`L3StructuralSection.tsx`**：綠色主題 header「必跑 ✓ 旁路」+ Su-Field 三角模型（S1/S2/F）+ state badge + matched_standard_solutions | Su-Field 小型 SVG 圖 | 8.1 |
| 8.9 | **L3 relationship_to_other_layers** 面板：三段話（supports_L1 / supports_L2 / standalone_value）；**即使 L1/L2 已採納仍永遠顯示**（呼應設計原則「L3 永遠呈現」） | UX v7 設計原則驗證 | 5.3, 8.8 |

---

## 9.0 前端：differential_analysis 面板 + 採納三按鈕

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 9.1 | **`DifferentialAnalysisPanel.tsx`**：三對比對（L1vsL2 / L1vsL3 / L2vsL3）+ recommended_route + fallback + rationale | UX v7 ASCII 面板重現 | 5.x, 8.1 |
| 9.2 | `[採納推薦路線]` 按鈕：一鍵產生 Concept Route `type=layered`，`adopted_layers` 取 recommended_route 指定層 | 呼叫 `adoptLayeredSolution(mode="recommended")` | 10.x |
| 9.3 | `[自訂組合]` 按鈕：開對話框讓 RD 勾選 L1/L2/L3 子集；選一層時自動降級為 `single`；L1 內多原理互相強化時可選擇降為 `composite` | 與 `MultiSolutionAdoptionPanel` 既有邏輯打通 | 10.x |
| 9.4 | `[只採 L1 快速路線]` 按鈕：等同 fallback，產出 `single` 或 `composite`（取決於 L1 採納幾條原理） | 捷徑測試 | 10.x |
| 9.5 | 採納後的 toast + 卡片收合 + 決策中心資料更新 | E2E：採納 → 決策中心出現 layered 卡片 | 9.2, 10.x |

---

## 10.0 前端：決策中心 `layered` 卡片類型

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 10.1 | `ConceptRouteCard.tsx` 擴展 `type` 支援 `layered`（原有 `single` / `composite` 保留） | 渲染分支測試 | 1.5 |
| 10.2 | **layered 卡片第一眼**：🔵●🟡●🟢● 層採納徽章（實心=已採納，空心=存在但未採納）+ recommended_route 標籤 | UX v7 範例卡片重現 | 10.1 |
| 10.3 | **layered 卡片第二眼**：每層 mechanism + depth_indicator + effort；differential_analysis 精簡版 | 展開測試 | 10.1 |
| 10.4 | **layered 卡片第三眼**：每層獨立 assumptions + VP + deepen_link 溯源 + L3 relationship 完整版 | 與方案追溯七要素對齊 | 10.1 |
| 10.5 | 決策中心 **移除「同矛盾多路徑警告」**；改為「跨矛盾衝突」提示，呼應 Phase B 新邏輯 | grep 清查；警告文案更新 | 6.4 |
| 10.6 | `[執行 Phase B]` 按鈕送出時附帶 `phase_b_directive`（從採納的 LTS 內組合推導） | 請求體驗證 | 6.3 |

---

## 11.0 整合、狀態與下游銜接

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 11.1 | **F2 hand-off 升級**：`POST /scamper/subsystem-suggestions` 請求體新增 `layered_triz_solutions[]`（§8.1.1） | 向後相容：同時支援扁平 `contradictions[]` fallback | 6.2 |
| 11.2 | F2 內部以 **`adopted_route`**（or `recommended_route` 若未採納）作為 `related_contradictions` 主綁定（F2 SA §6.4.4） | 整合測試：L2+L3 採納 → subsystem 綁定到此組合 | 11.1 |
| 11.3 | **Phase A 回饋迴路**：L2 產生的 `secondary_contradictions` 回饋 Phase A 新一輪 F1（§8.1） | 循環測試：生成 → 採納 → 新矛盾 → 再生成不 crash | 6.1 |
| 11.4 | **MUST 快篩**：layered Concept Route 的 MUST 檢查對整張卡片（而非每層獨立）判 pass/fail | 每層 assumptions 匯總為卡片層級 evidence_level_floor | 10.1 |
| 11.5 | **Pre-CAD 五維**：layered 卡片的 mechanism 以 recommended_route 對應的層組合作為輸入；trace 需可展開到各層 | UX v7 Pre-CAD 表格對齊 | 10.3 |
| 11.6 | Supabase 持久化：`layered_triz_solutions` table（或以 JSONB 欄位掛在 contradiction 上）；`concept_routes` 新增 `type=layered` 與 `layered_solution` JSONB 欄位 | migration SQL + RLS policy | 1.5, 2.x |

---

## 12.0 遷移、測試、可觀測性、文件

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 12.1 | **Feature flag 灰度** 四階段（§9.3）：前置 / 內部灰度 / 文件對齊 / 全面切換；每階段 exit criteria | Runbook + Rollback plan | 1.4 |
| 12.2 | **黃金案例回歸**：§7 e-bike 馬達散熱（#21 × #17）案例紙上流程可跑通，L1/L2/L3/differential 輸出符合 §7.2–§7.5 | CI 黃金測試 | 3.x, 4.x, 5.x |
| 12.3 | 後端：`solve_triz_layered` / critic / deepen_link / differential pure function 單元測試 | coverage ≥ 80% | 3.x, 4.x, 5.x |
| 12.4 | API **契約測試**（Pact 或 schema snapshot）：`/triz/solve-layered`、Phase B endpoint、F2 升級後的 hand-off | 破壞性更動失敗 | 6.x, 11.1 |
| 12.5 | FE **E2E**：啟動 Phase A → LayeredTrizSolution 展開 → 採納推薦 → 決策中心 layered 卡片 → Phase B converged → MUST 通過 → Pre-CAD | 錄影 artifact | 7.x, 8.x, 9.x, 10.x, 11.x |
| 12.6 | **回歸**：flag off 時舊 `/triz/solve` + 舊 FE 行為不變 | 舊案例無退化 | 1.4 |
| 12.7 | 可觀測性：`solve_triz_layered` 各層耗時 metric、critic 觸發率、recommended_route 分布（primary vs fallback） | Dashboard 欄位 | 3.x, 5.x |
| 12.8 | **文件同步**（對應 §6 三份文件修改指引）：`Forward_TRIZ_Solver_Architecture.md` / `triz-to-scamper-flow.md` / `TRIZ_Multi_Solution_Adoption_Strategy.md` 章節級更新 | Doc PR；§11.1 「TC/PC/SF 互斥」語句清零 | 全案 |
| 12.9 | **文件**：本 WBS 與 `create-ux-spec.md` / `TRIZ_Layered_DrillDown_Optimization.md` / `TRIZ_Multi_Solution_Adoption_Strategy.md` 對照表維護 | 版本升級時同步 | — |

---

## 本版涵蓋 / 不涵蓋

| 涵蓋 | 不涵蓋（另開 WBS 或文件） |
|------|---------------------------|
| Tab ① TRIZ 分層 drill-down（L1/L2/L3 + deepen_link + differential_analysis） | Tab ② 子系統介面契約與 Spatial Discovery（見 `Subsystem_Interface_Development_WBS.md`） |
| `LayeredTrizSolution` schema + orchestrator + endpoint | 反向 Anti-Anchor 與 SCAMPER 本身的實作（各自 WBS） |
| 決策中心 `layered` 卡片類型 + Phase B SKIP 修訂 | MUST / Pre-CAD 評估引擎細節（僅介面層對齊） |
| F1→F2 hand-off 升級為 `layered_triz_solutions`（前端請求 + F2 消費） | F2 內部子系統生成邏輯 |
| Feature flag 灰度、§6 三份文件同步 | TRIZ Knowledge Base 重新訓練或擴充 |

---

## 依賴圖（關鍵路徑）

```
1.1 schema 凍結 ──┬─► 1.2 layer_role / depth_indicator ──┐
                  │                                        │
                  ├─► 1.3 L2 觸發條件 ──► 1.4 feature flag │
                  │                                        │
                  └─► 1.5 Concept Route layered ──► 1.6 命名解耦
                                                           │
2.1 LayeredTrizSolution model ──► 2.2 suggestions 相容 ──► 2.3 id helper ──► 2.4 phase_b_directive 預設值
                                                           │
3.1 orchestrator ──► 3.2 L1 必跑 ──► 3.3 L3 並發旁路 ──► 3.4 L2 條件跑 ──► 3.5 quick_mode ──► 3.6 force_l2 ──► 3.7 失敗策略
                                                           │
4.1 L1 critic ──► 4.2 低信心處理 ──► 4.3 deepen_link ──► 4.4 串 _solve_pc ──► 4.5 confidence chip
                                                           │
5.1 differential prompt ──► 5.2 recommended_route 規則 ──► 5.3 L3 relationship ──► 5.4 schema 驗證
                                                           │
6.1 /triz/solve-layered ──► 6.2 req/res 契約 ──► 6.3 Phase B SKIP ──► 6.4 scanner 消費 ──► 6.5 移除同矛盾警告
                                                           │
7.x 區塊 A (severity + quick_mode toggle + lazy fetch)     │
                                                           │
8.1 LayeredSolutionCard ──► 8.2 L1Section ──► 8.3 CriticBadge ──► 8.4 L2Section ──► 8.5 DeepenLink viz ──► 8.6 SeparationChips ──► 8.7 RD 編輯 ──► 8.8 L3Section ──► 8.9 L3 relationship
                                                           │
9.1 DifferentialPanel ──► 9.2/9.3/9.4 三採納按鈕 ──► 9.5 toast 收合
                                                           │
10.1 ConceptRouteCard layered ──► 10.2 層徽章 ──► 10.3 第二眼 ──► 10.4 第三眼 ──► 10.5 警告重寫 ──► 10.6 phase_b_directive 附帶
                                                           │
11.1 F2 hand-off 升級 ──► 11.2 adopted_route 綁定 ──► 11.3 Phase A 回饋 ──► 11.4 MUST 卡片層級 ──► 11.5 Pre-CAD trace ──► 11.6 Supabase 持久化
                                                           │
12.1 flag 灰度 ──► 12.2 黃金案例 ──► 12.3 單測 ──► 12.4 契約測 ──► 12.5 E2E ──► 12.6 舊流程回歸 ──► 12.7 metric ──► 12.8/12.9 文件
```

關鍵路徑：**1.1 → 2.1 → 3.1 → 4.3 → 5.1 → 6.1 → 8.1 → 9.2 → 10.1 → 11.1 → 12.2 → 12.5**

---

## 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| **L2 critic 誤判率高**：把「應該深挖」的矛盾誤判為「L1 已足夠」 | RD 拿不到根因突破解 | 4.2 低信心時不自動觸發，顯示手動按鈕；12.7 觀測 critic 觸發率 |
| **deepen_link 從 TC 對推導 PC 參數失敗** | L2 產出品質差 | 4.3 LLM + 規則 fallback；12.2 黃金案例把關 |
| **differential_analysis LLM 輸出格式漂移** | FE 渲染失敗 | 5.4 JSON schema 驗證 + reject 未知鍵 |
| **Phase B SKIP 規則寫錯 → 跨矛盾衝突被誤 SKIP** | 候選池被污染 | 6.3 四分支單元測試 + 6.4 整合測試 |
| **F2 未升級就收到新 hand-off 格式** | F2 崩潰 | 11.1 向後相容 fallback；12.4 契約測試 |
| **舊 `/triz/solve` 消費者在 flag on 時被遺忘** | 舊流程退化 | 12.6 回歸測試 + 保留 primitive endpoint |
| **RD 對三層診斷卡資訊量過載** | 決策時間拉長而非縮短 | 12.5 E2E 計時；可考慮 UX A/B 優化層預設摺疊策略 |

---

## 完成判準（Definition of Done）

- [ ] 所有 P0 / P1 任務包單測 + 契約測 + E2E 全綠（12.3 / 12.4 / 12.5）
- [ ] Feature flag `triz_layered_mode` off 時舊 `/triz/solve` 與舊 FE 行為 0 退化（12.6）
- [ ] §7 e-Bike 馬達散熱黃金案例（#21 × #17）在 CI 可重現 L1 / L2 / L3 / differential_analysis 輸出（12.2）
- [ ] `POST /triz/solve-layered` 回應通過 `LayeredTrizSolution` schema 驗證；未知鍵 reject
- [ ] LayeredSolutionCard 於 Tab ① 區塊 B 可渲染 L1/L2/L3 垂直堆疊 + deepen_link 箭頭 + differential 面板
- [ ] 採納三按鈕（推薦 / 自訂 / 只採 L1）產出 Concept Route 正確落入 `type=layered|single|composite`
- [ ] Phase B 於「同矛盾同 LTS 跨層採納」情境下 converged，**無** 同矛盾多路徑警告（6.3–6.5）
- [ ] F2 `POST /scamper/subsystem-suggestions` 同時支援 `layered_triz_solutions[]` 與扁平 `contradictions[]` fallback（11.1 契約測）
- [ ] 決策中心 layered 卡片三眼呈現（徽章 / mechanism / 溯源）與 UX v7 範例一致
- [ ] `§6` 三份文件（Forward_TRIZ_Solver_Architecture / triz-to-scamper-flow / TRIZ_Multi_Solution_Adoption_Strategy）章節級同步完畢，「TC/PC/SF 互斥」語句清零（12.8）
- [ ] 可觀測性 Dashboard 可見各層耗時、critic 觸發率、recommended_route 分布（12.7）

---

## 文件對照（快速索引）

| WBS 區段 | create-ux-spec.md v7 | TRIZ_Layered_DrillDown_Optimization.md | TRIZ_Multi_Solution_Adoption_Strategy.md v1.1 |
|----------|-----------------------|-----------------------------------------|----------------------------------------------|
| 1.x 契約凍結 | Tab ① 對齊文件對應表 | §5 schema、§4.2 觸發表 | §4.2 Concept Route 擴展 |
| 2.x 資料模型 | Tab ① 區塊 B 示意圖 | §5 LayeredTrizSolution | — |
| 3.x Orchestrator | — | §4.1–§4.2、§9.1 | — |
| 4.x Critic + Deepen_link | Tab ① L1 critic / L2 deepen_link 視覺化 | §4.3 deepen_link 契約 | — |
| 5.x differential_analysis | Tab ① differential_analysis 面板 | §5 schema、§7.5 案例 | — |
| 6.x API + Phase B | Tab ① 區塊 B 採納、決策中心 Phase B 規則 | §8.3 Phase B 偽代碼 | §2 M6 情境 |
| 7.x FE 區塊 A | Tab ① 區塊 A 表格 | — | — |
| 8.x FE 區塊 B 分層卡 | Tab ① 區塊 B 完整表格 + ASCII 圖 | §7 e-bike 案例、§4.4 L3 定位 | — |
| 9.x differential 面板 | Tab ① 採納三按鈕 | §7.5 推薦路線 | §4.2 layered Concept Route |
| 10.x 決策中心 layered | 決策中心表格 + layered 卡片範例 | §8.2 決策中心契約 | §5.x 跨層案例 |
| 11.x 下游銜接 | 方案追溯七要素、步驟索引映射 | §8.1 F1→F2 hand-off | — |
| 12.x 遷移測試文件 | v7 更新日誌 | §6 文件修改指引、§9 遷移路徑、§11 驗證 | §6 Anti-Pattern |
