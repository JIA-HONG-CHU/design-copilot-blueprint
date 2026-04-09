# 三層樹 + 六維契約 Review Checklist（WBS 1.3）

> **對齊**：`Forward_Subsystem_Discovery_Architecture.md` §6.4 / §6.5
> **用途**：所有觸碰 `suggest_subsystems` prompt、`SubsystemHierarchyView`、`InterfaceContractsPanel` 或 `InterfaceContract` 型別的 PR，reviewer 需逐項勾選。
> **為什麼存在**：LLM 很容易把「層級」與「契約」搞混；缺乏清單會讓 regression 悄悄滑入。

---

## 樹階層（Level）

- [ ] 每一筆 `SuggestedSubsystem` 的 `level ∈ {system, module, component}`，拒絕其他值（ruff/pyright 或單測鎖定）
- [ ] **System** 只作為外層容器：一個 project 原則上 1–2 個 system 節點，不在 system 層掛 `interface_contracts`（若有，只能是跨 system 的整體耦合，且必須在 `reason` 欄明確說明）
- [ ] **Module** 是契約的主要棲地：`interface_contracts` **只在 module 層有意義且必須非空**（除非該 module 為孤立功能單元）
- [ ] **Component** 只描述機構零件，原則上不攜帶 `interface_contracts`；若有，必須是「零件 ↔ 外部標準件」的特例並在 `reason` 標註
- [ ] 手動新增表單（`src/pages/Create.tsx` 手動新增流程）強制使用者選擇 level，不可自由輸入
- [ ] 三層遞迴渲染在 `SubsystemHierarchyView.tsx` 三處 call site 都正確傳遞 `level` prop

## 六維契約鍵名（camelCase，不可漂移）

- [ ] 鍵名**必須全等**：`envelope, loadPath, thermalPath, signalPath, datumTolerance, serviceability`
- [ ] 不可加同義詞欄位（例：`heatPath`, `sensorPath`, `thermal_path`）— 如有需要先更新 `InterfaceContract` 型別 + Pydantic model + Python/TS 鏡射 + 本 checklist
- [ ] `src/types/generated/subsystem.ts` 的 `INTERFACE_CONTRACT_DIMS` 排序與 UI 折疊順序一致
- [ ] `backend/app/prompts/triz_solver.py` 的 `SUBSYSTEM_SUGGESTION` prompt 列出完整六維，且順序與 TS 側一致

## 對鄰居結構（Record<鄰居, SixDim>）

- [ ] `InterfaceContract` 以 **neighbour name 為 key** 的 map 形式，不是 list
- [ ] neighbour key **必須是另一個子系統的 `name`**；不允許用 id（id 是 DB primary key，會漂移）
- [ ] 空契約（六維全空 + 無 spatial）**必須 fail-loud**：`_find_empty_contracts` retry once → `IncompleteLLMResponseError` → HTTP 502
- [ ] 「↔」在 UI 上一律指向 neighbour，不要反向或省略

## Spatial 區塊

- [ ] `spatial` 是 `InterfaceContract` 的 **optional** 子欄位（不是 top-level）
- [ ] `reference_source` 必須以五個 canonical prefix 之一開頭：`rd_override:`, `learned:`, `web:`, `seed:`, `llm_estimate`（由 `test_reference_source_lint.py` 鎖定）
- [ ] `confidence ∈ {library, estimate, rd_confirmed}`；LLM **不得**自行產生 `rd_confirmed`（由 `test_reference_source_lint.py` 第 `test_prompt_mentions_llm_emittable_confidence_values` 鎖定）
- [ ] bbox `origin_mm` 預設 `(0.0, 0.0, 0.0)`；anchor 為可選字串
- [ ] Discovery 主面板用 slate 配色；Overlay 對話框用紅/橘/綠 — **絕對不混用**（WBS 8.4 決策，由 code review 人工把關）

## related_contradictions 貫穿

- [ ] 每個節點的 `related_contradictions` 是 **id 陣列**（不是 text）
- [ ] id 來源一律是 Tab ① TRIZ 的 contradiction id，不可由 UC1 憑空捏造
- [ ] 父 TC id 與子 PC id 可 **同時** 存在於同一節點（L2 WBS 9.5.2 交叉影響）
- [ ] 空 contradictions 輸入時每個節點的 `related_contradictions = []`，不可為 null

## 防止 LLM 漂移

- [ ] 修改 `SUBSYSTEM_SUGGESTION` prompt 後，至少執行一次 `suggest_subsystems` 驗證產出型別過 Pydantic validation
- [ ] 新增層級/鍵名前務必確認 `test_reference_source_lint.py` 與 `test_subsystem_contract.py` 都已更新
- [ ] 新增 `reference_source` prefix 前務必同步 5 處：`spatial_lookup.py`, `triz_solver.py` prompt, `ALLOWED_REFERENCE_SOURCE_PREFIXES`, `InterfaceContractsPanel.SpatialBlock`, `SpatialConfidenceBadge` legend

---

**最後一哩**：PR description 請附一句「本 PR 已對照 `docs/e2e/module/Three_Tier_Tree_Review_Checklist.md` 檢核」。

**修訂紀錄**
- 2026-04-09 v1.0：首版，對齊 WBS 1.3 與 test_reference_source_lint.py。
