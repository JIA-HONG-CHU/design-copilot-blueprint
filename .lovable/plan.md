

## 子系統定義 Block Diagram 視覺化

### 目標
將目前子系統定義（Step 3）從純列表改為 **System Block Diagram**，讓 RD 一眼看出系統架構層級與矛盾影響範圍。

### 設計思路（RD 視角）

以機械/電子 RD 習慣的 Block Diagram 呈現：

```text
+--------------------------------------------------+
|              中驅電動自行車傳動系統 (System)         |
|                                                    |
|  +----------------+    +----------------+          |
|  | 動力傳動模組   |<-->| 殼體結構模組   |          |
|  | [ec-001]  [v]  |    | [ec-002]  [v]  |          |
|  +----------------+    +----------------+          |
|         |                      |                   |
|  +----------------+    +----------------+          |
|  | 散熱模組       |    | 密封模組       |          |
|  | [ec-001]  [ ]  |    |           [ ]  |          |
|  +----------------+    +----------------+          |
+--------------------------------------------------+
```

- 最外層大框 = System（問題描述標題）
- 每個子框 = Module（子系統），顯示名稱、關聯矛盾 Badge、確認 Checkbox
- 已確認子系統以高亮邊框 + 填色表示
- 有共同矛盾的子系統之間用虛線連接，表示耦合關係
- 點擊子系統框 = 切換確認狀態（保持原有互動）

### 實作計畫

#### 1. 新增元件 `src/components/create/SubsystemBlockDiagram.tsx`

建立一個純 React + CSS/Tailwind 的 Block Diagram 元件（不引入額外圖表庫），包含：

- **System 外框**：顯示系統名稱（從 MOCK_MISSION.problemStatement 擷取）
- **Module 方塊**：使用 CSS Grid（2 欄）排列子系統
  - 每個方塊內含：子系統名稱、原因摘要、矛盾 Badge、Checkbox
  - 已確認 → `border-primary` + 淺色背景
  - 未確認 → `border-dashed` + 灰色背景
- **耦合連線**：當兩個子系統共享同一個矛盾 ID，在它們之間繪製 SVG 虛線，並標註矛盾 ID
- **圖例**：底部小圖例說明顏色含義（已確認/未確認/矛盾連線）

Props：
```typescript
interface SubsystemBlockDiagramProps {
  systemName: string;
  subsystems: Subsystem[];
  onToggle: (id: string) => void;
}
```

#### 2. 修改 `src/pages/Create.tsx` — `renderSubsystem()`

- 引入 `SubsystemBlockDiagram` 元件
- 保留上方的 AI 摘要卡片
- 將原本的列表 Cards 替換為 Block Diagram
- 加一個 Tab 或 Toggle 讓使用者可以切換「區塊圖 / 列表」兩種檢視模式，預設顯示區塊圖

#### 3. 修改 `src/types/create.ts` — 擴充 Subsystem 型別

新增可選欄位支援未來擴充：
```typescript
export interface Subsystem {
  // ...existing fields
  parentId?: string | null;  // 未來支援巢狀子系統
  interfaces?: string[];     // 與其他子系統的介面描述
}
```

#### 4. 擴充 Mock 資料 `src/data/mockCreate.ts`

為現有子系統加上 `interfaces` 欄位描述模組間的物理介面：
- 動力傳動模組 ↔ 殼體結構模組：「馬達安裝座介面」
- 動力傳動模組 ↔ 散熱模組：「熱傳導介面」

### 技術細節

- **連線實作**：使用 SVG overlay，透過 `useRef` + `getBoundingClientRect()` 計算每個方塊位置，動態繪製 path
- **響應式**：桌面 2 欄、手機 1 欄，手機模式下連線隱藏改為文字標註
- **動畫**：確認/取消確認時方塊有 `transition-all` 動效

