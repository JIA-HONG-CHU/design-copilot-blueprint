# RD Design Copilot｜BD × RD 合作提案

> **版本**：v1.0 ｜ **日期**：2026-04-08 ｜ **對象**：RD 工程主管 + 資深 RD 工程師（e-bike 產品線）
> **時長**：30–40 分鐘（25 頁 + Q&A）
> **核心訊息**：這不是另一個 ChatGPT，而是把 RD 的「隱性知識 / 隱性假設 / 隱性決策」變成可追溯、可審查、可重用資產的工程副駕。

---

## P1 ｜ 封面

**標題**
**RD Design Copilot**

**副標**
讓每一次設計決策，都比上次更接近真相

**Tagline**
Externalize · Trace · Audit

**會議資訊**

- BD × RD 合作提案
- 2026 Q2 ｜ e-Bike 產品線

---

## P2 ｜「你一定遇過」— RD 的七個真實痛點

> 資料來源：`docs/e2e/PRD_RD_Design_Copilot.md §3.3`


| #    | 痛點          | 現象                        |
| ---- | ----------- | ------------------------- |
| 🔒 1 | **經驗鎖定**    | 方案探索只有 1-2 條，跳不出熟悉架構      |
| 📚 2 | **腦內庫存有限**  | 跨域知識缺失，SCAMPER / TRIZ 答不出 |
| 👻 3 | **假設隱藏**    | 前提沒被翻出來，後期才發現，返工最貴        |
| 💥 4 | **風險後置**    | 拖到原型才爆炸，架構級返工 3-5 次/專案    |
| 🗃 5 | **決策不可追溯**  | 「為什麼選這個？」無人記得             |
| 🗣 6 | **溝通斷層**    | RD/PM/老闆各說各話，評審 3-4 hr/次  |
| 🕳 7 | **證據缺口不可見** | Gate Review 流於形式，沒人知道缺什麼  |


**⚙️ 共同根因** — 隱性 · 無追溯 · 無驗證 ｜ 流程缺基礎設施

---

## P3 ｜ 這些痛點的共同根因

### 三個核心問題

> **隱性  ×  無追溯  ×  無驗證**


| 問題                    | 說明                           |
| --------------------- | ---------------------------- |
| **隱性 (Implicit)**     | 假設 / 決策依據都在腦袋裡，沒有被寫下，無法被審查   |
| **無追溯 (Untraceable)** | 沒有 artifact、沒有版本，經驗無法累積、無法複用 |
| **無驗證 (Unverified)**  | LLM 的數字「在它的想像裡」，沒被算術或資料庫校驗   |


> ➜ **不是 RD 不努力，是流程本身缺一層「把隱性變顯性」的基礎設施**

---

## P4 ｜ 系統使命

> 引用 `docs/e2e/PRD_RD_Design_Copilot.md §1.1`

把 ——

- 「**未知**」 變成 **可追蹤的假設**
- 「**靈感**」 變成 **可審查的方案**
- 「**試錯**」 變成 **最小實驗**

並用數位線索連結所有設計工件與證據。

### 三個動詞

> **Externalize · Trace · Audit**
> 顯式化 · 追蹤化 · 審查化

---

## P5 ｜ 5 大產品目標 × 對應 KPI

> 資料來源：`PRD_RD_Design_Copilot.md §2`


| #      | 目標             | 對應痛點   | KPI 指標                       |
| ------ | -------------- | ------ | ---------------------------- |
| **O1** | 擴大可能性空間、破除路徑依賴 | 經驗鎖定   | 方案探索 ≥3 條（含 Anti-Anchor 非對標） |
| **O2** | 讓未知可見、可追蹤      | 假設隱藏   | 假設驗證覆蓋率 ≥80%                 |
| **O3** | 前置風險驗證、證據驅動決策  | 風險後置   | 返工 ≤2 次；證據缺口識別 ≥90%          |
| **O4** | 決策可審查、可複用      | 決策不可追溯 | 100% 追溯率（KT 記錄）              |
| **O5** | 跨層級溝通效率        | 溝通斷層   | 單次評審時間 ≤2 hr                 |


---

## P6 ｜ 架構全貌 — 5 層堆疊（C4 Model）

> 資料來源：`docs/e2e/AI_Agent_Architecture.md` + `Forward_Subsystem_Discovery_Architecture.md` §4-6

```
┌───────────────────────────────────────────────────┐
│  L1  UI 層                React SPA + 工作區視覺化   │
├───────────────────────────────────────────────────┤
│  L2  編排層 Orchestrator   Step 流轉 / Gate 判定    │
├───────────────────────────────────────────────────┤
│  L3  AI Agent 層           Analyst · TRIZ · Eval · Knowledge │
├───────────────────────────────────────────────────┤
│  L4  Tool / Service 層     TRIZ KB · Spatial Validator · MUST │
├───────────────────────────────────────────────────┤
│  L5  Data 層               Postgres · Vector DB · Seed JSON │
└───────────────────────────────────────────────────┘
```

**核心原則**

> 「**LLM 負責創造、純算術負責驗證、資料庫負責累積**」

---

## P7 ｜ 4 個 AI Agent 的角色


| Agent           | 核心職責                            | 輸入            | 輸出                                      |
| --------------- | ------------------------------- | ------------- | --------------------------------------- |
| **Analyst**     | 需求解構 · 蘇格拉底問答 · 矛盾掃描 · 假設質疑     | Brief         | Constraint / Contradiction / Assumption |
| **TRIZ Solver** | 三層求解 L1/L2/L3 · 子系統拆解 · SCAMPER | Contradiction | LayeredTrizSolution / Concept Route     |
| **Evaluator**   | MUST 規則驗證 · KT 決策 · Gate 判定     | Concept Route | Validation Passport / Decision Record   |
| **Knowledge**   | 企業 RAG · Web 搜尋 · 跨域類比          | Query         | Reference / Evidence                    |


---

## P8 ｜ 工具層 — 關鍵三件套

### 1. TRIZ 知識庫（5 份 Markdown）

- 39 工程參數
- 矛盾矩陣
- 40 發明原理
- 4 分離原則
- 76 標準解

### 2. MUST 規則引擎（6 條硬規則 M1–M6）

- M1 空間 · M2 成本
- M3 安全 · M4 解耦
- M5 供應 · M6 製造
- E0–E4 證據分級
- Gate 快篩輸出

### 3. 純算術驗證器（不呼叫 LLM）

- Spatial Discovery Validator
- Layered Spatial Resolver
- 跨 5 層真值查找
- Package Map 生成
- anchor / bbox 保護

> **關鍵**：LLM 產出的數字，一定會被真值覆寫

---

## P9 ｜ 10 種核心工件（Artifact）生命週期


| #   | Artifact                | 產生階段     | 說明                                                 |
| --- | ----------------------- | -------- | -------------------------------------------------- |
| 1   | **Constraint**          | Step 1   | 硬/軟目標 · 非目標 · KPI 門檻                               |
| 2   | **Contradiction**       | Step 2-3 | 自然語言 + TRIZ 正式化 + 矛盾分級                             |
| 3   | **Assumption**          | Step 2-4 | 假設內容 + 最壞後果 + 驗證計畫                                 |
| 4   | **Breakpoint**          | Step 3   | 因果迴路 + 可介入位置                                       |
| 5   | **Concept Route**       | Step 5-7 | 方案規格 · 機制 · 假設 · 風險                                |
| 6   | **Interface Contract**  | Step 5-6 | 6 維介面合約                                            |
| 7   | **Evidence Matrix**     | Step 6   | 關鍵假設 × 證據等級 × 缺口                                   |
| 8   | **Risk Register**       | Step 6   | 風險 · 等級 · 緩解 · Owner                               |
| 9   | **Validation Passport** | Step 5-6 | assumptions / weak_points / required_verifications |
| 10  | **Decision Record**     | Step 7   | KT WANT/AC + 決策根據 + 簽核                             |


---

## P10 ｜ 資料流與驗證封閉迴圈

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│LLM 產出 │ ──▶ │純算術   │ ──▶ │資料庫   │ ──▶ │下游     │
│結構化   │     │驗證     │     │持久化   │     │消費     │
│候選     │     │真值覆寫 │     │Artifact │     │SCAMPER /│
│         │     │幻覺     │     │累積     │     │Pre-CAD  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     ▲                                                │
     └────────── ↻ 回饋：更新 Assumption / Evidence ──┘
```

### 核心訊息

> ✦ **LLM 的數字一定會被真值覆寫，不再「拍腦袋」**
>
> 這是 RD 最在意的「可不可信」問題的正面回應

---

## P11 ｜ 模組關係圖（單張總圖）

```
                    ┌──────────────────┐
                    │  UI (React SPA)  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Orchestrator    │
                    └────────┬─────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
  ┌────▼────┐          ┌─────▼─────┐         ┌─────▼─────┐
  │Forward  │          │ Decision  │         │ Reverse   │
  │軌       │          │ Hub (5d)  │         │ 軌        │
  ├─────────┤          └───────────┘         ├───────────┤
  │Analyst  │                                │第一性原理 │
  │TRIZ L1-3│                                │跨域類比   │
  │Subsystem│                                │Validation │
  │SCAMPER  │                                │Passport   │
  └─────────┘                                │≥3 非對標  │
                                             └───────────┘
                             │
                    ┌────────▼─────────┐
                    │ Postgres +       │
                    │ Vector DB        │
                    └──────────────────┘
```

---

## P12 ｜ E2E 流程總覽 — 3 Phase × 8 Step

> 資料來源：`docs/e2e/RD_Design_Copilot_State_Machine.md` + `RD_Design_Copilot_整合流程.md`


| **Phase I 定義問題空間** | **Phase II 假設與發散**    | **Phase III 收斂與驗證** |
| ------------------ | --------------------- | ------------------- |
| Step 1 問題界定        | Step 4 假設 & 驗證規劃      | Step 6 設計審查         |
| Step 2 蘇格拉底問答      | Step 5 創造與調整          | Step 7 決策與行動        |
| Step 3 系統建模        | Step P Pre-CAD Review | Step 8 內化與傳達        |


**Gates**: `Gate 1 → 2 → 3 → 4 → P → C → 7 → 8` — 共 8 個檢查點

> 每一個 Gate 都是**可以否決的檢查點**，不是 rubber stamp

---

## P13 ｜ Phase I ｜ Brief → 問題界定 → 矛盾識別


| Step       | 名稱     | 內容                                                          |
| ---------- | ------ | ----------------------------------------------------------- |
| **Step 1** | 問題界定   | Constraint（硬/軟/非目標/KPI） 輸入：Brief + 客戶需求 輸出：Constraint 工件    |
| **Step 2** | 蘇格拉底問答 | Analyst Agent 連環提問 把「隱藏假設」翻出來 輸出：Contradiction + Assumption |
| **Step 3** | 系統建模   | 因果迴路圖 + TRIZ 正式化 找到可介入斷路點 輸出：Breakpoint                     |


### Gate 3 出口條件

> ✅ ≥1 因果迴路  ·  ≥3 斷路點  ·  ≥3 核心矛盾

---

## P14 ｜ Phase II ｜ 探索 · Subsystem Discovery

> 資料來源：`docs/e2e/Forward_Subsystem_Discovery_Architecture.md`

### 三層拆解


| 層級            | 範圍   | 範例                              |
| ------------- | ---- | ------------------------------- |
| **System**    | 整車層級 | Mission · KPI · Package         |
| **Module**    | 模組層級 | 動力 · 傳動 · 控制 · 結構               |
| **Component** | 零件層級 | Motor · Battery · BMS · Frame … |


### 6 維介面合約


| 維度  | 項目             |
| --- | -------------- |
| 📐  | 尺寸 (Geometry)  |
| ⚙️  | 功能 (Function)  |
| 🔥  | 熱 (Thermal)    |
| 📳  | 振動 (Vibration) |
| 🎛  | 控制 (Control)   |
| 💰  | 成本 (Cost)      |


> ✦ **Spatial Validator 純算術驗證** — 防 LLM 幻覺，真值覆寫

---

## P15 ｜ Phase II ｜ 正向分析 · Forward TRIZ Solver

> 資料來源：`Forward_TRIZ_Solver_Architecture.md` + `TRIZ_Layered_DrillDown_Optimization.md §4.2`

### TRIZ 三層 Drill-Down


| 層      | 名稱         | 是否必跑   | 工具                   | 意義     |
| ------ | ---------- | ------ | -------------------- | ------ |
| **L1** | **TC** 現象層 | ✅ 必跑   | 39 參數 + 矛盾矩陣 + 40 原理 | 快掃表象衝突 |
| **L2** | **PC** 本質層 | ⛔ 有條件  | 4 分離原則（時/空/條件/整體）    | 深挖物理兩難 |
| **L3** | **SF** 結構層 | ✅ 平行必跑 | 76 標準解 + Su-Field 模型 | 結構旁路檢查 |


### 🔥 關鍵澄清

> **TC / PC / SF 不是互斥分類，而是同一矛盾的三層視角**
> （新架構 vs 舊 v10 的最大修正）

### L2 觸發條件

- L1 全是折衷 (trade-off)
- L1 principle hits ≤ 2
- 矛盾 severity ≥ major
- RD 手動點擊「深挖」

**輸出工件**：`LayeredTrizSolution`（可選採納深度）

---

## P16 ｜ Phase II ｜ 反向分析 · Anti-Anchor Sprint

> 資料來源：`docs/e2e/Reverse_Anti_Anchor_Architecture.md §1.2`

### What is Anti-Anchor?

> 「從第一性原理出發、強制跨領域類比、自我標記假設強度」的**非典型架構產生器**
>
> —— 讓 RD 進入正向分析前，被強制暴露於「物理上可走的其他路徑」

### 為什麼需要？

- **RD 路徑依賴**：無意識從主流架構微調
- **LLM 路徑依賴**：把訓練資料常見品重新包裝
- **傳統 TRIZ 限制**：只產出「更好的舊架構」，不是「新架構」

### 三個核心約束


| #     | 約束        | 說明                                                                                                   |
| ----- | --------- | ---------------------------------------------------------------------------------------------------- |
| **1** | 物理不相容     | ≥1 條路線必須與竞品物理路徑不相容                                                                                   |
| **2** | 自我誠實      | 每條路線附 **Validation Passport**（assumptions / weak_points / required_verifications / confidence_level） |
| **3** | Schema 共用 | 輸出可直接晉升正向候選池                                                                                         |


---

## P17 ｜ 正反向匯流 — Step 5d Decision Hub

### 雙軌合流

```
   Forward 軌                              Reverse 軌
 ┌──────────────┐                      ┌──────────────┐
 │• TRIZ L1/L2/3│                      │• Anti-Anchor │
 │• Subsystem   │ ──▶  Decision Hub ◀── │• 第一性原理 │
 │  Discovery   │       (Step 5d)      │• 跨域類比    │
 │• SCAMPER     │        候選池        │              │
 └──────────────┘                      └──────────────┘
```

### 下游流程

`Phase B 矛盾掃描` → `MUST 快篩 (E0-E1)` → `Pre-CAD Review` → **保留 3-5 條最優路線**

---

## P18 ｜ Phase III ｜ 收斂與證據


| Step        | 名稱              | 內容                                                   |
| ----------- | --------------- | ---------------------------------------------------- |
| **Step 6**  | 設計審查 (CAD Gate) | Evidence Matrix + Risk Register + MVP CAD → Gate C   |
| **Step 6e** | 證據補齊（迴圈）        | 最小實驗設計 · 證據等級升級 (E0→E4)                              |
| **Step 7**  | 決策與行動           | KT Decision Analysis → Decision Record（**100% 可追溯**） |
| **Step 8**  | 內化與傳達           | Asset 知識回寫 → 下一個專案冷啟動 Seed                           |


---

## P19 ｜ 最終產出物 — RD 會拿到什麼？

### 三大核心報告

#### 📘 MUST Rulebook

> 6 條硬規則 M1-M6

- M1 空間 / M2 成本
- M3 安全 / M4 解耦
- M5 供應 / M6 製造
- E0-E4 證據分級

#### 📊 Evidence Matrix × Risk Register

> 假設 × 證據 × 風險

- 關鍵假設清單
- 證據等級 E0-E4
- Top-10 風險
- 緩解措施 + Owner

#### 🔍 Pre-CAD Review

> 5 維評分 + 3-5 條路線

- Spatial / Thermal
- Cost / Manufacturability
- Risk Score
- 下一步 MVP CAD 範圍

### 配套工件

> ＋ Validation Passport × N  ·  Decision Record (KT)  ·  Interface Contract (6 維)

---

## P20 ｜ 這不是另一個 ChatGPT


| 維度        | ChatGPT / Gemini | **RD Design Copilot**                 |
| --------- | ---------------- | ------------------------------------- |
| **知識來源**  | 網路雜訊             | 企業 RAG + TRIZ KB + 種子資料               |
| **數字可信度** | LLM 幻覺           | 純算術驗證 + 資料庫覆寫                         |
| **流程結構**  | 無狀態對話            | 8 Step × 8 Gate 狀態機                   |
| **假設管理**  | 隱性               | Validation Passport + Evidence Matrix |
| **決策追溯**  | 無                | KT Decision Record                    |
| **反偏誤**   | 無                | Anti-Anchor + 矛盾收斂掃描                  |
| **產出可審查** | 段落文字             | 結構化工件 + Gate 判定                       |


---

## P21 ｜ 自動化分級 — RD 永遠是最終決策者


| 分級              | 說明            | 對應 Step                           |
| --------------- | ------------- | --------------------------------- |
| **Human-Led**   | RD 決策，AI 記錄   | Step 7                            |
| **AI-Assisted** | RD 主導，AI 協助   | Step 1 · 4 · 6 · 6e               |
| **AI-Driven**   | AI 主導，RD 審核   | Step 2 · 3 · 5b · 5d · 5e · P · 6 |
| **Fully Auto**  | AI 獨立產出，RD 選擇 | Step 5-0 · 5a · 5c · 8            |


### 核心訊息

> ✦ **RD 永遠是最終決策者**，AI 負責消除重複腦力勞動與盲點

---

## P22 ｜ 對 RD 的具體收益（量化）


| 指標            | Before | After           |
| ------------- | ------ | --------------- |
| ⏱ **方案探索時間**  | 2 天    | **0.5 天**       |
| 🔁 **架構級返工**  | 3-5 次  | **≤2 次**        |
| ✅ **假設驗證覆蓋**  | <30%   | **≥80%**        |
| 🗃 **決策追溯率**  | ~0%    | **100%**        |
| 💬 **單次設計評審** | 3-4 hr | **≤2 hr**       |
| 🧠 **經驗資產化**  | 個人腦袋   | **團隊 artifact** |


---

## P23 ｜ 我們需要 RD 提供什麼

> 引用 `docs/raw/簡報內容.md` 第 5 點「客人需要 commit 的資料」


| #     | 項目             | 說明                             |
| ----- | -------------- | ------------------------------ |
| **1** | Brief 與約束      | 硬目標 / 軟目標 / 非目標 / KPI 門檻       |
| **2** | 歷史設計 Artifact  | 舊專案的矛盾、假設、決策 → 冷啟動 Seed        |
| **3** | 關鍵零件真值         | datasheet、尺寸、熱/電參數 → 覆寫 LLM 幻覺 |
| **4** | 2-3 位 RD 工程師   | 擔任 Design Partner，參與 Gate 審核迭代 |
| **5** | 1-2 個 Pilot 專案 | 建議選「中風險」專案作為試點                 |


---

## P24 ｜ 我們提供什麼 & 時程

### 6 個月分 3 階段，每階段可獨立驗收

#### 🚀 Phase A ｜ Month 1-2

- TRIZ KB + Forward 軌 MVP
- 跑通 Step 1-3
- 第一次 Gate Review

#### 🧭 Phase B ｜ Month 3-4

- Reverse Anti-Anchor
- Decision Hub (5d)
- Pre-CAD Review

#### 📦 Phase C ｜ Month 5-6

- Evidence Matrix + Pre-CAD
- 知識回寫
- Pilot 專案結案

### Future Extension

> 設計審查自動化  ·  製造可行性評估  ·  Simulation 介接  ·  企業知識資產沉澱

---

## P25 ｜ 封底 — 三個動詞，一個承諾

# Externalize

# Trace

# Audit

> 讓你的每一個設計決策，都成為下一次設計的加速器。

### Call to Action

> ➜ **下週啟動 Kick-off  ·  挑 1 個 pilot 專案  ·  6 週內看到可驗證成果**

---

## 附錄 A ｜ 關鍵檔案對照表


| PPT 章節          | 主要依據檔案                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| 痛點 P2-3         | `docs/e2e/PRD_RD_Design_Copilot.md §3.3`                                                                          |
| 使命 P4           | `docs/e2e/PRD_RD_Design_Copilot.md §1.1`                                                                          |
| 目標 KPI P5       | `docs/e2e/PRD_RD_Design_Copilot.md §2`                                                                            |
| 架構 P6-11        | `docs/e2e/AI_Agent_Architecture.md` + `Forward_Subsystem_Discovery_Architecture.md` §4-6                          |
| 流程 P12-18       | `docs/e2e/RD_Design_Copilot_State_Machine.md` + `RD_Design_Copilot_整合流程.md`                                       |
| 正向 TRIZ P15     | `docs/e2e/Forward_TRIZ_Solver_Architecture.md` + `TRIZ_Layered_DrillDown_Optimization.md §4.2`                    |
| Anti-Anchor P16 | `docs/e2e/Reverse_Anti_Anchor_Architecture.md §1.2`                                                               |
| 產出物 P19         | `docs/e2e/MUST_Rulebook_Template.md` + `Evidence_Matrix_Risk_Register_Template.md` + `Pre_CAD_Review_Template.md` |
| 差異化 P20         | `docs/raw/簡報內容.md` 第 3 點                                                                                          |
| 合作提案 P23-24     | `docs/raw/簡報內容.md` 第 5-6 點                                                                                        |


---

## 附錄 B ｜ 說服 RD 的 3 個心理學 Hook（BD 備忘）

1. **共鳴先行**：P2-P3 必須讓 RD 點頭說「對，我真的遇過」，不可跳過
2. **主權確認**：P21 反覆強調「AI 不取代 RD、RD 是最終決策者」，打消「被 AI 替代」焦慮
3. **可信數字**：P10「純算術驗證 + 資料庫覆寫」要講三次，這是 RD 最懷疑 LLM 的點，正面回應

