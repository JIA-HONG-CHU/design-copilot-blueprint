# TC→Multi-PC Type Alignment Reference

> **版本**：1.0 | **日期**：2026-04-09
> **用途**：backend Pydantic ↔ frontend TypeScript 欄位對照表
> **源 WBS**：`docs/e2e/module/Explore_TC_to_MultiPC_Decomposition_WBS.md` §1.4
> **維護責任**：每次修改 `schemas.py` 或 `trizLayered.ts` 的相關 class，必須同步更新本表

---

## 命名慣例

- **Backend** (Pydantic v2): `snake_case` fields (e.g., `derived_parameter`)
- **Frontend** (TypeScript): `camelCase` fields (e.g., `derivedParameter`)
- **序列化邊界**: API 回應以 Pydantic snake_case JSON 傳出，前端在 adapter 層轉成 camelCase
- **例外**: `SeparationPrinciple.name_zh` ↔ `nameZh` / `SeparationPrinciple.physical_principle` ↔ `physicalPrinciple`
- **結構性差異**: 部分 class 在兩端並非 1:1（backend 較完整，frontend 只保留 UI 所需子集）。凡有差異都在下表「備註」欄標註 `*FE missing*` 或 `*BE only*`。

---

## 1. SeparationPrinciple

**Backend**: `backend/app/tools/separation_principles.py` (frozen dataclass, line 24)
**Frontend**: `src/lib/triz/separationPrinciples.ts` (interface, line 12)


| Backend (snake_case)  | Frontend (camelCase) | Type                                                                      | 用途                                     |
| --------------------- | -------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| id                    | id                   | `str` / `string`                                                          | Canonical id (e.g., `time.pre_action`) |
| category              | category             | `Literal["time","space","condition","whole_part"]` / `SeparationCategory` | 4 大類                                   |
| name_zh               | nameZh               | `str` / `string`                                                          | 中文策略名                                  |
| physical_principle    | physicalPrinciple    | `str` / `string`                                                          | 物理本質（第一性原理）                            |
| cross_domain_examples | crossDomainExamples  | `str` / `string`                                                          | 跨域範例                                   |


**權威來源**: `rd_assistant_design_system/triz_knowledge_base/04_separation_principles.md`
**Parity test**: `backend/tests/test_separation_principles_parity.py` + `src/lib/triz/__tests__/separationPrinciplesParity.test.ts`
**備註**: Backend 以 markdown 解析 + `_CANONICAL_IDS` 鎖順序；frontend 以 hard-coded `SEPARATION_PRINCIPLES` const 陣列維持同樣順序。兩端皆需為 16 項且 id 完全一致。

---

## 2. DecomposedPC

**Backend**: `backend/app/models/schemas.py:1356` (Pydantic)
**Frontend**: 尚未建立（未來任務；目前只在後端與 adapter 層使用）


| Backend                 | Frontend (預定)         | Type                                               | 備註                                                  |
| ----------------------- | --------------------- | -------------------------------------------------- | --------------------------------------------------- |
| derived_parameter       | derivedParameter      | `str` / `string`                                   | 同一物理屬性 P（例：齒輪模數）                                    |
| subsystem_hint          | subsystemHint         | `str` / `string`                                   | 所屬子系統（例：齒輪傳動）                                       |
| physical_contradiction  | physicalContradiction | `str` / `string`                                   | 完整 `X must A and must ¬A` 陳述                        |
| pc_attribute_a          | pcAttributeA          | `str` / `string`                                   | 屬性 A 濃縮詞                                            |
| pc_attribute_not_a      | pcAttributeNotA       | `str` / `string`                                   | 屬性 ¬A 濃縮詞                                           |
| separation_principle_id | separationPrincipleId | `str` / `string`                                   | 必在 16 項 canonical 內（backend 有 `field_validator` 檢查） |
| separation_category     | separationCategory    | `Literal["time","space","condition","whole_part"]` |                                                     |
| separation_rationale    | separationRationale   | `str` / `string`                                   | 為何此分離原則適用（1-2 句）                                    |
| confidence              | confidence            | `float` (ge=0, le=1, default=0.7) / `number`       | 0-1 信心值                                             |


**Backend 驗證**: `DecomposedPC.separation_principle_id` 以 `@field_validator` 呼叫 `get_separation_principle()` 確認 id 在 16 項 canonical 清單內，否則 `ValueError`。
**FK 關係**: 對應 DB `contradictions` 表（migration 009）的 8 個新欄位。

---

## 3. ContradictionDecomposeRequest / Response

### 3.1 ContradictionDecomposeRequest

**Backend**: `backend/app/models/schemas.py:1389`
**Frontend**: 尚未建立（未來任務）


| Backend                 | Frontend (預定)         | Type                                 | 備註                                                                                   |
| ----------------------- | --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| project_id              | projectId             | `str` / `string`                     |                                                                                      |
| parent_contradiction_id | parentContradictionId | `str` / `string`                     | 父 TC id                                                                              |
| engineering_statement   | engineeringStatement  | `str` / `string`                     |                                                                                      |
| improving_param         | improvingParam        | `int | None` / `number | null`       | TRIZ 1-39 參數                                                                         |
| worsening_param         | worseningParam        | `int | None` / `number | null`       | TRIZ 1-39 參數                                                                         |
| severity                | severity              | `str` (default `"minor"`) / `string` |                                                                                      |
| mission                 | mission               | `str` (default `""`) / `string`      |                                                                                      |
| constraints             | constraints           | `list[str]` / `string[]`             |                                                                                      |
| kpis                    | kpis                  | `list[str]` / `string[]`             |                                                                                      |
| socraticAnswers         | socraticAnswers       | `list[str]` / `string[]`             | **注意**：backend 欄位原生就寫成 `socraticAnswers`（非 `socratic_answers`），兩端已自然對齊，無需 adapter 轉換 |
| candidate_principles    | candidatePrinciples   | `list[int]` / `number[]`             | 預取的 TRIZ 1-40 候選（供 critic rule 2）                                                    |
| rd_manual               | rdManual              | `bool` / `boolean`                   | 強制重新分解                                                                               |


### 3.2 ContradictionDecomposeResponse

**Backend**: `backend/app/models/schemas.py:1407`


| Backend        | Frontend (預定) | Type                                    | 備註               |
| -------------- | ------------- | --------------------------------------- | ---------------- |
| triggered      | triggered     | `bool` / `boolean`                      | L1 critic 是否觸發深挖 |
| trigger_reason | triggerReason | `str` / `string`                        |                  |
| decomposed_pcs | decomposedPcs | `list[DecomposedPC]` / `DecomposedPC[]` |                  |
| reasoning      | reasoning     | `str` (default `""`) / `string`         | LLM 整體分解策略說明     |


---

## 4. LayeredTrizSolution 家族

> **重要**：此家族在 backend ↔ frontend 並非 1:1。Frontend 只保留 UI 需要的子集，且欄位命名經過 adapter 層的「邏輯映射」（不只是 snake→camel）。下列逐一列出差異。

### 4.1 LayeredTrizSolution

**Backend**: `backend/app/models/schemas.py:633`
**Frontend**: `src/types/trizLayered.ts:112`


| Backend                           | Frontend             | Type                                                                               | 備註                                                                                         |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| id                                | id                   | `str` / `string`                                                                   | e.g., `LTS-EBIKE-012`                                                                      |
| project_id                        | —                    | `str`                                                                              | *FE missing* — UI 由 router context 得知                                                      |
| contradiction_id                  | contradictionId      | `str` / `string`                                                                   | 父 TC contradiction id                                                                      |
| contradiction_natural_description | —                    | `str`                                                                              | *FE missing*                                                                               |
| severity                          | —                    | `Literal["fatal","major","minor","unknown"]`                                       | *FE missing*                                                                               |
| l1_surface                        | l1                   | `L1Surface`                                                                        | **欄位重命名**：adapter 將 `l1_surface` 攤平為 `l1`                                                  |
| l2_root_cause                     | l2                   | `L2RootCause | None` / `L2RootCause | null`                                        | **欄位重命名**：`l2_root_cause` → `l2`；條件觸發                                                      |
| l3_structural_check               | l3                   | `L3StructuralCheck` (backend **必填**) / `L3StructuralCheck | null` (frontend)       | **本版 adapter 永遠送 null**；backend 本身仍會計算但 UI 層以 l3Status 為準                                  |
| —                                 | l3Status             | `Literal["deferred_to_external_wbs","computed","skipped_by_critic"]`               | *BE missing* — 純 FE marker；**本版永遠 `"deferred_to_external_wbs"`**；下游必須檢查此欄位而非 `l3 === null` |
| —                                 | deepenLink           | `DeepenLink | null`                                                                | *BE missing* — adapter 從 `l2_root_cause.deepen_link` 抽出的捷徑指標                               |
| differential_analysis             | differentialAnalysis | `DifferentialAnalysis` (backend `default_factory`) / `DifferentialAnalysis | null` | 本版 FE adapter 多數情況送 null，待 L3 WBS 實作                                                       |
| phase_b_directive                 | —                    | `PhaseBDirective`                                                                  | *FE missing* — Phase B 掃描用                                                                 |
| —                                 | adoptedRoute         | `string | null`                                                                    | *BE missing* — Phase B 採納決定（FE 追蹤）                                                         |


### 4.2 L1Surface

**Backend**: `backend/app/models/schemas.py:531`
**Frontend**: `src/types/trizLayered.ts:64`


| Backend              | Frontend             | Type                                                              | 備註                                                       |
| -------------------- | -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| layer_role           | layerRole            | `Literal["phenomenon"]` / `"phenomenon"`                          | 固定值                                                      |
| type                 | type                 | `Literal["TC"]` / `"TC"`                                          | 固定值                                                      |
| improving_param      | improvingParam       | `int | None` / `number | null`                                    |                                                          |
| worsening_param      | worseningParam       | `int | None` / `number | null`                                    |                                                          |
| —                    | engineeringStatement | `string`                                                          | *BE missing* — FE 由 adapter 從 request/父 contradiction 補入 |
| candidate_principles | candidatePrinciples  | `list[int]` / `number[]`                                          | TRIZ 1-40 候選                                             |
| suggestions          | suggestions          | `list[TrizSuggestion]` / `Record<string, unknown>[]`              | FE 以 unknown dict 保留                                     |
| depth_indicator      | depthIndicator       | `Literal["trade-off 改良","根因突破","功能鏈缺陷修補"]` / `string`             | FE 弱化為 string                                            |
| evidence_level_floor | —                    | `Literal["E0".."E4"]`                                             | *FE missing*                                             |
| critic_trigger_l2    | —                    | `bool`                                                            | *FE missing* — WBS 4.1 critic 輸出                         |
| critic_reason        | —                    | `str`                                                             | *FE missing*                                             |
| critic_confidence    | —                    | `float`                                                           | *FE missing*                                             |
| status               | —                    | `Literal["ran","skipped_quick_mode","skipped_condition","error"]` | *FE missing*                                             |


### 4.3 L2RootCause

**Backend**: `backend/app/models/schemas.py:568`
**Frontend**: `src/types/trizLayered.ts:77`


| Backend                | Frontend                       | Type                                                 | 備註                                                                                                       |
| ---------------------- | ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| layer_role             | layerRole                      | `Literal["root_cause"]` / `"root_cause"`             |                                                                                                          |
| type                   | type                           | `Literal["PC"]` / `"PC"`                             |                                                                                                          |
| triggered              | —                              | `bool`                                               | *FE missing*                                                                                             |
| trigger_reason         | —                              | `str`                                                | *FE missing*                                                                                             |
| deepen_link (singular) | deepenLinks (**plural array**) | `DeepenLink | None` / `DeepenLink[]`                 | **結構差異**：backend 一個 L2 對應一個 DeepenLink；FE 以陣列保留擴充空間（adapter 在 backend=None 時送 `[]`，有值時送 `[deepen_link]`） |
| suggestions            | suggestions                    | `list[TrizSuggestion]` / `Record<string, unknown>[]` |                                                                                                          |
| depth_indicator        | —                              | `Literal[...]`                                       | *FE missing*                                                                                             |
| evidence_level_floor   | —                              | `Literal["E0".."E4"]`                                | *FE missing*                                                                                             |
| status                 | —                              | `Literal[...]`                                       | *FE missing*                                                                                             |


### 4.4 L3StructuralCheck

**本版延後**：所有欄位在 backend 存在（`backend/app/models/schemas.py:588`）但 adapter 永遠送 `l3 = null` + `l3Status = "deferred_to_external_wbs"`。L3 WBS 啟動後由 `_solve_sf_structural_check` 填入。

**Backend**: `backend/app/models/schemas.py:588`
**Frontend**: `src/types/trizLayered.ts:84`


| Backend                                | Frontend                      | Type                                               | 備註                                                                                                        |
| -------------------------------------- | ----------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| layer_role                             | layerRole                     | `Literal["structural_lens"]` / `"structural_lens"` |                                                                                                           |
| type                                   | type                          | `Literal["SF"]` / `"SF"`                           |                                                                                                           |
| su_field_model (nested `SuFieldModel`) | s1 / s2 / field / systemState | `SuFieldModel` / 四個攤平字串                            | **結構差異**：backend 使用 nested object `{S1, S2, F, state}`；FE 攤平為 `s1, s2, field, systemState`（adapter 在兩端轉換） |
| matched_standard_solutions             | matchedSolutions              | `list[str]` / `Record<string, unknown>[]`          | **型別差異**：backend 為字串陣列、FE 為 dict 陣列                                                                       |
| suggestions                            | —                             | `list[TrizSuggestion]`                             | *FE missing*（UI 僅從 L1/L2 採 suggestion）                                                                    |
| supports_l1                            | —                             | `str`                                              | *FE missing* — LLM bridge text (WBS 5.3)                                                                  |
| supports_l2                            | —                             | `str`                                              | *FE missing*                                                                                              |
| standalone_value                       | —                             | `str`                                              | *FE missing*                                                                                              |
| depth_indicator                        | —                             | `Literal[...]`                                     | *FE missing*                                                                                              |
| evidence_level_floor                   | —                             | `Literal["E0".."E4"]`                              | *FE missing*                                                                                              |
| status                                 | —                             | `Literal[...]`                                     | *FE missing*                                                                                              |


#### 4.4.1 SuFieldModel（backend-only nested）


| Backend | Type                                                                   | 備註          |
| ------- | ---------------------------------------------------------------------- | ----------- |
| S1      | `str`                                                                  | Substance 1 |
| S2      | `str`                                                                  | Substance 2 |
| F       | `str`                                                                  | Field       |
| state   | `Literal["incomplete","effective","harmful","insufficient","unknown"]` | 系統狀態        |


### 4.5 DeepenLink

**Backend**: `backend/app/models/schemas.py:554`
**Frontend**: `src/types/trizLayered.ts:54`


| Backend                    | Frontend                 | Type                                                        | 備註                                                   |
| -------------------------- | ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------- |
| from_layer                 | fromLayer                | `Literal["L1_surface"]` / `"L1_surface"`                    | 固定值                                                  |
| from_tc_pair               | fromTcPair               | `tuple[int | None, int | None]` / `[number, number] | null` | **型別差異**：backend tuple 允許個別 None；FE 整體 null 或完整 pair |
| derived_physical_parameter | derivedPhysicalParameter | `str` / `string`                                            | 即 DecomposedPC 的 `derived_parameter` 同義語             |
| contradiction_statement    | contradictionStatement   | `str` / `string`                                            | PC 完整陳述                                              |
| separation_type_candidates | separationTypeCandidates | `list[SeparationCandidate]` / `SeparationCandidate[]`       |                                                      |


### 4.6 SeparationCandidate

**Backend**: `backend/app/models/schemas.py:548`
**Frontend**: `src/types/trizLayered.ts:46`


| Backend    | Frontend   | Type                                                                      | 備註              |
| ---------- | ---------- | ------------------------------------------------------------------------- | --------------- |
| type       | type       | `Literal["time","space","condition","whole_part"]` / `SeparationCategory` | 兩端 Literal 來源同步 |
| rationale  | rationale  | `str` / `string`                                                          |                 |
| confidence | confidence | `float` / `number`                                                        | 0-1             |


### 4.7 DifferentialAnalysis（本版延後）

**Backend**: `backend/app/models/schemas.py:619`
**Frontend**: `src/types/trizLayered.ts:95`


| Backend                                | Frontend         | Type                     | 備註                                                                                  |
| -------------------------------------- | ---------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| l1_vs_l2 (`DifferentialPairAnalysis`)  | l1VsL2           | nested object / `string` | **結構差異**：backend 為 5 欄位 nested object；FE 為單一字串（摘要）                                  |
| l1_vs_l3 (`DifferentialPairAnalysis`)  | —                | nested object            | *FE missing*（因 L3 本版 defer）                                                         |
| l2_vs_l3 (`DifferentialPairAnalysis`)  | l2VsL3           | nested object / `string` | 同上結構差異                                                                              |
| recommended_route (`RecommendedRoute`) | recommendedRoute | nested object / `string` | **結構差異**：backend 有 `primary / fallback / adopted_layers / rationale` 四欄位；FE 壓縮為單一字串 |
| —                                      | fallbackRoute    | `string`                 | *BE missing* — 由 backend `recommended_route.fallback` 抽出                            |


#### 4.7.1 DifferentialPairAnalysis（backend-only nested）


| Backend           | Type  |
| ----------------- | ----- |
| on_solving_degree | `str` |
| on_effort         | `str` |
| on_risk           | `str` |
| orthogonality     | `str` |
| synergy           | `str` |


#### 4.7.2 RecommendedRoute（backend-only nested）


| Backend        | Type                            | 備註                        |
| -------------- | ------------------------------- | ------------------------- |
| primary        | `str`                           | e.g. `"L2 + L3 組合（突破路線）"` |
| fallback       | `str`                           | e.g. `"L1 單獨（快速路線）"`      |
| adopted_layers | `list[Literal["L1","L2","L3"]]` |                           |
| rationale      | `str`                           |                           |


### 4.8 PhaseBDirective（backend-only）

**Backend**: `backend/app/models/schemas.py:627`


| Backend                                 | Type                                          | 備註  |
| --------------------------------------- | --------------------------------------------- | --- |
| same_contradiction_intra_layer_conflict | `Literal["skip","check"]` (default `"skip"`)  |     |
| cross_contradiction_conflict            | `Literal["skip","check"]` (default `"check"`) |     |


---

## 5. 一致性檢查清單

修改任一 Pydantic 或 TS class 時，請執行以下檢查：

- 修改 backend `schemas.py` → 同步 `src/types/trizLayered.ts` 對應 interface
- 新增欄位 → 更新本對照表
- 新增欄位 → 前端 adapter (snake→camel 轉換處) 也要加入
- 修改 `separation_principles.py` → 同步 `separationPrinciples.ts`（parity test 會 fail）
- 修改 Literal 值（如 `separation_category`）→ 兩端 Literal 必須同步
- 新增必填欄位 → 評估對現有資料 / API 呼叫的破壞性
- 修改 `DecomposedPC` 時 → 確認 `separation_principle_id` validator 邏輯仍正確
- 任何 `LayeredTrizSolution` 家族的結構變動 → 確認 adapter 層（snake→camel + 欄位攤平/重命名）同步更新

---

## 6. 相關檔案索引


| 檔案                                                          | 類別                   | 主要導出                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/models/schemas.py`                             | Pydantic             | `LayeredTrizSolution`, `L1Surface`, `L2RootCause`, `L3StructuralCheck`, `DeepenLink`, `SeparationCandidate`, `DifferentialAnalysis`, `DifferentialPairAnalysis`, `RecommendedRoute`, `PhaseBDirective`, `SuFieldModel`, `DecomposedPC`, `ContradictionDecomposeRequest`, `ContradictionDecomposeResponse` |
| `backend/app/tools/separation_principles.py`                | dataclass            | `SeparationPrinciple`, `SEPARATION_PRINCIPLES`, `get_separation_principle`, `get_separation_principles_by_category`, `build_separation_principle_id_context`                                                                                                                                              |
| `src/types/trizLayered.ts`                                  | TS interface         | `LayeredTrizSolution`, `L1Surface`, `L2RootCause`, `L3StructuralCheck`, `DeepenLink`, `SeparationCandidate`, `DifferentialAnalysis`, `L3Status`                                                                                                                                                           |
| `src/lib/triz/separationPrinciples.ts`                      | TS const + interface | `SeparationPrinciple`, `SEPARATION_PRINCIPLES`, `SeparationCategory`, `CATEGORY_COLOR`, `CATEGORY_LABEL_ZH`, `getSeparationPrinciple`, `getSeparationPrinciplesByCategory`                                                                                                                                |
| `backend/tests/test_separation_principles_parity.py`        | pytest               | backend↔frontend id parity                                                                                                                                                                                                                                                                                |
| `src/lib/triz/__tests__/separationPrinciplesParity.test.ts` | vitest               | 同上                                                                                                                                                                                                                                                                                                        |


---

## 7. 已知結構性差異（需追蹤）

以下差異**不是 bug**，而是 backend 富模型 vs frontend UI-only 視圖的有意取捨。未來若 UI 需要這些欄位，必須同時擴充 FE interface **並** 更新 adapter：

1. **L1Surface**：`engineeringStatement` 是 FE-only（adapter 從 request 補入）；`critic_trigger_l2 / critic_reason / critic_confidence / evidence_level_floor / status` 是 BE-only。
2. **L2RootCause**：backend `deepen_link`（單數）vs frontend `deepenLinks`（複數陣列）。Adapter 需 wrap/unwrap。
3. **L3StructuralCheck**：backend `SuFieldModel` nested object vs frontend 攤平為 `s1/s2/field/systemState`；本版 frontend `l3` 永遠 `null`。
4. **DifferentialAnalysis**：backend 為三對 nested `DifferentialPairAnalysis` + `RecommendedRoute`；frontend 壓縮為 4 個字串（`l1VsL2 / l2VsL3 / recommendedRoute / fallbackRoute`），且遺失 `l1_vs_l3`（因 L3 defer）。
5. **LayeredTrizSolution**：
  - Backend-only: `project_id`, `contradiction_natural_description`, `severity`, `phase_b_directive`
  - Frontend-only: `l3Status`, `deepenLink`（L2 的 shortcut）, `adoptedRoute`
6. **DecomposedPC / ContradictionDecomposeRequest / ContradictionDecomposeResponse**：frontend TS 尚未建立（Wave 2 task 3.2 僅 backend）。未來任務需補。
7. **ContradictionDecomposeRequest.socraticAnswers**：backend 欄位名保留 camelCase（非 snake_case），與其他 backend 欄位不一致——需注意 adapter 層**不要**對這個欄位做 snake↔camel 轉換。

---

## 8. Changelog

- **2026-04-09 v1.0**：初版，涵蓋 Wave 1 + Wave 2 產出的所有型別（`SeparationPrinciple`、`DecomposedPC`、`ContradictionDecomposeRequest/Response`、`LayeredTrizSolution` 家族共 8 個 class）。標註所有 backend↔frontend 結構性差異。

