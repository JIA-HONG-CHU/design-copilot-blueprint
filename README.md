# Design Copilot Blueprint

> AI 驅動的產品設計工程協作平台 — 從概念發散到設計收斂，結構化引導每一個決策節點。

## 為什麼需要 Design Copilot？

產品設計過程中，工程團隊常面臨：

- 路徑依賴：習慣性沿用既有架構，錯失更優方案
- 決策黑箱：設計取捨缺乏可追溯的記錄
- 知識斷層：經驗散落在個人筆記與口頭傳承中

**Design Copilot Blueprint** 將設計方法論（TRIZ、SCAMPER、Anti-Anchor、KT Decision Analysis）內建為互動式工具，讓團隊在結構化流程中完成從需求定義到 CAD 移交的完整設計週期。

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  Dashboard │ Brief │ Explore │ Track │ Create │ Review │ Decide │
│                                                         │
│  React 18 + TypeScript + Vite + shadcn/ui               │
│  TanStack React Query ← supabase-js (CRUD)              │
│  api.ts → FastAPI backend (AI 呼叫)                     │
└───────────────┬─────────────────────┬───────────────────┘
                │ REST API (JWT)      │ Supabase Client
                ▼                     ▼
┌───────────────────────┐  ┌─────────────────────────────┐
│   Backend (FastAPI)   │  │   Supabase (PostgreSQL)     │
│   Python 3.12         │  │   Auth + DB + RLS           │
│                       │  │   27+ tables                │
│   Agents:             │  └─────────────────────────────┘
│   - Analyst Agent     │
│   - TRIZ Solver Agent │
│   - Evaluator Agent   │
│   - Knowledge Agent   │
│         │             │
│         ▼             │
│   Claude API (LLM)    │
└───────────────────────┘
```

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 元件庫 | shadcn/ui + Radix UI + Tailwind CSS |
| 狀態管理 | TanStack React Query v5 |
| 後端框架 | FastAPI (Python 3.12) |
| 資料庫 | Supabase (PostgreSQL + Auth + RLS) |
| LLM | Anthropic Claude API |
| 測試 | pytest (後端 91 tests) / vitest (前端) |
| 部署 | Docker + docker-compose + nginx |

---

## 快速開始

### 環境需求

| 項目 | 版本 |
|------|------|
| Node.js | >= 18 |
| Python | >= 3.12 |
| npm | >= 9 |
| Docker (選用) | >= 24 |

### 方式一：本地開發（推薦）

#### 1. 前端

```bash
# 安裝依賴
npm install

# 啟動開發伺服器 (port 5173)
npm run dev
```

#### 2. 後端

```bash
# 進入後端目錄
cd backend

# 安裝依賴（建議使用虛擬環境）
pip install -e ".[dev]"

# 啟動 API 伺服器 (port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. 環境變數

在專案根目錄建立 `.env`：

```env
# ── Supabase ──
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# ── 後端 API 位址（前端呼叫用）──
VITE_API_BASE_URL="http://localhost:8000/api/v1"

# ── LLM ──
ANTHROPIC_API_KEY=sk-ant-...

# ── 開發模式（跳過登入）──
VITE_DEV_BYPASS_AUTH="true"
```

在 `backend/` 目錄建立 `backend/.env`：

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
ANTHROPIC_API_KEY=sk-ant-...
TRIZ_KB_PATH=../rd_assistant_design_system/triz_knowledge_base

# 正式環境需設定 JWT Secret（Supabase Dashboard > Settings > API）
# JWT_SECRET=<your-jwt-secret>
```

### 方式二：Docker 一鍵部署

```bash
# 建置並啟動前後端
docker-compose up --build

# 前端: http://localhost:8080
# 後端: http://localhost:8000
# API 文件: http://localhost:8000/docs
```

---

## 啟動後驗證

| 檢查項目 | 指令 / URL | 預期結果 |
|---------|-----------|---------|
| 前端頁面 | `http://localhost:5173` (dev) / `http://localhost:8080` (docker) | Dashboard 頁面載入 |
| 後端健康 | `curl http://localhost:8000/health` | `{"status":"ok"}` |
| API 文件 | `http://localhost:8000/docs` | Swagger UI |
| AI 改寫 | Brief 頁 > 輸入 Mission > 點「AI 改寫」 | 回傳改寫結果 |

---

## 本地開發繞過認證

設定 `VITE_DEV_BYPASS_AUTH="true"` 後重啟前端，即可免登入：

| 欄位 | 值 |
|------|-----|
| 名稱 | Dev Admin |
| Email | admin@dev.local |
| Role | admin |

後端在 `JWT_SECRET` 未設定時，自動接受 `dev-bypass-token`，與前端 bypass 模式配合。

將 `VITE_DEV_BYPASS_AUTH` 改為 `"false"` 並設定 `JWT_SECRET`，即恢復正式認證流程。

---

## 可用指令

### 前端

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 (Vite HMR) |
| `npm run build` | 產出正式版建置 |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | ESLint 檢查 |
| `npm run test` | 執行前端測試 (vitest) |

### 後端

| 指令 | 說明 |
|------|------|
| `uvicorn app.main:app --reload` | 啟動開發伺服器 (hot reload) |
| `python -m pytest tests/ -v` | 執行全部後端測試 (91 tests) |
| `python -m pytest tests/test_e2e_scenario.py -v` | E2E 場景測試 |
| `ruff check .` | Python lint 檢查 |

---

## 專案結構

```
design-copilot-blueprint/
├── src/                          # 前端原始碼
│   ├── components/               #   UI 元件（依功能模組分資料夾）
│   ├── contexts/                 #   React Context（Auth）
│   ├── hooks/api/                #   Supabase CRUD hooks
│   ├── lib/api.ts                #   後端 API client
│   ├── pages/                    #   路由頁面（7 頁）
│   └── types/                    #   TypeScript 型別
│
├── backend/                      # 後端原始碼
│   ├── app/
│   │   ├── main.py               #   FastAPI entry point
│   │   ├── core/                 #   config, logging, supabase client
│   │   ├── middleware/           #   auth, error_handler, request_id
│   │   ├── agents/              #   AI agent 邏輯 (analyst, triz, scamper...)
│   │   ├── routers/             #   API 路由 (17 模組)
│   │   ├── models/              #   Pydantic schemas
│   │   └── tools/               #   TRIZ KB loader
│   ├── tests/                    #   pytest 測試 (91 tests)
│   ├── docs/API_REFERENCE.md     #   API 端點文件
│   └── pyproject.toml
│
├── supabase/
│   └── migrations/               # SQL migration 檔案
│
├── docs/
│   ├── SOW_v1.0_開發說明書.md     # 完整開發說明書
│   └── USER_MANUAL.md            # 使用手冊（繁體中文）
│
├── docker-compose.yml            # 前後端一鍵部署
├── Dockerfile                    # 前端 multi-stage (Node → nginx)
├── nginx.conf                    # SPA routing + API proxy
└── .env                          # 環境變數（不入版控）
```

---

## 核心功能

| 模組 | 說明 |
|------|------|
| **Phase Gate Dashboard** | 多階段設計流程追蹤（Phase I–III），含 8-Gate + KPI 看板 |
| **Brief (任務定義)** | Mission 定義 + AI 改寫 + 約束/KPI 建議 + 5W1H |
| **Explore (探索)** | 索克拉底七類提問 + 因果迴路圖 (CLD) + 斷路點 |
| **Track (假設台帳)** | Kanban 四欄拖拉 + PDCA 狀態機 + 證據登錄 |
| **Create (發散)** | Anti-Anchor + TRIZ 三路徑 + SCAMPER + MUST + Pre-CAD |
| **Review (審查)** | 證據矩陣 (E0-E4) + 風險 P×S 矩陣 + 最小實驗 |
| **Decide (決策)** | WANT 排行榜 + KT 決策記錄 + 匯出 |
| **Evidence Entry** | 結構化量測證據登錄 → 自動傳播 KPI/假設/MUST |
| **Knowledge Writeback** | 6 類設計資產自動回寫沉澱 |

---

## 相關文件

- [API 參考文件](backend/docs/API_REFERENCE.md)
- [使用手冊](docs/USER_MANUAL.md)
- [開發說明書 (SOW)](docs/SOW_v1.0_開發說明書.md)

---

Built with React + TypeScript + FastAPI | Powered by Delta Electronics
