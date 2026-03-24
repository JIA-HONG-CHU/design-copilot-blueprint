# TRIZ → SCAMPER 收斂管線：設計概念與流程圖

> **v4 (2026-03-24)**：收斂掃描拆為雙階段，解決 Step 2 依賴 Step 5 資料的設計矛盾。
> - **Phase A**（Step 2）：矛盾空間健康度分析 — 只需 contradictions，不需 alternatives
> - **Phase B**（Step 5 後自動觸發）：方案 × 矛盾完整交叉檢查 — 需要 alternatives
> - 自動轉換：Phase A converged + alternatives 出現 → 自動啟動 Phase B
> - 收斂公式：Phase A 側重 well-formed / circular / coverage；Phase B 側重 resolved / fatal / clean_alts
> - SCAMPER 回饋閉環：維持不變（此時 alternatives 已存在，自動走 Phase B）

---

## 1. 主流程總覽

**設計哲學**：Phase 2 是一條 **發散→收斂** 管線。前 4 步發散產出解法，後 3 步收斂篩選。收斂掃描分為兩階段：**Phase A**（Step 2，矛盾空間健康度）只需矛盾資料；**Phase B**（Step 5 後自動觸發）需要方案資料做完整交叉檢查。

```mermaid
flowchart TB
    subgraph Phase2["Phase 2: Diverge → Converge"]
        direction TB

        S1["Step 1: Anti-Anchor Sprint<br/>AI 非典型架構探索<br/>Output: AntiAnchorRoute[] ≥3"]

        subgraph TRIZ["Step 2: TRIZ 矛盾解 + AI 收斂迴圈"]
            direction TB
            T_INPUT["Input: Contradiction[]<br/>(from Phase 1 Explore)"]

            subgraph THREE_PATH["三路徑並行求解"]
                TC["TC 矩陣查表<br/>40 原理 × 39 參數"]
                PC["PC 分離原理<br/>時間/空間/系統層級"]
                SF["SF 76 標準解<br/>物場模型匹配"]
            end

            T_INPUT --> TC & PC & SF

            subgraph CONV_LOOP["useConvergenceLoop — AI 自主收斂（雙階段）"]
                direction TB
                CL_PHASE{"phase?"}
                CL_A["Phase A: 矛盾空間健康度<br/>Input: contradictions only<br/>分析: 交互衝突 / 循環依賴 / 覆蓋盲區"]
                CL_B["Phase B: 方案交叉檢查<br/>Input: contradictions + alternatives<br/>分析: 二次矛盾 / 參數衝突"]
                CL1["POST /convergence/scan<br/>+ phase: A|B"]
                CL2["回傳: new_contradictions[]<br/>+ convergence_score<br/>+ architecture_health<br/>+ force_pause + phase"]
                CL3{"收斂判定"}
                CL4["converged<br/>score ≥ 80 或<br/>無新 fatal/major"]
                CL5["exploring<br/>排程下一輪<br/>delay: 1500ms"]
                CL6["halted<br/>force_pause 或<br/>health = critical/circular"]
                CL_PHASE -->|"A (no alts)"| CL_A --> CL1
                CL_PHASE -->|"B (has alts)"| CL_B --> CL1
                CL1 --> CL2 --> CL3
                CL3 --> CL4
                CL3 --> CL5
                CL3 --> CL6
                CL5 -->|"自動下一輪"| CL1
            end

            THREE_PATH --> CONV_LOOP
        end

        subgraph RENDER["展示層 (被動渲染)"]
            direction LR
            R1["ConvergenceDashboard<br/>confidence % + 計數"]
            R2["HealthMonitor<br/>健康度燈號"]
            R3["ConvergenceGraph<br/>矛盾 DAG 視覺化"]
            R4["BranchExplorationPanel<br/>各分支探索輪次"]
        end

        subgraph SUBSYSTEM["Step 3: 子系統定義"]
            direction TB
            SS_DEF["定義受影響子系統<br/>source: rd | ai | ai_edited"]
            SS_CONFIRM["confirmed: boolean<br/>Gate: ≥1 已確認"]
            SS_LINK["relatedContradictions[]<br/>追溯至矛盾 ID"]
            SS_DEF --> SS_CONFIRM
            SS_DEF --> SS_LINK
        end

        subgraph SCAMPER["Step 4: SCAMPER 變形"]
            direction TB
            SC_INPUT["Input: 已確認子系統"]
            subgraph SEVEN_ACTIONS["7 創意行動 × 每個子系統"]
                S_ACT["S 替代"]
                C_ACT["C 結合"]
                A_ACT["A 適應"]
                M_ACT["M 修改"]
                P_ACT["P 其他用途"]
                E_ACT["E 消除"]
                R_ACT["R 重排"]
            end
            SC_ADOPT["adopted: boolean<br/>Gate: ≥1 已採用"]
            SC_FEEDBACK["newContradictions[]<br/>可能注入新矛盾"]
            SC_INPUT --> SEVEN_ACTIONS --> SC_ADOPT
            SEVEN_ACTIONS --> SC_FEEDBACK
        end

        S5["Step 5: 方案整合<br/>Alternative[]<br/>source: triz_tc|triz_pc|triz_sf|<br/>scamper|manual|ai_integrated"]
        S6["Step 6: MUST 快篩 (M1-M6)<br/>pass | fail | marginal"]
        S7["Step 7: Pre-CAD 審查 (5維)<br/>must / decoupling / testability /<br/>failureMech / mvpCadEffort"]

        S1 --> TRIZ
        TRIZ --> RENDER
        TRIZ -->|"矛盾親和性"| SUBSYSTEM
        SUBSYSTEM -->|"confirmed subs"| SCAMPER
        SCAMPER --> S5 --> S6 --> S7
        SC_FEEDBACK -.->|"addContradiction()<br/>fatal/major 自動 re-scan"| CONV_LOOP
    end

    GATE["Phase Gate 2<br/>≥1 alternative overallPass"]
    S7 --> GATE

    style TRIZ fill:#FEF3C7,stroke:#F59E0B
    style CONV_LOOP fill:#FEE2E2,stroke:#EF4444
    style RENDER fill:#F0F9FF,stroke:#93C5FD
    style SUBSYSTEM fill:#DBEAFE,stroke:#3B82F6
    style SCAMPER fill:#D1FAE5,stroke:#10B981
    style GATE fill:#F3E8FF,stroke:#8B5CF6
```

### 設計決策說明

| 決策 | 說明 |
|------|------|
| 雙階段收斂 | Phase A（Step 2）只需矛盾，分析問題空間健康度；Phase B（Step 5 後）需要方案，做完整交叉檢查。自動偵測 `alternatives.length > 0` 決定 phase |
| 後端 AI 主導 | 前端 (`useConvergenceLoop`) 只是迴圈 driver，每輪呼叫 `/convergence/scan` API（帶 `phase` 參數），後端 AI 負責矛盾偵測、severity 分類、health 評估。前端不做任何矛盾分析邏輯 |
| 展示層與計算層分離 | `HealthMonitor`、`ConvergenceGraph` 是純 props-driven 展示元件，不含業務邏輯。所有計算在 hook 內完成 |
| SCAMPER → 收斂迴圈閉環 | SCAMPER 產生的 `newContradictions[]` 透過 `addContradiction()` 注入收斂迴圈，若 severity 為 fatal/major，自動排程 re-scan（此時 alternatives 已存在，自動走 Phase B） |
| Phase A → B 自動轉換 | `useEffect` 監聽：Phase A converged + alternatives 出現 → 自動呼叫 `startExploration()`，hook 偵測到 alternatives 存在後自動切換為 Phase B |

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

## 3. AI 收斂迴圈詳圖

**設計意圖**：取代舊的前端 side-effect 串連模式。後端 AI 在單一 API 回應中完成矛盾掃描 + 健康評估 + 收斂判定，前端只負責驅動迭代和渲染結果。Phase A/B 由前端 hook 自動偵測，後端透過 `phase` 參數選擇對應 prompt。

```mermaid
flowchart TB
    subgraph DRIVER["useConvergenceLoop (前端 driver)"]
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
    subgraph DATA_FLOW["資料轉換管線"]
        direction TB

        EC["Contradiction<br/>id / type: TC|PC<br/>severity: fatal|major|minor<br/>resolved: boolean"]

        TS["TrizSolution[]<br/>contradictionId: FK<br/>path: TC|PC|SF<br/>status: pending|adopted|edited|skipped"]

        SCAN_RES["ConvergenceScanResponse<br/>new_contradictions: Secondary[]<br/>convergence_score: 0-100<br/>architecture_health: string<br/>force_pause: boolean"]

        SS["Subsystem[]<br/>confirmed: boolean<br/>source: rd|ai|ai_edited<br/>relatedContradictions: string[]"]

        SV["ScamperVariant[]<br/>subsystemId: FK<br/>action: S|C|A|M|P|E|R<br/>adopted: boolean<br/>newContradictions?: ScamperNewContradiction[]"]

        ALT["Alternative[]<br/>source: triz_tc|triz_pc|triz_sf|<br/>scamper|manual|ai_integrated<br/>mustScores: Record M1-M6<br/>interfaceContract: 6維<br/>preCadScores: 5維"]

        EC -->|"1:N 求解"| TS
        EC -->|"Phase A: convergenceScan()"| SCAN_RES
        TS -->|"矛盾親和性"| SS
        SS -->|"FK: subsystemId"| SV
        SV -->|"整合"| ALT
        ALT -.->|"Phase B: convergenceScan()<br/>auto-trigger"| SCAN_RES
        SCAN_RES -.->|"health/confidence<br/>回饋至迴圈狀態"| EC
        SV -.->|"addContradiction()<br/>Phase B re-scan"| SCAN_RES
    end

    subgraph GATES["步驟完成 Gate"]
        direction LR
        G1["Step 1: routes.length ≥ 3"]
        G2["Step 2: converged ||<br/>trizSolutions.length > 0"]
        G3["Step 3: confirmed > 0"]
        G4["Step 4: SCAMPER adopted > 0"]
        G5["Step 5: alternatives.length > 0"]
        G6["Step 6: 所有 M1-M6 已評分"]
        G7["Step 7: 通過 MUST 者<br/>Pre-CAD 5維全評分"]
        G1 --> G2 --> G3 --> G4 --> G5 --> G6 --> G7
    end

    style DATA_FLOW fill:#F8FAFC,stroke:#64748B
    style GATES fill:#FFF7ED,stroke:#EA580C
```

---

## 5. SCAMPER → 收斂迴圈回饋（E2E 自動閉環）

**設計意圖**：SCAMPER 變形可能引入新矛盾。若 severity 為 fatal/major，系統自動觸發收斂迴圈 re-scan，不需人為介入。minor 記入 riskRegister 但不阻斷。

```mermaid
flowchart TB
    A["SCAMPER Variant 採用"] --> B{"產生 newContradictions?"}
    B -->|"否"| C["直接進入 Step 5"]
    B -->|"是"| D["addContradiction()"]
    D --> E{"severity?"}
    E -->|"minor"| F["加入 riskRegister<br/>不阻斷流程"]
    F --> C
    E -->|"fatal / major"| G["加入 graph +<br/>自動排程 runScanRound"]
    G --> H["POST /convergence/scan"]
    H --> I{"收斂判定"}
    I -->|"converged"| C
    I -->|"exploring"| H
    I -->|"halted"| J["ArchitectureHaltOverlay<br/>人類決定: 強制繼續 or 回退"]
    J -->|"forceContinue()"| H
    J -->|"回退"| K["返回 Task Definition"]

    style A fill:#D1FAE5,stroke:#10B981
    style G fill:#FEE2E2,stroke:#EF4444
    style J fill:#FCA5A5,stroke:#DC2626
```

---

## 6. 完整狀態轉換表

| 階段 | 輸入 | 處理 | 輸出 | 連鎖效果 |
|------|------|------|------|----------|
| TRIZ 載入 | `Contradiction[]` | 按矛盾 ID 分組，三路徑並行生成解法 | `TrizSolution[].status = 'pending'` | — |
| TRIZ 狀態變更 | `pending → adopted/edited/skipped` | 狀態守衛驗證合法性後更新 | 狀態變更 persist 至 Supabase | — |
| 收斂迴圈啟動 | `startExploration()` | 自動偵測 phase（A or B）+ 建構初始 graph + 排程第一輪 scan | `status = exploring, phase = A\|B` | — |
| Phase A scan | `Contradiction[]` (no alternatives) | POST `/convergence/scan` phase=A (1500ms/輪) | 矛盾交互分析 + 覆蓋評估 | graph 更新、health 重算 |
| Phase B scan | `Contradiction[] + Alternative[]` | POST `/convergence/scan` phase=B (1500ms/輪) | 方案交叉檢查 + 二次矛盾偵測 | graph 更新、health 重算 |
| Phase A→B 轉換 | Phase A converged + alternatives 出現 | `useEffect` 自動呼叫 `startExploration()` | 重新啟動為 Phase B | 完整收斂分析 |
| Health 判定 | `architecture_health` 字串 | 映射為 HealthStatus | `healthy / warning / critical / circular` | critical/circular → halted |
| 收斂判定 | `convergence_score`, `new_contradictions` | `score ≥ 80 ∥ no new fatal/major` | `converged / exploring / halted` | converged → Step 2 complete |
| 子系統定義 | TRIZ 矛盾親和性 | RD/AI 定義 + 確認 | `Subsystem[confirmed]` | 解鎖 SCAMPER |
| SCAMPER 展開 | 已確認子系統 | 7 行動 × N 子系統 | `ScamperVariant[adopted]` | — |
| SCAMPER 新矛盾 | `newContradictions[]` | `addContradiction()` 注入收斂迴圈 | fatal/major → 自動 re-scan | 可能連鎖觸發新一輪收斂 |
| 方案整合 | adopted TRIZ + SCAMPER | 人工/AI 整合 | `Alternative[]` | 進入 MUST 篩選 |

---

## 7. Health 閾值定義

| 狀態 | 條件 | UI 表現 | 流程影響 |
|------|------|---------|----------|
| `healthy` | nodeCount < 4 且無循環 | 綠燈 | 正常通行 |
| `warning` | 4 ≤ nodeCount ≤ 5 且無循環 | 黃燈 | 提示檢視，不阻斷 |
| `critical` | nodeCount > 5 | 紅燈 | 收斂迴圈 halted，建議回退 |
| `circular` | 偵測到循環矛盾依賴 | 紅燈 | 收斂迴圈 halted，需架構重構 |

---

## 8. 關鍵元件對照

| 元件 | 職責 | 性質 |
|------|------|------|
| `useConvergenceLoop` | 收斂迴圈 driver：啟動、迭代、停止、注入矛盾。自動偵測 phase（A/B） | 狀態 hook（含業務邏輯） |
| `/convergence/scan` API | Phase A: 矛盾空間分析；Phase B: 方案交叉檢查。由 `phase` 參數切換 prompt | 後端 AI（控制權核心） |
| `ConvergenceDashboard` | 顯示 confidence %、fatal/major/minor 計數 | 純展示元件 |
| `BranchExplorationPanel` | 顯示各矛盾分支的探索輪次 | 純展示元件 |
| `HumanReviewPanel` | 收斂完成後的人類審查介面 | 純展示元件 |
| `ArchitectureHaltOverlay` | halted 時的 overlay：強制繼續 or 回退 | 互動元件 |
| `HealthMonitor` | 渲染 health 燈號 + critical 時的回退按鈕 | 純展示元件 |
| `ConvergenceGraph` | 渲染矛盾 DAG（可拖曳節點、severity 色彩） | 純展示元件 |
