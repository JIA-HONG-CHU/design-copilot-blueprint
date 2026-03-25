# 雙軌分析 → 候選方案決策中心：設計概念與流程圖

> **v6 (2026-03-25)**：雙軌獨立分析 + 候選方案決策中心。
> - **核心修正**：反向/正向不是「兩個入口進同一管線」，而是「兩條獨立分析鏈，結果匯流到同一張決策桌」
> - **反向路徑**各自有 Anti-Anchor → TRIZ → 子系統 → SCAMPER → 路徑方案池
> - **正向路徑**各自有 TRIZ → 子系統 → SCAMPER → 路徑方案池
> - **候選方案決策中心**：攤平所有方案做橫向比較（來源、機制、假設、驗證需求、信心）
> - Validation Passport / 收斂掃描雙階段 / SCAMPER 閉環迴饋維持不變

---

## 1. 主流程總覽

**設計哲學**：Phase 2 是 **雙軌分析 → 方案匯流 → 統一評估**。
- 兩條路徑**各自獨立**完成分析鏈
- 路徑內部各自有 TRIZ / 子系統 / SCAMPER / 收斂迴圈
- 最後在**候選方案決策中心**攤平比較
- 再進入統一評估（MUST / Pre-CAD）

```mermaid
flowchart TB
    subgraph Phase2["Phase 2: 雙軌分析 → 匯流決策"]
        direction TB

        subgraph REVERSE["反向路徑 — 打破框架"]
            direction TB
            R1["R1: Anti-Anchor Sprint<br/>AI 非典型架構探索<br/>Output: AntiAnchorRoute[] ≥3<br/>+ Validation Passport"]
            R2["R2: TRIZ 解矛盾<br/>針對 Anti-Anchor 引入的新矛盾<br/>三路徑並行 + 收斂迴圈"]
            R3["R3: 子系統定義<br/>受 Anti-Anchor 矛盾影響的子系統"]
            R4["R4: SCAMPER 變形<br/>7 創意行動 × 子系統"]
            RP["反向路徑方案池<br/>adopted TRIZ + SCAMPER<br/>+ AA promoted"]
            R1 --> R2 --> R3 --> R4 --> RP
            R4 -.->|"newContradictions<br/>fatal/major → re-scan"| R2
        end

        subgraph FORWARD["正向路徑 — 系統化解矛盾"]
            direction TB
            F1["F1: TRIZ 解矛盾<br/>針對 CLD 矛盾 (Phase 1 Explore)<br/>三路徑並行 + 收斂迴圈"]
            F2["F2: 子系統定義<br/>受 CLD 矛盾影響的子系統"]
            F3["F3: SCAMPER 變形<br/>7 創意行動 × 子系統"]
            FP["正向路徑方案池<br/>adopted TRIZ + SCAMPER"]
            F1 --> F2 --> F3 --> FP
            F3 -.->|"newContradictions<br/>fatal/major → re-scan"| F1
        end

        HUB["候選方案決策中心<br/>攤平所有方案 · 橫向比較<br/>來源 / 機制 / 假設 / 驗證需求 / 信心"]
        RP --> HUB
        FP --> HUB

        MUST["MUST 快篩 (M1-M6)<br/>pass | fail | marginal"]
        PRECAD["Pre-CAD 審查 (5維)<br/>must / decoupling / testability /<br/>failureMech / mvpCadEffort"]
        HUB --> MUST --> PRECAD
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
| 雙軌獨立 | 反向/正向各自有完整的 TRIZ → 子系統 → SCAMPER 鏈，互不干擾 |
| 路徑方案池 | 每條路徑先在內部整合自己的方案（path-local alternatives），再匯入決策中心 |
| 決策中心是主角 | 不是一個普通 step，是整個頁面的核心區塊 — 方案橫向比較 + 假設追蹤 |
| 收斂迴圈各自獨立 | 每條路徑有自己的 convergence loop 實例，各自監控各自的矛盾空間健康度 |
| SCAMPER 閉環不變 | 各路徑的 SCAMPER newContradictions 回饋至同路徑的 TRIZ 收斂迴圈 |

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

## 3. AI 收斂迴圈詳圖（每條路徑各一實例）

**設計意圖**：每條路徑有自己的 convergence loop，各自獨立運作。Phase A/B 邏輯不變。

```mermaid
flowchart TB
    subgraph DRIVER["useConvergenceLoop (每條路徑各一)"]
        direction TB
        START["startExploration()"]
        DETECT{"alternatives.length > 0?"}
        PHASE_A["phaseRef = 'A'<br/>矛盾空間健康度"]
        PHASE_B["phaseRef = 'B'<br/>方案交叉檢查"]
        BUILD["buildInitialGraph()<br/>從 Contradiction[] 建構初始 DAG"]
        SCHEDULE["setTimeout(runScanRound, 1500ms)"]
        START --> DETECT
        DETECT -->|"否"| PHASE_A --> BUILD
        DETECT -->|"是"| PHASE_B --> BUILD
        BUILD --> SCHEDULE
    end

    subgraph API_CALL["runScanRound — 每輪迭代"]
        direction TB
        REQ["POST /convergence/scan<br/>payload: contradictions[]<br/>+ alternatives[] (Phase B only)<br/>+ mission + constraints + kpis<br/>+ phase: A|B"]
        RES["ConvergenceScanResponse<br/>+ phase echo"]
        PROCESS["處理回傳"]
        REQ --> RES --> PROCESS
    end

    subgraph PROCESS_DETAIL["回傳處理邏輯"]
        direction TB
        P1["分類: fatal / major / minor"]
        P2["minor → riskRegister (非阻斷)"]
        P3["appendToGraph()<br/>新矛盾節點 + 邊"]
        P4["mapArchitectureHealth()<br/>← API 回傳的 health 字串"]
        P5["confidence ← convergence_score"]
        P1 --> P2
        P1 --> P3
        P3 --> P4 --> P5
    end

    subgraph DECIDE["收斂判定"]
        direction TB
        D1{"isConverged?<br/>score ≥ 80 ||<br/>(no new fatal/major<br/>&& iteration > 0)"}
        D2{"isHalted?<br/>force_pause ||<br/>critical || circular"}
        D3["status = converged<br/>→ 停止迴圈"]
        D4["status = halted<br/>→ ArchitectureHaltOverlay"]
        D5["status = exploring<br/>→ setTimeout 下一輪"]
        D1 -->|"是"| D3
        D1 -->|"否"| D2
        D2 -->|"是"| D4
        D2 -->|"否"| D5
        D5 -->|"1500ms"| REQ
    end

    SCHEDULE --> REQ
    PROCESS --> PROCESS_DETAIL --> DECIDE

    style DRIVER fill:#FEF3C7,stroke:#F59E0B
    style API_CALL fill:#FEE2E2,stroke:#EF4444
    style PROCESS_DETAIL fill:#DBEAFE,stroke:#3B82F6
    style DECIDE fill:#D1FAE5,stroke:#10B981
```

### 人為介入點

| 動作 | 方法 | 效果 |
|------|------|------|
| 強制停止 | `forceHalt()` | 立即取消 timer + abort flag，status → halted |
| 強制繼續 | `forceContinue()` | health 降級為 warning，排程下一輪 scan |
| 重試分支 | `retryBranch(id)` | 該分支 status → exploring，排程下一輪 |
| 注入新矛盾 | `addContradiction()` | 加入 graph，若 fatal/major 自動觸發 re-scan |
| 覆寫 severity | `confirmSeverity()` | 手動修正 AI 判定的 severity |

---

## 4. 資料流向

```mermaid
flowchart TB
    subgraph DUAL_TRACK["雙軌資料流"]
        direction TB

        subgraph REV_DATA["反向路徑資料"]
            AA["AntiAnchorRoute[]<br/>mechanism / cross_domain_source<br/>validation_passport"]
            R_EC["Anti-Anchor 引入的矛盾"]
            R_TS["反向 TrizSolution[]"]
            R_SS["反向 Subsystem[]"]
            R_SV["反向 ScamperVariant[]"]
            R_ALT["反向路徑方案池"]
            AA --> R_EC -->|"1:N 求解"| R_TS
            R_TS -->|"矛盾親和性"| R_SS
            R_SS -->|"FK"| R_SV -->|"整合"| R_ALT
            AA -.->|"晉升為方案"| R_ALT
        end

        subgraph FWD_DATA["正向路徑資料"]
            F_EC["CLD Contradiction[]<br/>(from Phase 1 Explore)"]
            F_TS["正向 TrizSolution[]"]
            F_SS["正向 Subsystem[]"]
            F_SV["正向 ScamperVariant[]"]
            F_ALT["正向路徑方案池"]
            F_EC -->|"1:N 求解"| F_TS
            F_TS -->|"矛盾親和性"| F_SS
            F_SS -->|"FK"| F_SV -->|"整合"| F_ALT
        end

        HUB_DATA["候選方案決策中心<br/>Alternative[]<br/>source: reverse_triz | reverse_scamper |<br/>reverse_aa | forward_triz |<br/>forward_scamper | manual"]
        R_ALT --> HUB_DATA
        F_ALT --> HUB_DATA

        EVAL["統一評估<br/>mustScores: Record M1-M6<br/>preCadScores: 5維<br/>overallPass: boolean"]
        HUB_DATA --> EVAL
    end

    style REV_DATA fill:#FEF3C7,stroke:#F59E0B
    style FWD_DATA fill:#DBEAFE,stroke:#3B82F6
    style HUB_DATA fill:#F3E8FF,stroke:#8B5CF6
```

---

## 5. SCAMPER → 收斂迴圈回饋（每條路徑各自閉環）

**設計意圖**：SCAMPER 變形可能引入新矛盾。回饋至**同一路徑**的收斂迴圈，不跨路徑。

```mermaid
flowchart TB
    A["SCAMPER Variant 採用<br/>(路徑內)"] --> B{"產生 newContradictions?"}
    B -->|"否"| C["進入路徑方案池"]
    B -->|"是"| D["addContradiction()"]
    D --> E{"severity?"}
    E -->|"minor"| F["加入 riskRegister<br/>不阻斷流程"]
    F --> C
    E -->|"fatal / major"| G["加入同路徑 graph +<br/>自動排程 runScanRound"]
    G --> H["POST /convergence/scan<br/>(同路徑 convergence loop)"]
    H --> I{"收斂判定"}
    I -->|"converged"| C
    I -->|"exploring"| H
    I -->|"halted"| J["ArchitectureHaltOverlay<br/>人類決定: 強制繼續 or 回退"]
    J -->|"forceContinue()"| H
    J -->|"回退"| K["返回上一步"]

    style A fill:#D1FAE5,stroke:#10B981
    style G fill:#FEE2E2,stroke:#EF4444
    style J fill:#FCA5A5,stroke:#DC2626
```

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
| 路徑內 TRIZ 載入 | 路徑矛盾集 | 按矛盾 ID 分組，三路徑並行生成解法 | `TrizSolution[].status = 'pending'` | — |
| 路徑內收斂迴圈 | `startExploration()` | 自動偵測 phase + 建構 graph + 排程 scan | `status = exploring` | 各路徑獨立 |
| 路徑內子系統定義 | TRIZ 矛盾親和性 | RD/AI 定義 + 確認 | `Subsystem[confirmed]` | 解鎖 SCAMPER |
| 路徑內 SCAMPER | 已確認子系統 | 7 行動 × N 子系統 | `ScamperVariant[adopted]` | — |
| SCAMPER 新矛盾 | `newContradictions[]` | `addContradiction()` 注入同路徑收斂迴圈 | fatal/major → 自動 re-scan | 路徑內閉環 |
| 路徑方案池整合 | adopted TRIZ + SCAMPER (+ AA promoted) | 路徑內部整合 | 路徑 Alternative[] | — |
| 決策中心匯流 | 兩路徑方案池 | 攤平 + 橫向比較 | 全局 Alternative[] | 進入統一評估 |
| MUST 篩選 | Alternative + M1-M6 | AI + RD 評分 | pass / fail / marginal | 淘汰不可行方案 |
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
| 反向: R2 | converged 或 trizSolutions.length > 0 |
| 反向: R3 | confirmed subsystems > 0 |
| 反向: R4 | SCAMPER adopted > 0 |
| 正向: F1 | converged 或 trizSolutions.length > 0 |
| 正向: F2 | confirmed subsystems > 0 |
| 正向: F3 | SCAMPER adopted > 0 |

### 決策中心 Gate

| Gate | 條件 |
|------|------|
| 進入決策中心 | 任一路徑方案池 > 0 |
| MUST | 所有候選方案 M1-M6 已評分 |
| Pre-CAD | 通過 MUST 者 5 維全評分 |
| Phase Gate 2 | ≥1 alternative overallPass |

---

## 10. 關鍵元件對照

| 元件 | 職責 | 性質 |
|------|------|------|
| `useConvergenceLoop` | 收斂迴圈 driver（每條路徑各一實例） | 狀態 hook |
| `/convergence/scan` API | Phase A/B 矛盾分析。由 `phase` 參數切換 prompt | 後端 AI |
| `ConvergenceDashboard` | 顯示 confidence %、fatal/major/minor 計數 | 純展示 |
| `BranchExplorationPanel` | 顯示各矛盾分支的探索輪次 | 純展示 |
| `HumanReviewPanel` | 收斂完成後的人類審查介面 | 純展示 |
| `ArchitectureHaltOverlay` | halted 時的 overlay：強制繼續 or 回退 | 互動 |
| `HealthMonitor` | 渲染 health 燈號 | 純展示 |
| `ConvergenceGraph` | 渲染矛盾 DAG（可拖曳節點、severity 色彩） | 純展示 |
| **Alternative Decision Hub** | 攤平所有方案、橫向比較、假設追蹤 | **核心互動區** |
