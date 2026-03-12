# TRIZ 矛盾解 → SCAMPER 機制：多層處理狀態與 Side Effects 流程圖

> **v2 更新 (2026-03-12)**：UI 已從線性手動模式重設計為 AI 自主收斂迴圈。
> 核心元件：`useConvergenceLoop` hook → `ConvergenceDashboard` + `BranchExplorationPanel` + `HumanReviewPanel` + `ArchitectureHaltOverlay`。
> 舊的 `useContradictionScan` (從未被呼叫) 已被取代。

## 1. 主流程總覽 (Pipeline Overview)

```mermaid
flowchart TB
    subgraph Phase2["Phase 2: Diverge — Create 方案創造"]
        direction TB

        S1["Step 1: Anti-Anchor Sprint<br/>AI 非典型架構探索<br/>Output: AntiAnchorRoute[] ≥3"]

        subgraph TRIZ["Step 2: TRIZ 矛盾解 (多層處理)"]
            direction TB
            T_INPUT["Input: ExploreContradiction[]<br/>(from Step 1.2 矛盾識別)"]

            subgraph THREE_PATH["三路徑並行求解"]
                TC["TC 矩陣查表<br/>TRIZ 40 原理 × 39 參數<br/>principleNumber: 1-40"]
                PC["PC 分離原理<br/>時間/空間/系統層級分離<br/>principleNumber: null"]
                SF["SF 76 標準解<br/>模板化解法庫<br/>物場模型匹配"]
            end

            T_INPUT --> TC & PC & SF

            subgraph STATUS_MACHINE["TrizActionStatus 狀態機"]
                direction LR
                PENDING["pending<br/>(初始)"] -->|"採用"| ADOPTED["adopted<br/>(已採用)"]
                PENDING -->|"跳過"| SKIPPED["skipped<br/>(已跳過)"]
                ADOPTED -->|"解鎖"| PENDING
            end

            TC & PC & SF --> STATUS_MACHINE
        end

        subgraph SIDE_EFFECTS["Side Effects (TRIZ 採用後觸發)"]
            direction TB
            SE1["useContradictionScan()<br/>掃描二次矛盾"]
            SE2["HealthMonitor<br/>架構健康度評估"]
            SE3["ConvergenceGraph<br/>矛盾收斂 DAG 視覺化"]
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
            SC_INPUT["Input: 已確認子系統<br/>Filter: confirmed === true"]
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
            SC_FEEDBACK["newContradictions[]<br/>SCAMPER 產生的新矛盾"]
            SC_INPUT --> SEVEN_ACTIONS --> SC_ADOPT
            SEVEN_ACTIONS --> SC_FEEDBACK
        end

        S5["Step 5: 方案整合<br/>Alternative[]<br/>source: triz_tc|triz_pc|triz_sf|scamper|manual|ai"]
        S6["Step 6: MUST 快篩 (M1-M6)<br/>pass | fail | marginal"]
        S7["Step 7: Pre-CAD 審查 (5維)<br/>must/decoupling/testability/<br/>failureMech/mvpCadEffort"]

        S1 --> TRIZ
        TRIZ -->|"adopted solutions"| SIDE_EFFECTS
        TRIZ -->|"矛盾親和性"| SUBSYSTEM
        SIDE_EFFECTS -.->|"健康度回饋"| TRIZ
        SUBSYSTEM -->|"confirmed subs"| SCAMPER
        SCAMPER --> S5 --> S6 --> S7
        SC_FEEDBACK -.->|"回饋迴路"| SE1
    end

    GATE["Phase Gate 2<br/>≥1 alternative overallPass"]
    S7 --> GATE

    style TRIZ fill:#FEF3C7,stroke:#F59E0B
    style SIDE_EFFECTS fill:#FEE2E2,stroke:#EF4444
    style SUBSYSTEM fill:#DBEAFE,stroke:#3B82F6
    style SCAMPER fill:#D1FAE5,stroke:#10B981
    style GATE fill:#F3E8FF,stroke:#8B5CF6
```

## 2. TRIZ 多層狀態轉換詳圖

```mermaid
stateDiagram-v2
    [*] --> Loaded: useEffect mount

    state "TrizSolution[] 載入" as Loaded {
        [*] --> GroupByContradiction
        GroupByContradiction --> ParallelPaths

        state "按矛盾分組" as GroupByContradiction
        state "三路徑並行" as ParallelPaths {
            TC: TC 矩陣查表
            PC: PC 分離原理
            SF: SF 76標準解
        }
    }

    state "Status 狀態機" as StatusFSM {
        pending --> adopted: setTrizStatus(id, 'adopted')
        pending --> skipped: setTrizStatus(id, 'skipped')
        adopted --> pending: setTrizStatus(id, 'pending')
        skipped --> pending: 重新考慮
    }

    Loaded --> StatusFSM: 使用者互動
    StatusFSM --> StepComplete: adopted.count > 0

    state "Side Effect 觸發" as SideEffects {
        scan: useContradictionScan.runScan()
        health: HealthMonitor.getStatus()
        graph: ConvergenceGraph.render()

        scan --> health: nodeCount, hasCircular
        scan --> graph: nodes[], edges[]
    }

    StatusFSM --> SideEffects: adopted 變更
    SideEffects --> HealthDecision

    state "健康度判定" as HealthDecision {
        healthy: 0-3 nodes → 綠燈
        warning: 4-5 nodes → 黃燈
        critical: 5+ nodes 或 circular → 紅燈
    }

    HealthDecision --> ContinueToStep3: healthy/warning
    HealthDecision --> ReturnToExplore: critical (建議回退)

    state StepComplete <<choice>>
    StepComplete --> SubsystemDef: s2 = 'complete'

    state "Step 3 輸入" as SubsystemDef
    ContinueToStep3 --> SubsystemDef
```

## 3. Side Effects 詳細觸發鏈

```mermaid
flowchart LR
    subgraph TRIGGER["觸發點"]
        T1["TRIZ Solution<br/>status → adopted"]
        T2["SCAMPER Variant<br/>adopted → true"]
    end

    subgraph SCAN["useContradictionScan()"]
        direction TB
        R1["runScan()<br/>delay: 1200ms"]
        R2["生成 SecondaryContradiction[]<br/>severity: fatal|major|minor<br/>sourceSolutionId: 連結 TRIZ"]
        R3["計算 confidenceScore<br/>= resolved(F+M) / total(F+M) × 100%"]
        R1 --> R2 --> R3
    end

    subgraph HEALTH["HealthMonitor"]
        direction TB
        H1["nodeCount = contradictions.length"]
        H2{"hasCircular?"}
        H3["status: healthy"]
        H4["status: warning"]
        H5["status: critical"]
        H1 --> H2
        H2 -->|"false, ≤3"| H3
        H2 -->|"false, 4+"| H4
        H2 -->|"true OR >5"| H5
    end

    subgraph CONV["ConvergenceGraph"]
        direction TB
        G1["渲染矛盾 DAG"]
        G2["fatal=紅 | major=橙 | minor=灰"]
        G3["resolved → opacity: 0.5 + ✓"]
        G4{"leafNodes<br/>全部 resolved?"}
        G5["allConverged: true<br/>→ 綠框"]
        G6["allConverged: false<br/>→ 紅框警告"]
        G1 --> G2 --> G3 --> G4
        G4 -->|"是"| G5
        G4 -->|"否"| G6
    end

    T1 --> SCAN
    T2 -.->|"newContradictions[]"| SCAN
    SCAN --> HEALTH
    SCAN --> CONV
    HEALTH -->|"critical"| BLOCK["阻斷: 建議回退至 Explore"]
    CONV -->|"allConverged"| PASS["放行: 繼續 Step 3"]
    CONV -->|"NOT converged"| WARN["警告: 仍有未解決矛盾"]

    style TRIGGER fill:#FEF3C7,stroke:#F59E0B
    style SCAN fill:#FEE2E2,stroke:#EF4444
    style HEALTH fill:#DBEAFE,stroke:#3B82F6
    style CONV fill:#D1FAE5,stroke:#10B981
    style BLOCK fill:#FCA5A5,stroke:#DC2626
```

## 4. TRIZ → Subsystem → SCAMPER 資料流向

```mermaid
flowchart TB
    subgraph DATA_FLOW["資料轉換管線"]
        direction TB

        EC["ExploreContradiction<br/>id: ec-001<br/>type: TC|PC<br/>status: confirmed"]

        TS["TrizSolution[]<br/>contradictionId: ec-001<br/>path: TC|PC|SF<br/>status: adopted"]

        SC_RESULT["ContradictionScanResult<br/>contradictions: Secondary[]<br/>nodeCount: N<br/>hasCircular: bool<br/>confidenceScore: %"]

        SS["Subsystem[]<br/>id: ss-001<br/>confirmed: true<br/>source: rd|ai|ai_edited<br/>relatedContradictions: [ec-001]"]

        SV["ScamperVariant[]<br/>subsystemId: ss-001<br/>action: S|C|A|M|P|E|R<br/>adopted: true<br/>newContradictions: [...]"]

        ALT["Alternative[]<br/>source: triz_tc|scamper|manual<br/>mustScores: {M1..M6}<br/>interfaceContract: {6維}<br/>preCadScores: {5維}"]

        EC -->|"1:N 對映"| TS
        TS -->|"side effect"| SC_RESULT
        TS -->|"矛盾親和性"| SS
        SS -->|"FK: subsystemId"| SV
        SV -->|"整合"| ALT
        SC_RESULT -.->|"回饋"| TS
        SV -.->|"newContradictions"| SC_RESULT
    end

    subgraph STATE_DEPS["狀態依賴矩陣"]
        direction LR
        DEP1["TRIZ adopted > 0<br/>→ Step 2 complete"]
        DEP2["Subsystem confirmed > 0<br/>→ Step 3 complete<br/>→ 解鎖 Step 4"]
        DEP3["SCAMPER adopted > 0<br/>→ Step 4 complete<br/>→ 解鎖 Step 5"]
        DEP4["Alternative.length > 0<br/>→ Step 5 complete"]
        DEP1 --> DEP2 --> DEP3 --> DEP4
    end

    style DATA_FLOW fill:#F8FAFC,stroke:#64748B
    style STATE_DEPS fill:#FFF7ED,stroke:#EA580C
```

## 5. Side Effect 回饋迴路 (Feedback Loop)

```mermaid
flowchart TB
    A["TRIZ 採用解法 A"] -->|"觸發掃描"| B["Contradiction Scan"]
    B -->|"發現二次矛盾"| C{"severity?"}
    C -->|"minor"| D["記錄 → 繼續"]
    C -->|"major"| E["ConvergenceGraph 標橙<br/>HealthMonitor: warning"]
    C -->|"fatal"| F["ConvergenceGraph 標紅<br/>HealthMonitor: critical"]

    D --> G["Step 3: 子系統定義"]
    E --> G
    F -->|"建議回退"| H["回到 Explore<br/>重新定義問題"]
    F -->|"強制繼續"| G

    G --> I["Step 4: SCAMPER 變形"]
    I -->|"Variant 採用"| J{"產生 newContradictions?"}
    J -->|"是"| K["回饋至 Scan<br/>重新掃描"]
    J -->|"否"| L["直接進入 Step 5"]
    K --> B

    style A fill:#FEF3C7
    style B fill:#FEE2E2
    style F fill:#FCA5A5
    style H fill:#FCA5A5
    style K fill:#FEF3C7
```

## 6. 完整狀態轉換表

| 階段 | 輸入狀態 | 處理 | 輸出狀態 | Side Effects |
|------|----------|------|----------|-------------|
| TRIZ 載入 | `ExploreContradiction[]` | 按矛盾 ID 分組，生成三路徑 | `TrizSolution[].status = 'pending'` | - |
| TRIZ 採用 | `pending` → `adopted` | 使用者點擊「採用」 | `adopted` (step complete) | `useContradictionScan()` 觸發 |
| 矛盾掃描 | `TrizSolution[adopted]` | 1200ms async scan | `SecondaryContradiction[]` | `HealthMonitor` 更新 |
| 健康評估 | `nodeCount`, `hasCircular` | 閾值判定 | `healthy\|warning\|critical` | UI 色彩變更、阻斷警告 |
| 收斂圖 | `nodes[]`, `edges[]` | DAG 繪製 + leaf 檢查 | `allConverged: bool` | 視覺化回饋 |
| 子系統定義 | TRIZ 矛盾親和性 | RD/AI 定義 + 確認 | `Subsystem[confirmed]` | 解鎖 SCAMPER |
| SCAMPER 展開 | `confirmed subsystems` | 7 行動 × N 子系統 | `ScamperVariant[adopted]` | `newContradictions[]` 回饋 |
| 新矛盾回饋 | `newContradictions[]` | 回饋至 Scan | 更新 `confidenceScore` | 迴圈重掃 |
| 方案整合 | adopted TRIZ + SCAMPER | 人工/AI 整合 | `Alternative[]` | 進入 MUST 篩選 |

## 7. 關鍵 Side Effects 清單

| # | Side Effect | 觸發條件 | 影響範圍 | 嚴重度 |
|---|------------|----------|----------|--------|
| SE-1 | 二次矛盾生成 | TRIZ solution adopted | 增加 contradictions count | 可能升級至 fatal |
| SE-2 | 架構健康度降級 | nodeCount > 3 or circular | 阻斷流程、建議回退 | critical 時阻斷 |
| SE-3 | 收斂圖未收斂 | leaf nodes 未全部 resolved | 視覺警告、confidence < 100% | Gate P 不通過 |
| SE-4 | SCAMPER 新矛盾 | variant.newContradictions[] | 回饋至 contradiction scan | 可能連鎖觸發 SE-1 |
| SE-5 | 步驟狀態連鎖更新 | 任何 adopted/confirmed 變更 | stepStatuses[] 重算 | UI accordion 狀態變更 |
| SE-6 | autoSave 觸發 | 任何資料變更 | saving → saved toast | 使用者感知 |
