# Create 頁面 UX 設計規格

> **v5 (2026-03-26)**：雙軌對稱 — 各一個節點 → 候選池 → 決策中心。
> - 反向：Anti-Anchor（1 個節點，創意發散）
> - 正向：TRIZ + 子系統 + SCAMPER 合成一個 E2E 節點（內部 tab 切換），報告風格對齊 Anti-Anchor
> - 兩條路徑各產出 route-style 候選，進入同一個候選池

---

## 使用者旅程（User Journey）

```
1. 看到核心使命（Mission）— 知道自己要解什麼問題
2. 看到兩張對稱卡片 — 反向探索 / 正向分析
3. 點任一張卡片展開操作（或兩張都做）
4. 每條路徑產出候選方案（帶 Validation Passport）
5. 所有方案匯入候選池 → 決策中心攤平比較
6. RD 選擇 adopt/skip → 觸發 Phase B 交叉檢查
7. Phase B 通過 → MUST 快篩 → Pre-CAD 審查
8. Phase Gate 2 通過 → 進入 CAD
```

---

## 畫面結構（Wireframe）

```
┌──────────────────────────────────────────────────────────────────┐
│  ① 核心設計使命                                                    │
│  Mission · Constraints · KPIs · 已驗證假設 · 高風險數               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ② 雙軌分析（兩張對稱卡片）                                         │
│                                                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────┐        │
│  │  ⚡ 反向探索              │  │  🎯 正向分析              │        │
│  │                          │  │                          │        │
│  │  Anti-Anchor Sprint     │  │  TRIZ → 子系統 → SCAMPER │        │
│  │  從約束出發，AI 產出      │  │  從矛盾出發，系統化產出    │        │
│  │  非典型架構概念           │  │  候選方案                 │        │
│  │                          │  │                          │        │
│  │  每條自帶                │  │  內部 tab 切換：           │        │
│  │  Validation Passport    │  │  ① TRIZ ② 子系統 ③ SCAMPER│        │
│  │                          │  │                          │        │
│  │  [點擊展開操作]          │  │  [點擊展開操作]            │        │
│  └─────────────────────────┘  └─────────────────────────┘        │
│                                                                    │
│                    ▼ 候選池匯流 ▼                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ③ 候選方案決策中心                                            │ │
│  │                                                                │ │
│  │  所有候選攤平 · RD adopt/skip · Phase B 交叉檢查               │ │
│  │                                                                │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │ │
│  │  │ AA 路線1 │ │ AA 路線2 │ │ TRIZ-TC │ │ SCAMPER │           │ │
│  │  │ 反向/創意│ │ 反向/創意│ │ 正向/演繹│ │ 正向/創意│           │ │
│  │  │ 信心:65 │ │ 信心:58 │ │ 信心:82 │ │ 信心:71 │           │ │
│  │  │ [adopt] │ │ [skip]  │ │ [adopt] │ │ [skip]  │           │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │ │
│  │                                                                │ │
│  │  [執行 Phase B 收斂掃描]  → 通過 ✓ / 有衝突 ⚠                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ④ 統一評估                                                        │
│  [ MUST 快篩 (M1-M6) ]  →  [ Pre-CAD 審查 (5D) ]                 │
│                                                                    │
│  ⑤ 收斂監控（摺疊）                                                │
│  正向 Phase A: Score 85% ● healthy │ Fatal:0 Major:0 Minor:5      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 節點互動定義

### ① 核心設計使命（MissionContext）

| 元素 | 互動 | 說明 |
|------|------|------|
| Mission 文字 | 唯讀 | 從 Brief 繼承 |
| Constraints 列表 | 唯讀 | 硬約束 badge |
| KPI 列表 | 唯讀 | 目標指標 |
| 已驗證假設 / 高風險數 | 唯讀 | 來自 Track（假設追蹤）頁 |

### ② 雙軌分析卡片

**設計原則**：兩張卡片等高等寬、對稱排列。點擊後展開各自的操作內容。

#### 反向探索卡片（Anti-Anchor）

點擊後展開：

| 元素 | 互動 | 觸發 |
|------|------|------|
| [AI 生成非典型架構] | 按鈕 → loading → 顯示 ≥3 張路線卡片 | POST /alternatives/anti-anchor |
| 路線卡片 | 展開看 mechanism / why_unconventional / VP | 展開/收合 |
| Validation Passport | 每條路線自帶：assumptions + weak_points + verifications + confidence | 唯讀 |
| [重新生成] | 清空 → 重新 AI 生成 | DELETE all + POST |

**產出**：route-style 候選卡片，直接進入候選池。

#### 正向分析卡片（TRIZ E2E）

點擊後展開，內部 tab 切換三個子步驟：

```
┌─────────────────────────────────────────────────┐
│  ① TRIZ 解矛盾  │  ② 子系統定義  │  ③ SCAMPER 變形 │
├─────────────────────────────────────────────────┤
│  （當前 tab 的內容）                               │
└─────────────────────────────────────────────────┘
```

**Tab ① TRIZ 解矛盾**

| 元素 | 互動 | 觸發 |
|------|------|------|
| [啟動 Phase A] | 矛盾健康度分析 | startPhaseA() |
| [重新執行] | 重新分析 | startPhaseA() |
| 矛盾列表 | 每矛盾展開 → TC/PC/SF 三組候選 | 唯讀 |
| TC/PC/SF 候選 | pending → adopted / skipped / edited | updateTrizSolution() |
| 收斂 Dashboard | confidence / health / fatal·major·minor | 唯讀 |
| 人類審核 | converged/halted 時 → 確認或重試 | setReviewConfirmed() |

**Tab ② 子系統定義**

| 元素 | 互動 | 觸發 |
|------|------|------|
| [AI 建議架構分解] | LLM 產出 System→Module→Component 樹 | POST /scamper/subsystem-suggestions |
| [手動新增] | 表單：名稱 / 層級 / 理由 / 關聯矛盾 | createSubsystem() |
| 樹狀結構 | 展開 System → Module → Component | 可收合 |
| 介面契約 | 耦合模組間 6 維介面 | 唯讀 / 可編輯 |
| [確認] | confirmed → 解鎖 SCAMPER tab | updateSubsystem() |

**Tab ③ SCAMPER 變形**

| 元素 | 互動 | 觸發 |
|------|------|------|
| [AI 生成] | 每子系統 × 7 動作 | POST /scamper/perform |
| 變形卡片 | S/C/A/M/P/E/R badge + 描述 | 唯讀 |
| [採用] / [跳過] | toggle | updateScamperVariant() |
| 潛在風險 | severity badge（僅顯示，不回饋收斂） | 唯讀 |
| [確認完成] | 正向分析結束，候選進入候選池 | goNext() |

**產出**：TRIZ 候選（TC/PC/SF）+ SCAMPER 候選，進入候選池。報告風格與 Anti-Anchor 對齊（每個候選帶 mechanism + VP）。

### ③ 候選方案決策中心

| 元素 | 互動 | 觸發 |
|------|------|------|
| 方案卡片 | 橫向排列，統一格式 | — |
| 來源 badge | 反向(amber) / 正向(blue) + 具體步驟 | 唯讀 |
| [adopt] / [skip] | 切換採用狀態 | updateAlternative() |
| ⚠ 同矛盾多路徑警告 | 自動偵測 | 即時 |
| [執行 Phase B] | 只送 adopted 做交叉檢查 | startPhaseB() |
| Phase B 結果 | converged ✓ / halted ⚠ | 即時更新 |
| [確認進入 MUST] | Phase B 通過後才可按 | goNext() |

#### 方案卡片三層資訊

| 層 | 內容 | 展示方式 |
|----|------|----------|
| **第一眼** | 名稱 · 來源 · 信心 · MUST/Pre-CAD | 卡片頂部，始終可見 |
| **第二眼** | 核心機制 · 優點 · 缺點 | 展開第一層 |
| **第三眼** | 假設(E0-E4) · 驗證需求 · 弱點 · VP | 展開第二層 |

### ④ 統一評估

| 元素 | 互動 | 觸發 |
|------|------|------|
| MUST 快篩 | 每方案 × M1-M6 → pass/fail/marginal | AI + RD |
| Pre-CAD 審查 | 五維雷達圖 | RD / AI 建議 |
| Phase Gate 2 | ≥1 方案 overallPass → 進入 CAD | 自動 |

### ⑤ 收斂監控（摺疊面板）

| 元素 | 互動 | 說明 |
|------|------|------|
| 正向 Phase A | Score / Health / Fatal·Major·Minor | 唯讀 |
| Risk Register | minor 清單 | 展開 |
| 反向無 Phase A | 創意工具不做收斂分析 | — |

---

## 設計原則

| 原則 | 說明 |
|------|------|
| **對稱卡片** | 兩張卡片等高等寬，點擊展開各自操作內容 |
| **方法獨立** | 反向 = 創意（1 步），正向 = 演繹（3 sub-tab），不混用 |
| **E2E 節點** | 正向的 TRIZ+子系統+SCAMPER 對外是 1 個節點，對內是 3 個 tab |
| **報告格式統一** | 兩條路徑的候選卡片格式一致（mechanism + VP） |
| **路徑色彩** | 反向 = amber（⚡暖色），正向 = blue（🎯冷色） |
| **候選池匯流** | 所有候選進同一個池，在決策中心統一比較 |

---

## 步驟索引映射（內部 → 顯示）

| 內部索引 | 顯示 | Stepper 層 | 內容層 |
|----------|------|-----------|--------|
| 0 | 反向探索 | 左卡片 | Anti-Anchor 操作 |
| 1 | 正向: Tab ① TRIZ | 右卡片 | TRIZ 解矛盾 + Phase A |
| 2 | 正向: Tab ② 子系統 | 右卡片 | 3 層架構樹 |
| 3 | 正向: Tab ③ SCAMPER | 右卡片 | 創意變形 |
| 4 | 決策中心 | 獨立區塊 | adopt/skip + Phase B |
| 5 | MUST | 評估區 | M1-M6 |
| 6 | Pre-CAD | 評估區 | 五維雷達圖 |

---

## 方案追溯六要素

| # | 要素 | UI 位置 | 說明 |
|---|------|---------|------|
| 1 | 來源路徑 | 卡片 badge | 反向(amber) / 正向(blue) |
| 2 | 來源步驟 | 卡片 badge | Anti-Anchor / TRIZ_TC / PC / SF / SCAMPER |
| 3 | 解的矛盾 | 第三眼 | contradiction IDs + 描述 |
| 4 | 涉及子系統 | 第三眼 | subsystem 名稱 + 層級 |
| 5 | 基於假設 | 第三眼 | evidence_level E0-E4 + is_falsifiable |
| 6 | 缺少驗證 | 第三眼 | required verifications + 成本/時長 |
