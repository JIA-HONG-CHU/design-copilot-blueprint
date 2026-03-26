# 雙軌分析 → 候選方案決策中心：設計概念與流程圖

> **v7 (2026-03-26)**：產出與選擇分離 — TRIZ 三路徑不再同時收斂。
> - **根因修正**：v6 的收斂迴圈無限迴圈，因 TC/PC/SF 是三種不同的問題表述方式，對同一矛盾天生互斥。同時送進 Phase B 收斂掃描 = 永遠衝突。
> - **核心原則**：TRIZ 步驟只負責「產出候選」（Phase A），路徑選擇與交叉檢查（Phase B）延後到「候選方案決策中心」由 RD 挑選後才執行。
> - **Phase A**：矛盾空間健康度（不涉及解法）→ TRIZ / 子系統 / SCAMPER 步驟使用
> - **Phase B**：方案交叉檢查（只檢查被 RD 採用的解法）→ 決策中心使用
> - 新增 Phase B 檢查項：同一矛盾多路徑風險（TC+PC+SF 同時 adopt → major 風險）

---

## 0. 第一性原理：為什麼三路徑不能同時收斂

### TRIZ 三路徑的本質

| 路徑 | 問題表述 | 解法方向 |
|------|----------|----------|
| **TC** | 改善 A 會惡化 B | 40 原理打破 trade-off |
| **PC** | 同一參數需要同時是 X 和 ¬X | 時間/空間/條件分離 |
| **SF** | 物場交互不完整或有害 | 修改物質-場模型 |

**這三者不是「三個工人做同一件事」，而是「三個醫生對同一個病人提出完全不同的治療方案」。**

```
❌ 之前（v6）：
矛盾 C1 → TC解 + PC解 + SF解 → 全部送進 Phase B
→ TC解和PC解衝突 → 二次矛盾 → re-scan → 又衝突 → ∞

✅ 現在（v7）：
矛盾 C1 → TC解 + PC解 + SF解 → 全部 pending（不做 Phase B）
→ 決策中心：RD 選 C1 用 TC解
→ Phase B 只收 [C1-TC, C2-PC, C3-SF]（每矛盾一條）
→ 檢查跨矛盾衝突（合理的檢查）→ 正常收斂
```

---

## 1. 主流程總覽

**設計哲學**：Phase 2 是 **雙軌產出 → 人類選擇 → 交叉檢查 → 統一評估**。

```mermaid
flowchart TB
    subgraph Phase2["Phase 2: 雙軌分析 → 匯流決策"]
        direction TB

        subgraph REVERSE["反向路徑 — 打破框架"]
            direction TB
            R1["R1: Anti-Anchor Sprint<br/>AI 非典型架構探索<br/>Output: AntiAnchorRoute[] ≥3<br/>+ Validation Passport"]
            R2["R2: TRIZ 解矛盾<br/>三路徑產出候選（全部 pending）<br/>Phase A: 矛盾健康度"]
            R3["R3: 子系統定義<br/>受矛盾影響的子系統"]
            R4["R4: SCAMPER 變形<br/>7 創意行動 × 子系統"]
            RP["反向路徑候選池<br/>TC候選 + PC候選 + SF候選<br/>+ SCAMPER候選 + AA晉升"]
            R1 --> R2 --> R3 --> R4 --> RP
        end

        subgraph FORWARD["正向路徑 — 系統化解矛盾"]
            direction TB
            F1["F1: TRIZ 解矛盾<br/>三路徑產出候選（全部 pending）<br/>Phase A: 矛盾健康度"]
            F2["F2: 子系統定義<br/>受矛盾影響的子系統"]
            F3["F3: SCAMPER 變形<br/>7 創意行動 × 子系統"]
            FP["正向路徑候選池<br/>TC候選 + PC候選 + SF候選<br/>+ SCAMPER候選"]
            F1 --> F2 --> F3 --> FP
        end

        subgraph HUB["候選方案決策中心"]
            direction TB
            SELECT["RD 挑選：每矛盾選一條路徑<br/>⚠ 同矛盾 adopt 多條 → 警告"]
            PHASE_B["Phase B 收斂掃描<br/>只檢查被選方案之間的跨矛盾衝突<br/>+ 同矛盾多路徑風險檢查"]
            COMPARE["橫向比較<br/>來源 / 機制 / 假設 / 驗證需求 / 信心"]
            SELECT --> PHASE_B --> COMPARE
        end

        RP --> SELECT
        FP --> SELECT

        MUST["MUST 快篩 (M1-M6)<br/>pass | fail | marginal"]
        PRECAD["Pre-CAD 審查 (5維)<br/>must / decoupling / testability /<br/>failureMech / mvpCadEffort"]
        COMPARE --> MUST --> PRECAD
    end

    GATE["Phase Gate 2<br/>≥1 alternative overallPass"]
    PRECAD --> GATE

    style REVERSE fill:#FEF3C7,stroke:#F59E0B
    style FORWARD fill:#DBEAFE,stroke:#3B82F6
    style HUB fill:#F3E8FF,stroke:#8B5CF6
    style GATE fill:#F0FDF4,stroke:#22C55E
```

### 設計決策說明

| 決策 | 說明 |
|------|------|
| **產出與選擇分離** | TRIZ 步驟只產出候選（Phase A），路徑選擇在決策中心（Phase B） |
| Phase A = 矛盾健康度 | TRIZ/子系統/SCAMPER 步驟呼叫 `startPhaseA()`，不涉及解法交叉 |
| Phase B = 方案交叉檢查 | 決策中心 RD 挑選後手動觸發 `startPhaseB()`，只送 adopted 解法 |
| 同矛盾多路徑警告 | Phase B prompt 新增：同一矛盾的 TC+PC+SF 同時 adopt → major 風險 |
| 無自動 A→B 轉換 | 移除 `useEffect` 自動偵測 — Phase B 完全由人類決定何時執行 |

---

## 2. TRIZ 狀態機（含轉換守衛）

**設計意圖**：每條 TRIZ 解法有獨立的生命週期。`edited` 狀態保留「人類修正 AI 建議」的追溯性，因此禁止從 `edited` 退回 `pending`。

```mermaid
stateDiagram-v2
    [*] --> pending

    state "TrizActionStatus 狀態機" as FSM {
        pending --> adopted: 採用
        pending --> skipped: 跳過
        pending --> edited: RD 修改文字後確認

        adopted --> pending: 反悔
        adopted --> skipped: 改為跳過

        skipped --> pending: 重新考慮

        edited --> adopted: 確認修改版
        edited --> skipped: 放棄修改版
    }

    note right of FSM
        守衛規則:
        edited → pending 禁止
        (保留人類編輯追溯性)
    end note
```

### 合法轉換矩陣

| from ＼ to | pending | adopted | skipped | edited |
|-----------|---------|---------|---------|--------|
| **pending** | - | V | V | V |
| **adopted** | V | - | V | - |
| **skipped** | V | - | - | - |
| **edited** | **X** | V | V | - |

---

## 3. 收斂迴圈：Phase A / Phase B 分離

### Phase A：矛盾空間健康度（TRIZ 步驟使用）

```mermaid
flowchart TB
    subgraph PHASE_A["Phase A — startPhaseA()"]
        direction TB
        A_START["TRIZ 步驟觸發"]
        A_BUILD["buildInitialGraph()<br/>從 Contradiction[] 建構 DAG"]
        A_SCAN["POST /convergence/scan<br/>phase: A<br/>只送 contradictions，不送 alternatives"]
        A_RESULT["矛盾空間健康度<br/>交互衝突 / 循環依賴 / 覆蓋盲區"]
        A_DONE["converged / halted<br/>→ 停止，不自動觸發 Phase B"]
        A_START --> A_BUILD --> A_SCAN --> A_RESULT --> A_DONE
    end

    style PHASE_A fill:#FEF3C7,stroke:#F59E0B
```

### Phase B：方案交叉檢查（決策中心使用）

```mermaid
flowchart TB
    subgraph PHASE_B["Phase B — startPhaseB()"]
        direction TB
        B_START["決策中心：RD 按「執行收斂掃描」"]
        B_COLLECT["收集 adopted alternatives<br/>（RD 已挑選的解法）"]
        B_SCAN["POST /convergence/scan<br/>phase: B<br/>送 contradictions + adopted alternatives"]
        B_CHECK["檢查項：<br/>1. 跨矛盾解法衝突<br/>2. 參數影響分析<br/>3. PC 狀態衝突<br/>4. 跨方案干涉<br/>5. ⚠ 同矛盾多路徑風險"]
        B_RESULT["converged → 進入 MUST<br/>halted → 人類審核調整方案"]
        B_START --> B_COLLECT --> B_SCAN --> B_CHECK --> B_RESULT
    end

    style PHASE_B fill:#F3E8FF,stroke:#8B5CF6
```

### 收斂判定邏輯

```
converged = iteration > 0
    AND allResolved (fatal + major 全部 resolved)
    AND (confidence >= 80 OR noNewBlocking)

halted = forcePause
    OR health = critical / circular
    OR (noNewInfo AND hasUnresolvedBlocking)
    → 觸發人類審核
```

### 人為介入點

| 動作 | 方法 | 效果 |
|------|------|------|
| 強制停止 | `forceHalt()` | 立即取消 timer + abort flag，status → halted |
| 強制繼續 | `forceContinue()` | health 降級為 warning，排程下一輪 scan |
| 重試分支 | `retryBranch(id)` | 該分支 status → exploring，排程下一輪 |
| 注入新矛盾 | `addContradiction()` | 加入 graph，若 fatal/major 自動觸發 re-scan |
| 覆寫 severity | `confirmSeverity()` | 手動修正 AI 判定的 severity |
| 重新執行 | `startPhaseA()` / `startPhaseB()` | generation counter 防舊回呼污染 |

---

## 4. 資料流向

```mermaid
flowchart TB
    subgraph DUAL_TRACK["雙軌資料流"]
        direction TB

        subgraph REV_DATA["反向路徑資料"]
            AA["AntiAnchorRoute[]<br/>mechanism / cross_domain_source<br/>validation_passport"]
            R_EC["Anti-Anchor 引入的矛盾"]
            R_TS["反向 TrizSolution[]<br/>TC候選 + PC候選 + SF候選<br/>全部 pending"]
            R_SS["反向 Subsystem[]"]
            R_SV["反向 ScamperVariant[]"]
            R_POOL["反向候選池"]
            AA --> R_EC -->|"1:N 求解"| R_TS
            R_TS -->|"矛盾親和性"| R_SS
            R_SS -->|"FK"| R_SV -->|"整合"| R_POOL
            AA -.->|"晉升為方案"| R_POOL
        end

        subgraph FWD_DATA["正向路徑資料"]
            F_EC["CLD Contradiction[]<br/>(from Phase 1 Explore)"]
            F_TS["正向 TrizSolution[]<br/>TC候選 + PC候選 + SF候選<br/>全部 pending"]
            F_SS["正向 Subsystem[]"]
            F_SV["正向 ScamperVariant[]"]
            F_POOL["正向候選池"]
            F_EC -->|"1:N 求解"| F_TS
            F_TS -->|"矛盾親和性"| F_SS
            F_SS -->|"FK"| F_SV -->|"整合"| F_POOL
        end

        subgraph HUB_DATA["候選方案決策中心"]
            SELECT_DATA["RD 挑選<br/>每矛盾選一條路徑"]
            PHASE_B_DATA["Phase B 收斂掃描<br/>只送 adopted alternatives"]
            ADOPTED["被選方案集<br/>Alternative[]"]
            SELECT_DATA --> PHASE_B_DATA --> ADOPTED
        end
        R_POOL --> SELECT_DATA
        F_POOL --> SELECT_DATA

        EVAL["統一評估<br/>mustScores: Record M1-M6<br/>preCadScores: 5維<br/>overallPass: boolean"]
        ADOPTED --> EVAL
    end

    style REV_DATA fill:#FEF3C7,stroke:#F59E0B
    style FWD_DATA fill:#DBEAFE,stroke:#3B82F6
    style HUB_DATA fill:#F3E8FF,stroke:#8B5CF6
```

---

## 5. SCAMPER 定位：創意發散工具（不回饋收斂迴圈）

**設計意圖**：SCAMPER 與 Anti-Anchor 同屬**創意發散工具**。潛在風險以標註方式顯示，不自動觸發 re-scan。所有產出直接進入候選方案池，在決策中心由 RD 統一評估。

```mermaid
flowchart TB
    A["SCAMPER Variant 採用"] --> B{"AI 標註潛在風險?"}
    B -->|"否"| C["直接進入候選池"]
    B -->|"是"| D["風險標註<br/>（severity badge + 描述）<br/>供決策中心參考"]
    D --> C
    C --> E["候選方案決策中心<br/>統一做 Phase B 交叉檢查"]

    style A fill:#D1FAE5,stroke:#10B981
    style D fill:#FEF3C7,stroke:#F59E0B
    style E fill:#F3E8FF,stroke:#8B5CF6
```

**與 v6/v7 的差異**：
| | v6/v7（舊） | v8（現在） |
|---|---|---|
| newContradictions | fatal/major → 自動 addContradiction + Phase A re-scan | 顯示為風險標註，不觸發 re-scan |
| 確認流程 | 有未回饋矛盾 → 警告阻擋 | 無阻擋，所有風險在決策中心統一處理 |
| 定位 | 分析工具（產出需要收斂驗證） | **創意工具**（產出直接進池，與 Anti-Anchor 同級） |

---

## 6. 候選方案追溯六要素

每個進入決策中心的方案必須攜帶：

| # | 要素 | 欄位 | 說明 |
|---|------|------|------|
| 1 | 來源路徑 | `track: 'reverse' \| 'forward'` | 從哪條分析鏈來 |
| 2 | 來源步驟 | `source: triz_tc \| triz_pc \| triz_sf \| scamper \| anti_anchor` | 具體產出步驟 |
| 3 | 解的矛盾 | `contradiction_ids: string[]` | 追溯至原始矛盾 |
| 4 | 涉及子系統 | `subsystem_ids: string[]` | 影響範圍 |
| 5 | 基於假設 | `validation_passport.assumptions[]` | 方案成立的前提 |
| 6 | 缺少驗證 | `validation_passport.required_verifications[]` | 還需要什麼實驗 |

---

## 7. 完整狀態轉換表

| 階段 | 輸入 | 處理 | 輸出 | 連鎖效果 |
|------|------|------|------|----------|
| Anti-Anchor 生成 | mission + constraints | AI 產出非典型架構 | `AntiAnchorRoute[].length ≥ 3` | 可晉升為反向路徑方案 |
| TRIZ 產出候選 | 路徑矛盾集 | 三路徑並行生成解法 | `TrizSolution[]` 全部 `pending` | 不做 Phase B |
| Phase A 掃描 | `startPhaseA()` | 矛盾空間健康度 | converged / halted | 不觸發 Phase B |
| 子系統定義 | TRIZ 矛盾親和性 | RD/AI 定義 + 確認 | `Subsystem[confirmed]` | 解鎖 SCAMPER |
| SCAMPER 展開 | 已確認子系統 | 7 行動 × N 子系統 | `ScamperVariant[adopted]` | — |
| SCAMPER 新矛盾 | `newContradictions[]` | `addContradiction()` 注入 Phase A | fatal/major → Phase A re-scan | 路徑內閉環 |
| **決策中心選擇** | 所有候選池 | **RD 挑選每矛盾一條路徑** | adopted Alternative[] | — |
| **Phase B 掃描** | `startPhaseB()` | **跨矛盾衝突 + 同矛盾多路徑風險** | converged / halted | 人類審核 |
| MUST 篩選 | adopted Alternative + M1-M6 | AI + RD 評分 | pass / fail / marginal | 淘汰不可行方案 |
| Pre-CAD 審查 | 通過 MUST 的方案 | 五維評分 | overallPass | Phase Gate 2 判定 |

---

## 8. Health 閾值定義

| 狀態 | 條件 | UI 表現 | 流程影響 |
|------|------|---------|----------|
| `healthy` | nodeCount < 4 且無循環 | 綠燈 | 正常通行 |
| `warning` | 4 ≤ nodeCount ≤ 5 且無循環 | 黃燈 | 提示檢視，不阻斷 |
| `critical` | nodeCount > 5 | 紅燈 | 收斂迴圈 halted，建議回退 |
| `circular` | 偵測到循環矛盾依賴 | 紅燈 | 收斂迴圈 halted，需架構重構 |

---

## 9. Gate 條件

### 路徑完成 Gate（各路徑獨立）

| Gate | 條件 |
|------|------|
| 反向: R1 | routes.length ≥ 3 |
| 反向: R2 | Phase A converged 或 trizSolutions.length > 0 |
| 反向: R3 | confirmed subsystems > 0 |
| 反向: R4 | SCAMPER adopted > 0 |
| 正向: F1 | Phase A converged 或 trizSolutions.length > 0 |
| 正向: F2 | confirmed subsystems > 0 |
| 正向: F3 | SCAMPER adopted > 0 |

### 決策中心 Gate

| Gate | 條件 |
|------|------|
| 進入決策中心 | 任一路徑候選池 > 0 |
| Phase B 可執行 | ≥1 alternative adopted |
| MUST | Phase B converged + 所有候選方案 M1-M6 已評分 |
| Pre-CAD | 通過 MUST 者 5 維全評分 |
| Phase Gate 2 | ≥1 alternative overallPass |

---

## 10. 關鍵元件對照

| 元件 | 職責 | 性質 |
|------|------|------|
| `useConvergenceLoop` | 收斂迴圈 driver。`startPhaseA()` / `startPhaseB()` 分離觸發 | 狀態 hook |
| `/convergence/scan` API | Phase A: 矛盾空間分析；Phase B: 方案交叉 + 同矛盾多路徑風險 | 後端 AI |
| `ConvergenceDashboard` | 顯示 confidence %、fatal/major/minor 計數 | 純展示 |
| `BranchExplorationPanel` | 顯示各矛盾分支的探索輪次 | 純展示 |
| `HumanReviewPanel` | converged / halted 時的人類審查介面 | 純展示 |
| `ArchitectureHaltOverlay` | health critical/circular 時的 overlay | 互動 |
| `HealthMonitor` | 渲染 health 燈號 | 純展示 |
| `ConvergenceGraph` | 渲染矛盾 DAG | 純展示 |
| **Decision Hub** | 攤平所有候選、RD 路徑選擇、Phase B 觸發、橫向比較 | **核心互動區** |

---

## 11. v6 → v7 差異摘要

| 項目 | v6 | v7 |
|------|----|----|
| TRIZ 步驟收斂 | 自動 Phase A → Phase B | **只做 Phase A** |
| Phase B 觸發 | `useEffect` 自動偵測 alternatives | **決策中心手動觸發** |
| 三路徑處理 | TC/PC/SF 全部 adopt → 同時送收斂 | **全部 pending → RD 挑選 → 只送 adopted** |
| 無限迴圈風險 | 高（同矛盾多路徑天生衝突） | **消除**（每矛盾只送一條被選路徑） |
| `startExploration()` | 唯一入口 | 保留向後相容，新增 `startPhaseA()` / `startPhaseB()` |
| Phase B prompt | 4 項檢查 | **5 項**（新增同矛盾多路徑風險） |
