# Explore 階段 TC→多PC 分解 WBS（Explore · Tab 矛盾識別）

> **版本**：1.0 | **日期**：2026-04-09 | **狀態**：Draft · 待啟動 | **Owner**：Explore FE + Backend Agents
> **範圍**：Explore 頁矛盾識別階段，當 AI 識別出 TC 後由 **L1 critic** 判斷是否觸發 **TC→多 PC 深挖**，每個 PC 自動附掛 **分離原則 (16 類)**，結果以 `parent_contradiction_id` FK 方式寫入 `contradictions` 表並以巢狀卡片呈現。
> **對齊文件**：
> - `docs/e2e/module/Forward_TRIZ_Solver_Architecture.md` v1.1（§6.2 L2 觸發條件、§6.7 `deepen_link` 契約、§7.0 `solve_triz_layered` 時序）
> - `docs/e2e/TRIZ_Layered_DrillDown_Optimization.md`（L1/L2/L3 drill-down 方法論）
> - `docs/e2e/TRIZ_Multi_Solution_Adoption_Strategy.md`（§1.1 多分離原則同時適用）
> - `backend/app/prompts/triz_solver.py:77-132`（16 項分離原則權威清單）

---

## 使用者決策（已凍結）

| # | 項目 | 決策 | 備註 |
|---|------|------|------|
| 1 | 觸發方式 | **自動觸發 (critic-based)** | 無手動按鈕；AI 識別完成後立即跑 critic |
| 2 | 儲存策略 | **`contradictions` 新增欄位 + `parent_contradiction_id`** | 子 PC = 子列，FK ON DELETE CASCADE |
| 3 | 分離原理分類法 | **沿用 triz_solver 現有 16 分類** | 抽共用常數；backend/frontend 各一份 |

---

## 邏輯流程（摘要）

```
AI 識別矛盾 → formalize_contradiction 回傳 TC
    → L1 critic (規則 + LLM) 判斷是否深挖
        ├─ 不觸發 → 維持單一 TC，結束
        └─ 觸發 → TC_TO_MULTI_PC_DECOMPOSITION prompt
            → LLM 推導 2–5 個 derived_parameter
            → 每個 PC 挑 1 項 16 分離原則 + rationale + confidence
            → 驗證 (去重 / ID 合法性 / ≥2)
            → 批次 INSERT 子列 (parent_contradiction_id = 父 TC)
            → invalidate query → 巢狀卡片渲染
            → toast「已自動深挖出 N 個物理矛盾」
```

---

## MVP 切分與建議順序

| 優先 | 標籤 | 說明 |
|------|------|------|
| P0 | 1.x 基線 + 分離原則共用常數 | 下游 4 項任務包都依賴此 |
| P0 | 2.x 後端 L1 critic + 深挖 prompt + agent | 無此則無法產出多 PC |
| P0 | 3.x DB migration + Supabase types | 無此則無法持久化子 PC |
| P1 | 4.x 前端自動觸發 + 批次 insert | 與後端串接的關鍵閘 |
| P1 | 5.x 前端巢狀卡片 + 分離原則 badge | UX 主要交付 |
| P2 | 6.x 父 TC 更新時 children stale 提示 | 防髒資料，可後補 |
| P2 | 7.x 單測 + E2E | 回歸保護；e-Bike 驗證腳本 |

---

## WBS 總覽

| ID | 工作包 | 主要交付物 |
|----|--------|------------|
| 1 | 基線與共用常數 | 16 分離原則雙端常數、型別表、文件對照 |
| 2 | 後端：L1 critic | `should_trigger_pc_decomposition` + LLM critic prompt |
| 3 | 後端：TC→多 PC 深挖 agent | `decompose_tc_to_pcs` + prompt + schema + router |
| 4 | 資料庫：migration 與型別 | `006_pc_decomposition.sql` + supabase types |
| 5 | 前端：自動觸發與持久化 | AI 識別 hook → 批次 insert → query invalidate |
| 6 | 前端：巢狀卡片與分離原則 UI | `<DecomposedPCList>`、色條 badge、可折疊 rationale |
| 7 | 前端：父更新防護 | stale 標記 + 手動重新深挖按鈕（僅此例外） |
| 8 | 測試、可觀測性、文件 | 單測/整合測/E2E；e-Bike 驗證腳本；runbook |

---

## 1.0 基線與共用常數

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 1.1 | 從 `backend/app/prompts/triz_solver.py:77-132` 抽出 **16 項分離原則** (4×4)，建立 `backend/app/tools/separation_principles.py` | `SEPARATION_PRINCIPLES: list[dict]` + `build_separation_principle_context()`；欄位 `id`, `category`, `name_zh`, `description`；與 triz_solver prompt 字串 1:1 可 diff | — |
| 1.2 | 建立前端對應常數 `src/lib/triz/separationPrinciples.ts` | 匯出 `SEPARATION_PRINCIPLES` + `getSeparationPrinciple(id)` + `CATEGORY_COLOR` (time=藍 / space=綠 / condition=橘 / whole_part=紫)；內容與 1.1 雙向可追溯 | 1.1 |
| 1.3 | 新增單測防 drift：backend 與 frontend 清單的 `id` 集合必須一致 | `backend/tests/test_separation_principles_parity.py` 或前端 jest 讀取 JSON；任一端改動即 fail | 1.1, 1.2 |
| 1.4 | 凍結新 Pydantic/TS 型別：`DecomposedPC` / `DeepenLink` 對齊表 | `schemas.py` 與 `src/types/explore.ts` 同步 PR；欄位命名 snake_case↔camelCase 對照清單 | 1.1 |

---

## 2.0 後端：L1 critic

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 2.1 | 新檔 `backend/app/agents/triz_critic.py` 實作 `should_trigger_pc_decomposition(tc_response, severity, rd_manual=False) -> tuple[bool, str]` | 規則層：`severity ∈ {fatal, major}` / `candidate_principles ≤ 2` / `rd_manual=True` 任一為 True 即觸發；邏輯 1:1 對應 `Forward_TRIZ_Solver_Architecture.md:645-660` | 1.4 |
| 2.2 | 在 `backend/app/prompts/analyst.py` 新增 `L1_TRADE_OFF_CRITIC` prompt | LLM 判斷 TC improving/worsening 配對是否僅是 trade-off 折衷；輸出 `{"all_trade_off": bool, "reason": str}`；規則層未觸發時才呼叫，節省 tokens | 2.1 |
| 2.3 | 單測 `backend/tests/test_triz_critic.py` | 4 條規則各自一個 case + LLM fallback 兩個 case（mock 回 True/False） | 2.1, 2.2 |

---

## 3.0 後端：TC→多 PC 深挖 agent

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 3.1 | 在 `backend/app/prompts/analyst.py` 新增 `TC_TO_MULTI_PC_DECOMPOSITION` prompt | 輸入：TC statement + (improving, worsening) + mission/constraints/kpis + `clarified_insights` + `separation_principle_context`；指令要求 2–5 個 **互異 `derived_parameter`**（不同子系統 / 不同物理尺度），每個綁 1 項分離原則 ID；輸出 JSON schema 固定 | 1.1, 1.4 |
| 3.2 | `backend/app/models/schemas.py` 新增 `DecomposedPC` / `ContradictionDecomposeRequest` / `ContradictionDecomposeResponse` | Pydantic v2 model；`DecomposedPC` 欄位：`derived_parameter`, `subsystem_hint`, `physical_contradiction`, `pc_attribute_a`, `pc_attribute_not_a`, `separation_principle_id`, `separation_category`, `separation_rationale`, `confidence`；`Response` 欄位含 `triggered`, `trigger_reason`, `decomposed_pcs`, `reasoning` | 1.4 |
| 3.3 | `backend/app/agents/analyst.py` 新增 `decompose_tc_to_pcs(req) -> ContradictionDecomposeResponse` | 步驟：critic → `_extract_socratic_insights` (重用 line 270) → prompt 組裝 → `call_llm_json` → 驗證 (≥2 且 `derived_parameter` 去重且 `separation_principle_id` 在 16 清單內) → 回傳；整段 try/except，失敗回 `triggered=True, decomposed_pcs=[], reasoning=error_msg`（對齊 PR#9 review 對 `_extract_socratic_insights` 錯誤隔離的建議） | 2.1, 3.1, 3.2 |
| 3.4 | `backend/app/routers/contradictions.py` 新增 `POST /contradictions/{cid}/decompose` | 包 try/except 回 502；error handling 風格對齊 `cld.py:19-24` | 3.3 |
| 3.5 | 單測 `backend/tests/test_decompose_tc.py` | Mock `call_llm_json` 回 3 個互異 PC → 斷言 response；mock 回重複 `derived_parameter` → 斷言拒絕；mock 回 LLM 例外 → 斷言不 crash | 3.3 |
| 3.6 | Router 整合測試（TestClient） | Happy path 200 + 失敗 502；validate `Response.triggered` 行為 | 3.4 |

---

## 4.0 資料庫：migration 與 Supabase 型別

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 4.1 | 新檔 `supabase/migrations/006_pc_decomposition.sql` | `ALTER TABLE contradictions ADD COLUMN parent_contradiction_id UUID REFERENCES contradictions(id) ON DELETE CASCADE, ADD COLUMN derived_parameter TEXT, ADD COLUMN subsystem_hint TEXT, ADD COLUMN separation_principle_id TEXT, ADD COLUMN separation_category TEXT, ADD COLUMN separation_rationale TEXT;`（`pc_attribute_a/not_a` 先用 grep 確認是否已存在） + `CREATE INDEX idx_contradictions_parent ON contradictions(parent_contradiction_id)` | — |
| 4.2 | `supabase db reset` 本地驗證 | `information_schema.columns` 可見新欄位；`EXPLAIN` 子查詢使用 index | 4.1 |
| 4.3 | 重新生成 `src/integrations/supabase/types.ts` | `contradictions.Row/Insert/Update` 含新欄位；或手動 patch 並加單測鎖定 | 4.1 |
| 4.4 | `src/types/explore.ts` `ExploreContradiction` 擴充 optional `parentContradictionId`, `derivedParameter`, `subsystemHint`, `separationPrincipleId`, `separationCategory`, `separationRationale` | 更新 adapter（位置待前端確認，推測在 `src/hooks/api/useExplore.ts`） | 4.3 |

---

## 5.0 前端：自動觸發與持久化

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 5.1 | 新增 API client `contradictionDecompose(cid, payload)` | 位於既有 API 層（`src/lib/api/contradictions.ts` 或同等）；型別從 `src/types/explore.ts` 引入 | 3.4, 4.4 |
| 5.2 | 在 `src/components/explore/ContradictionTab.tsx:200-298` AI re-identify 成功且 `type === 'TC'` 時串接自動呼叫 | 呼叫 `contradictionDecompose`；`triggered && decomposed_pcs.length > 0` 時進入 5.3 | 5.1 |
| 5.3 | 批次 Supabase INSERT 子 PC | 每個 `DecomposedPC` 寫一筆 `contradictions` 列；`parent_contradiction_id = 父 TC id`；`type = 'PC'`；帶齊分離原則 / derived_parameter 等欄位；使用既有 `queryKeys.contradictions` invalidate | 4.3, 5.2 |
| 5.4 | Toast 與錯誤處理 | 成功：`已自動深挖出 N 個物理矛盾`；失敗 / critic 判不需深挖：**安靜處理**不干擾 flow | 5.2 |
| 5.5 | 防重入：同一父 TC 已有 children 時不自動再跑 | 前端在呼叫前先查 `parent_contradiction_id = 父 id` 的子列數量；若 > 0 跳過 | 5.3 |

---

## 6.0 前端：巢狀卡片與分離原則 UI

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 6.1 | 修改 `ContradictionTab.tsx:514-537` 渲染層，建立 `Map<parentId, childPCs[]>` | 頂層只渲染 `parent_contradiction_id == null`；在 TC 卡片下方插 `<DecomposedPCList>` | 4.4 |
| 6.2 | 新組件 `<DecomposedPCCard>` | 縮排小卡；左側色條取自 `CATEGORY_COLOR[separation_category]`；顯示 `subsystem_hint` 標籤 + `derived_parameter` 標題 + `pc_attribute_a ⟷ pc_attribute_not_a` + 分離原則名稱（從 `SEPARATION_PRINCIPLES` 查 `name_zh`） + 可折疊 `rationale` | 1.2 |
| 6.3 | `confidence < 0.5` 顯示灰階 + 警示 icon | 提示 RD 驗證 | 6.2 |
| 6.4 | 子 PC 編輯 / 刪除重用既有 handler | 呼叫既有單列編輯 UI；刪除走既有 `deleteContradiction`（父刪時由 DB FK CASCADE 自動處理） | 6.1, 4.1 |

---

## 7.0 前端：父更新時 children stale 提示

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 7.1 | 監聽父 TC `improving_param` / `worsening_param` / `engineering_statement` 變更 | 若變更且 children 存在，將 children 標記為 `stale` (client-only state) | 6.1 |
| 7.2 | Stale 區塊顯示「父已更新，建議重新深挖」按鈕 | 點擊 = 手動呼叫 `contradictionDecompose` + 先刪舊 children（唯一允許手動觸發的入口） | 7.1, 5.1 |

---

## 8.0 測試、可觀測性、文件

| 任務 ID | 工作項 | 交付物 / 完成準則 | 依賴 |
|---------|--------|-------------------|------|
| 8.1 | 後端單測 2.3 / 3.5 / 3.6 整合入 CI | pytest 全綠 | 2–3.x |
| 8.2 | E2E 手測腳本 `docs/e2e/manual/explore_pc_decomposition.md` | 步驟：e-Bike brief (125Nm/2500g/111×92mm/60dBA) → AI 識別 → 自動產出 ≥2 個子 PC → 驗證分離原則涵蓋空間 + 條件混合 → 編輯 rationale 持久化 → 刪父驗 cascade | 5, 6 |
| 8.3 | 可觀測性：backend 日誌記錄 critic 決策與深挖結果 | 每次 `/decompose` 呼叫 log：`triggered`, `trigger_reason`, `len(decomposed_pcs)`, `LLM elapsed`；失敗時 log stack trace | 3.3 |
| 8.4 | 更新 `docs/e2e/TRIZ_Layered_DrillDown_Optimization.md` §Changelog | 備註 v1.x 新增「Explore 階段 L1 critic + 多 PC 深挖」；說明與 §6.7 `deepen_link` 的差異（多 derived_parameter） | 3.3 |
| 8.5 | Runbook：如何 rollback | migration rollback SQL + feature flag（若引入）的開關說明 | 4.1 |

---

## 依賴圖（關鍵路徑）

```
1.1 (backend 16 分類) ──┬─► 1.2 (frontend 16 分類) ──┐
                       │                            │
                       ├─► 2.1 critic ──► 2.2 LLM critic prompt ──► 2.3 test
                       │                                            │
                       ├─► 3.1 decomp prompt ──► 3.2 schemas ──► 3.3 agent ──► 3.4 router ──► 3.5/3.6 test
                       │                                                                      │
4.1 migration ──► 4.2 verify ──► 4.3 types ──► 4.4 explore types                               │
                                                                                               │
                5.1 api client ◄──────────────────────────────────────────────────────────────┤
                5.2 auto trigger ──► 5.3 batch insert ──► 5.4 toast ──► 5.5 dedup              │
                                                                        │                      │
6.1 grouping ──► 6.2 card ──► 6.3 confidence ──► 6.4 edit/delete ──────┴─► 7.1 stale ──► 7.2 re-decompose
                                                                                               │
8.1 ci ──► 8.2 e2e ──► 8.3 logs ──► 8.4 docs ──► 8.5 runbook ◄─────────────────────────────────┘
```

關鍵路徑：**1.1 → 3.1 → 3.2 → 3.3 → 3.4 → 4.1 → 4.3 → 5.1 → 5.2 → 5.3 → 6.1 → 6.2 → 8.2**

---

## 本版涵蓋 / 不涵蓋

| 涵蓋 | 不涵蓋（另開 WBS 或文件） |
|------|---------------------------|
| Explore 階段 L1 critic + TC→多 PC 自動深挖 | L3 (SF) 平行跑 + `LayeredTrizSolution` 聚合（見 `Forward_TRIZ_Solver_Architecture.md §7.0`） |
| 16 分離原則 backend / frontend 共用常數與 drift 防護 | `differential_analysis` 跨層推薦路線（見同檔 §7.5） |
| `contradictions` 表 `parent_contradiction_id` FK 與巢狀卡片 UI | TRIZ Solver `_solve_pc` 消費 `separation_category` 做 pre-filter（`triz_solver.py:103`） |
| 父 TC stale 提示與唯一手動重新深挖入口（7.2） | MUST 評估納入「PC 分解完整度」維度（見 `memory/project_must_evaluation_design.md`） |
| e-Bike 驗證腳本與 cascade 刪除行為 | 手動深挖按鈕（除 7.2 stale 情境外；使用者決策為全自動觸發） |

---

## 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| LLM 產出重複 `derived_parameter`（同義換字） | 子 PC 資訊冗餘 | 3.3 驗證層做去重；prompt 明確要求「不同物理變數 / 子系統 / 尺度」 |
| LLM 回 `separation_principle_id` 不在 16 清單 | 資料汙染 | 3.3 驗證層拒絕；記 log；回空 list 並在 reasoning 註記 |
| 兩次 LLM 呼叫（critic + decompose）latency 增加 | 使用者等待 | critic 規則層先跑；LLM critic 只在規則未觸發時；decompose 可 stream 或 toast 先顯示「深挖中…」 |
| 父 TC 被多人同時識別導致重複深挖 | 子 PC 重複 | 5.5 前端前置查詢；後端可加 advisory lock（後續迭代） |
| Migration 在 production 有歷史資料時衝突 | 部署失敗 | 新欄位皆 nullable；index 用 `CREATE INDEX IF NOT EXISTS` |

---

## 完成判準（Definition of Done）

- [ ] 所有 P0 / P1 任務包單測 + 整合測全綠
- [ ] e-Bike 驗證腳本 8.2 能在本地 Explore 頁產出 ≥3 個互異的子 PC（對應齒輪 / 外殼 / 熱傳等不同子系統）
- [ ] 每個子 PC 的 `separation_principle_id` 在 16 清單內且 `separation_category` 至少涵蓋 2 種
- [ ] 父 TC 刪除後子 PC 由 DB FK CASCADE 正確消失（無孤兒列）
- [ ] `docs/e2e/TRIZ_Layered_DrillDown_Optimization.md` Changelog 已更新
- [ ] PR #9 review 提出的「_extract_socratic_insights 錯誤隔離」建議已一併修復（analyst.py 整段包 try/except）

---

## 文件對照（快速索引）

| WBS 區段 | Forward_TRIZ_Solver_Architecture.md v1.1 | TRIZ_Layered_DrillDown_Optimization.md | TRIZ_Multi_Solution_Adoption_Strategy.md v1.1 |
|----------|-------------------------------------------|-----------------------------------------|----------------------------------------------|
| 1.x 共用常數 | §7.0 TC 上下文組裝 | §5 LayeredTrizSolution schema | §1.1 多分離原則同時適用 |
| 2.x L1 critic | §6.2 L2 觸發條件（645-660） | §4.2 觸發表 | — |
| 3.x 深挖 agent | §6.7 `deepen_link` 契約 | §4.3 deepen_link 契約、§7.3 e-bike 案例 | — |
| 4.x Migration | — | §5 schema FK 語意 | §4.2 Concept Route layered 欄位 |
| 5.x 前端自動觸發 | §7.0 `solve_triz_layered` 時序 | — | — |
| 6.x 巢狀卡片 UI | — | §5 視覺化規範 | — |
| 7.x Stale 重深挖 | — | §4.2 RD 手動觸發 | — |
| 8.x 測試 / 文件 | §10 Anti-Pattern | §6 文件修改指引、§11 驗證 | §6 Anti-Pattern |
