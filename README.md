# Design Copilot Blueprint

> AI 驅動的產品設計工程協作平台 — 從概念發散到設計收斂，結構化引導每一個決策節點。

## 為什麼需要 Design Copilot？

產品設計過程中，工程團隊常面臨：

- 路徑依賴：習慣性沿用既有架構，錯失更優方案
- 決策黑箱：設計取捨缺乏可追溯的記錄
- 知識斷層：經驗散落在個人筆記與口頭傳承中

**Design Copilot Blueprint** 將設計方法論（TRIZ、SCAMPER、Anti-Anchor、Feynman Technique）內建為互動式工具，讓團隊在結構化流程中完成從需求定義到 CAD 移交的完整設計週期。

## 核心功能

| 模組 | 說明 |
|------|------|
| **Phase Gate Dashboard** | 多階段設計流程追蹤（Phase I–III），含子關卡與 KPI 看板 |
| **Anti-Anchor Sprint** | AI 產生非典型架構概念，打破路徑依賴 |
| **TRIZ Solver** | 辨識技術矛盾，產出三條解決路徑 |
| **SCAMPER** | 結構化變體生成（替換、合併、調適、修改、轉用、消除、反轉） |
| **Design Review** | 結構化設計驗證與審查 |
| **Decision Records** | 設計決策與理由的完整記錄 |
| **Assumption Ledger** | 追蹤並監控設計假設 |
| **Contradiction Matrix** | 偵測互相衝突的需求 |
| **Feynman Technique** | 以簡單語言釐清複雜概念 |
| **Knowledge Base** | 設計參考資料的組織與管理 |

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 建置工具 | Vite 5 |
| UI 元件庫 | shadcn/ui + Radix UI |
| 樣式系統 | Tailwind CSS |
| 狀態管理 | TanStack React Query |
| 認證 | Supabase Auth |
| 圖表 | Recharts |
| 測試 | Vitest + Testing Library |

## 快速開始

### 環境需求

- Node.js >= 18
- npm >= 9

### 安裝與啟動

```bash
# 複製專案
git clone https://github.com/anthropics/design-copilot-blueprint.git
cd design-copilot-blueprint

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

啟動後瀏覽器開啟 `http://localhost:8080` 即可使用。

### 本地開發繞過認證

本專案使用 Supabase 進行認證，本地開發可透過環境變數繞過：

在 `.env` 中設定：

```env
VITE_DEV_BYPASS_AUTH="true"
```

重啟 dev server 後即可免登入，自動以下列身份進入：

| 欄位 | 值 |
|------|-----|
| 名稱 | Dev Admin |
| Email | admin@dev.local |
| Role | admin |

將 `VITE_DEV_BYPASS_AUTH` 改為 `"false"` 或刪除該行，即恢復正式認證流程。

### 遠端連線

Dev server 預設監聽 `0.0.0.0:8080`，同網段裝置可透過 `http://<主機IP>:8080` 存取。

## 可用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 產出正式版建置 |
| `npm run build:dev` | 產出開發版建置 |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | 執行 ESLint 檢查 |
| `npm run test` | 執行測試 |
| `npm run test:watch` | 以 watch 模式執行測試 |

## 專案結構

```
src/
├── components/    # UI 元件（依功能模組分資料夾）
├── contexts/      # React Context（認證等）
├── data/          # 靜態資料與 Mock 資料
├── hooks/         # 自訂 Hooks
├── integrations/  # 外部服務整合（Supabase）
├── lib/           # 工具函式
├── pages/         # 路由頁面
├── types/         # TypeScript 型別定義
└── test/          # 測試檔案
```

## 參與貢獻

歡迎提交 Issue 與 Pull Request！

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權條款

本專案採用 [MIT License](LICENSE) 開源授權。

---

Built with React + TypeScript | Powered by Delta Electronics
