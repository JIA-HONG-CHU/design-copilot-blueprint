# WBS × API 對齊分析：SOW v1.0 vs 現況實作

> **Date**: 2026-04-07 (Updated)
> **Purpose**: 逐項比對 SOW WBS 規劃的 API 端點與現有實作，標記路徑偏差、缺失端點、實作方式差異

---

## 總覽

| 指標 | SOW 規劃 | 實際實作 |
|------|----------|----------|
| 後端 API 端點數 | 35+ (CRUD + AI) | **31** (AI + Gate + 健康檢查，全部已實作)|
| CRUD 端點 | 後端 REST API | 前端 Supabase JS Client |
| AI 端點 | 後端 FastAPI | 後端 FastAPI ✅（全部 SOW 路徑對齊 + 11 個新增）|
| 資料庫表 | 27 (SQLAlchemy ORM) | **31** (Supabase，新增 unknown_factors, contradiction_assumption_links 等)|
| 認證 | 自訂 JWT | Supabase Auth |
| Gate 檢查 | `GET /gates/:id/check` | ✅ 已實作（8 Gate 全查 Supabase）|
| 501 stub 端點 | — | **0**（先前 export / knowledge_writeback / scamper_feedback 三 stub 已全部完成）|

**根因**：ADR-001 決定採用 BaaS-First 架構，CRUD 由前端直接操作 Supabase，後端僅負責 AI 編排。

### 後端路由全清單（31 routes，2026-04-07）

| # | Method | Path | 模組 | 狀態 |
|---|--------|------|------|------|
| 1 | POST | `/api/v1/definitions/extract` | 任務定義 | ✅ 完整實作 |
| 2 | POST | `/api/v1/definitions/rewrite` | 任務定義 | ✅ 完整實作 |
| 3 | POST | `/api/v1/definitions/check-feasibility` | 任務定義 | ✅ 新增（約束間衝突偵測）|
| 4 | POST | `/api/v1/definitions/suggest-constraints` | 任務定義 | ✅ 完整實作 |
| 5 | POST | `/api/v1/definitions/suggest-kpis` | 任務定義 | ✅ 完整實作 |
| 6 | POST | `/api/v1/definitions/generate-5w1h` | 任務定義 | ✅ 完整實作 |
| 7 | POST | `/api/v1/questions/generate` | 索克拉底問答 | ✅ 完整實作 |
| 8 | POST | `/api/v1/questions/follow-up` | 索克拉底問答 | ✅ 新增（追問鏈）|
| 9 | POST | `/api/v1/questions/brief-impact` | 索克拉底問答 | ✅ 新增（回答 → Brief 影響分析）|
| 10 | POST | `/api/v1/questions/auto-tag` | 索克拉底問答 | ✅ 新增（自動標記假設/矛盾）|
| 11 | POST | `/api/v1/causal-loops/generate` | 因果迴路 | ✅ 完整實作 |
| 12 | POST | `/api/v1/contradictions/{cid}/formalize` | 矛盾管理 | ✅ 完整實作 |
| 13 | POST | `/api/v1/assumptions/extract` | 假設台帳 | ✅ 完整實作 |
| 14 | POST | `/api/v1/alternatives/anti-anchor` | 反錨定 | ✅ 完整實作 |
| 15 | POST | `/api/v1/alternatives/validation-passport` | 反錨定 | ✅ 新增（路線可行性護照）|
| 16 | POST | `/api/v1/triz/solve` | TRIZ (TC/PC) | ✅ 完整實作 |
| 17 | POST | `/api/v1/triz/sufield` | TRIZ (Su-Field) | ✅ 新增（76 Standard Solutions）|
| 18 | POST | `/api/v1/scamper/perform` | SCAMPER | ✅ 完整實作 |
| 19 | POST | `/api/v1/scamper/subsystem-suggestions` | SCAMPER | ✅ 完整實作 |
| 20 | POST | `/api/v1/scamper/feedback-contradictions` | SCAMPER | ✅ **已完成**（先前為 501 stub）|
| 21 | POST | `/api/v1/unknown-factors/discover` | 未知因素 | ✅ 新增（U-set 自動發現）|
| 22 | POST | `/api/v1/risks/analyze` | 風險分析 | ✅ 完整實作 |
| 23 | POST | `/api/v1/actions/suggest` | 行動建議 | ✅ 完整實作 |
| 24 | POST | `/api/v1/convergence/scan` | 收斂掃描 | ✅ 完整實作 |
| 25 | POST | `/api/v1/must/evaluate` | MUST 評估 | ✅ 完整實作 |
| 26 | POST | `/api/v1/pre-cad-reviews/{rid}/ai-analyze` | Pre-CAD | ✅ 完整實作 |
| 27 | POST | `/api/v1/want/criteria/seed` | WANT 評分 | ✅ 完整實作 |
| 28 | GET | `/api/v1/gates/{gate_id}/check` | Gate 檢查 | ✅ 完整實作（8 gates） |
| 29 | POST | `/api/v1/export` | 匯出 | ✅ **已完成**（先前為 501 stub）|
| 30 | POST | `/api/v1/knowledge/writeback` | 知識回寫 | ✅ **已完成**（先前為 501 stub）|
| 31 | GET | `/api/v1/health` | 健康檢查 | ✅ |

---

## WP-1: Infrastructure

| WBS | SOW 規劃 | 實際實作 | 狀態 |
|-----|----------|----------|------|
| WP-1.1 | FastAPI scaffold + middleware + error handler | FastAPI scaffold ✅ CORS middleware ✅ | ✅ 完成 |
| WP-1.2 | 27 ORM tables + Alembic migration | 31 Supabase tables + 5 SQL migrations (000–004) | ⚠️ 偏差：無 ORM，改用 Supabase migration |
| WP-1.3 | 統一 LLMService (retry + token + prompt loader) | `retry_on_transient` (指數退避) + `_estimate_tokens` + `_resolve_anthropic_max_tokens` + 集中 prompts (`backend/app/prompts/`) + 多 provider (Anthropic/OpenAI/Azure/Gemini/Qwen) | ✅ **已完成**（ADR-003 closure）|
| WP-1.4 | JWT/SSO + user model + permission middleware | Supabase Auth + RLS | ⚠️ 偏差：無自訂 auth 端點 |
| WP-1.5 | React scaffold + routes + Design System | React + Vite + shadcn/ui + 19 pages | ✅ 完成（超出預期頁面數）|

---

## WP-2: Phase 1 — Define

### WP-2.1 Task Definition

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 建立任務定義 | POST | `/definitions` | — | ❌ 無後端 CRUD（前端 Supabase `briefs` 表 upsert）|
| 取得任務定義 | GET | `/definitions/{pid}` | — | ❌ 無後端 CRUD（前端 `useBrief(projectId)` hook）|
| 更新任務定義 | PUT | `/definitions/{id}` | — | ❌ 無後端 CRUD（前端 `useUpsertBrief()` hook）|
| AI 文件提取 | POST | `/definitions/extract` | `/api/v1/definitions/extract` | ✅ 路徑一致 |
| AI 改寫 Mission | POST | `/definitions/rewrite` | `/api/v1/definitions/rewrite` | ✅ 路徑一致 |
| AI 約束建議 | POST | `/definitions/suggest-constraints` | `/api/v1/definitions/suggest-constraints` | ✅ 路徑一致 |
| AI KPI 建議 | POST | `/definitions/suggest-kpis` | `/api/v1/definitions/suggest-kpis` | ✅ 路徑一致 |
| AI 產生 5W1H | POST | `/definitions/generate-5w1h` | `/api/v1/definitions/generate-5w1h` | ✅ 路徑一致 |

### WP-2.2 Socratic 7-Class Question Engine

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 產生問題 | POST | `/questions/generate` | `/api/v1/questions/generate` | ✅ 路徑一致 |
| 取得問題列表 | GET | `/questions/{pid}` | — | ❌ 前端 Supabase `socratic_questions` 表 |
| 提交回答 | POST | `/questions/{qid}/answer` | — | ❌ 前端 Supabase update |
| 取得回答 | GET | `/questions/{qid}/answers` | — | ❌ 前端 Supabase query |

### WP-2.3 Assumption Extraction + Contradiction Identification

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 建立矛盾 | POST | `/contradictions` | — | ❌ 前端 Supabase `contradictions` 表 |
| 取得矛盾列表 | GET | `/contradictions/{pid}` | — | ❌ 前端 Supabase |
| 取得矛盾詳情 | GET | `/contradictions/{cid}` | — | ❌ 前端 Supabase |
| 形式化 TRIZ 句型 | POST | `/contradictions/{cid}/formalize` | `/api/v1/contradictions/{cid}/formalize` | ✅ 路徑一致 |
| AI 提取假設 | POST | `/assumptions/extract` | `/api/v1/assumptions/extract` | ✅ 路徑一致 |

### WP-2.4 Causal Loop Diagram + Breakpoint

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| AI 產生 CLD | POST | `/causal-loops/generate` | `/api/v1/causal-loops/generate` | ✅ 路徑一致 |
| 取得 CLD | GET | `/causal-loops/{pid}` | — | ❌ 前端 Supabase `cld_nodes` + `cld_edges` |
| Breakpoint CRUD | POST | `/breakpoints` | — | ❌ 前端 Supabase（breakpoints 整合在 cld_nodes 中）|

### WP-2.5 Gate 1.1 / 1.2 / Phase Gate 1

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| Gate 檢查 | GET | `/gates/{gate_id}/check` | `/api/v1/gates/{gate_id}/check` | ✅ 路徑一致（8 gates 全實作）|

---

## WP-3: Phase 2 — Diverge

### WP-3.1 Assumption Ledger + Unknown Factors

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 建立假設 | POST | `/assumptions` | — | ❌ 前端 Supabase `assumptions` 表 |
| 取得假設列表 | GET | `/assumptions/{pid}` | — | ❌ 前端 Supabase |
| 更新假設 | PUT | `/assumptions/{id}` | — | ❌ 前端 Supabase |
| AI 提取假設 | POST | `/assumptions/extract` | `/api/v1/assumptions/extract` | ✅ 路徑一致 |
| 記錄反證 | POST | `/assumptions/{aid}/disprove` | — | ❌ 未實作（前端可透過 status='refuted' update 達成）|
| Unknown Factors CRUD | POST/GET/PUT | `/unknown-factors/*` | Supabase `unknown_factors` 表 + AI 發現端點 `/api/v1/unknown-factors/discover` | ✅ **已完成**（脫離 localStorage）|

### WP-3.2 Anti-Anchor Sprint

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| AI 產生非典型架構 | POST | `/alternatives/anti-anchor` | `/api/v1/alternatives/anti-anchor` | ✅ 路徑一致 |
| 路線 CRUD | — | — | — | ❌ 前端 Supabase `anti_anchor_routes` 表 |

### WP-3.3 TRIZ Unified Solver Engine ★

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| TRIZ 求解 | POST | `/triz/solve` | `/api/v1/triz/solve` | ✅ 路徑一致 |
| 取得結果 | GET | `/triz/results/{rid}` | — | ❌ 前端 Supabase `triz_solutions` 表 |
| 矩陣查詢 | GET | `/triz/matrix` | — | ❌ 未實作為獨立端點（內嵌於 solve 邏輯）|

### WP-3.4 SCAMPER

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 執行 SCAMPER | POST | `/scamper/perform` | `/api/v1/scamper/perform` | ✅ 路徑一致 |
| 子系統建議 | POST | `/scamper/subsystem-suggestions` | `/api/v1/scamper/subsystem-suggestions` | ✅ 路徑一致 |
| 矛盾回饋 | POST | `/scamper/feedback-contradictions` | `/api/v1/scamper/feedback-contradictions` | ✅ **已完成**（整合 Supabase `contradictions` 寫入）|

### WP-3.5 Contradiction Feedback Loop

| SOW API | SOW 路徑 | 實際實作 | 狀態 |
|---------|----------|----------|------|
| 回饋新矛盾 | `/scamper/feedback-contradictions` | 後端完整實作 + 前端 `useContradictionScan` hook | ✅ 端到端閉環 |

### WP-3.6 Alternative Set + Interface Contract

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| Alternative CRUD | POST/GET/PUT | `/alternatives/*` | — | ❌ 前端 Supabase `alternatives` 表 |

### WP-3.7 MUST Fast Filter (M1-M6)

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| MUST 評估 | POST | `/must/evaluate` | `/api/v1/must/evaluate` | ✅ 路徑一致 |
| 取得結果 | GET | `/must/results` | — | ❌ 前端 Supabase `alternatives.must_scores` |

### WP-3.8 Pre-CAD 5D Review

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 建立 Pre-CAD Review | POST | `/pre-cad-reviews` | — | ❌ 前端 Supabase `alternatives.pre_cad_scores` |
| AI 分析 | POST | `/pre-cad-reviews/{rid}/ai-analyze` | `/api/v1/pre-cad-reviews/{rid}/ai-analyze` | ✅ 路徑一致 |
| 取得 Reviews | GET | `/pre-cad-reviews` | — | ❌ 前端 Supabase |

### WP-3.9 Gate 2.1 / 2.2 / Phase Gate 2

| SOW API | SOW 路徑 | 實際路徑 | 狀態 |
|---------|----------|----------|------|
| Gate 檢查 | `/gates/{gate_id}/check` | `/api/v1/gates/{gate_id}/check` | ✅ 路徑一致 |

---

## WP-4: Phase 3 — Converge

### WP-4.1 Evidence Matrix

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 取得證據矩陣 | GET | `/experiments/evidence-matrix` | — | ❌ 前端 Supabase `evidence_matrix` 表 |

### WP-4.2 Risk Registry

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| AI 風險分析 | POST | `/risks/analyze` | `/api/v1/risks/analyze` | ✅ 路徑一致 |
| Risk CRUD | POST/GET/PUT | `/risks/*` | — | ❌ 前端 Supabase `risks` 表 |

### WP-4.3 Minimal Experiment + Evidence Closure

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| Experiment CRUD | POST/GET/PUT | `/experiments/*` | — | ❌ 前端 Supabase `experiments` 表 |
| 更新 Evidence Level | PUT | `/experiments/{eid}/update-evidence` | — | ❌ 前端 Supabase |

### WP-4.4 WANT Standard + KT Scoring

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| WANT Criteria CRUD | POST/GET | `/want/criteria/*` | — | ❌ 前端 Supabase `want_criteria` + `want_scores` 表 |
| AI Seed W1-W6 | POST | `/want/criteria/seed` | `/api/v1/want/criteria/seed` | ✅ 路徑一致 |

### WP-4.5 KT Decision Record

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| Decision CRUD | POST/GET/PUT | `/decisions/*` | — | ❌ 前端 Supabase `decisions` 表 |
| AI Action 建議 | POST | `/actions/suggest` | `/api/v1/actions/suggest` | ✅ 路徑一致 |

### WP-4.6 Gate 3.2 / Phase Gate 3

| SOW API | SOW 路徑 | 實際路徑 | 狀態 |
|---------|----------|----------|------|
| Gate 檢查 | `/gates/{gate_id}/check` | `/api/v1/gates/{gate_id}/check` | ✅ 路徑一致 |

### WP-4.7 Knowledge Assetization

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 知識回寫 | POST | `/knowledge/writeback` | `/api/v1/knowledge/writeback` | ✅ **已完成** |
| Knowledge CRUD | — | — | — | ❌ 前端 Supabase `knowledge_entries` + `knowledge_articles` |

### WP-4.8 Export

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 匯出 | POST | `/export` | `/api/v1/export` | ✅ **已完成** |

---

## WP-5: Frontend UI

| WBS | 頁面 | 狀態 | 備註 |
|-----|------|------|------|
| WP-5.0 | Dashboard | ✅ | `ProjectDashboard.tsx` + `ProjectList.tsx` |
| WP-5.1 | Brief | ✅ | `TaskDefinition.tsx` |
| WP-5.2 | Explore | ✅ | `Explore.tsx` (Socratic + CLD tabs) |
| WP-5.3 | Track | ✅ | `Track.tsx` (Kanban) + `AssumptionLedger.tsx` |
| WP-5.4 | Create ★ | ✅ | `Create.tsx` (Anti-Anchor + TRIZ + SCAMPER + MUST) |
| WP-5.5 | Review | ✅ | `DesignReview.tsx` + `PreCadReview.tsx` |
| WP-5.6 | Decide | ✅ | `DecisionRecord.tsx` |
| — | Knowledge | ✅ | `KnowledgeBase.tsx` + `Feynman.tsx`（SOW 外新增）|
| — | ContradictionID | ✅ | `ContradictionIdentification.tsx`（SOW 外新增）|
| — | SolutionExplorer | ✅ | `SolutionExplorer.tsx`（SOW 外新增）|
| — | CadInProgress | ✅ | `CadInProgress.tsx`（SOW 外新增）|

---

## WP-6 & WP-7: QA + DevOps

見 ADR-004。

---

## API 路徑一致性彙整

### ✅ SOW 路徑完全對齊的端點（20 個）

| 功能 | SOW 路徑 | 實際路徑 |
|------|----------|----------|
| 文件提取 | `POST /definitions/extract` | `/api/v1/definitions/extract` |
| Mission 改寫 | `POST /definitions/rewrite` | `/api/v1/definitions/rewrite` |
| 約束建議 | `POST /definitions/suggest-constraints` | `/api/v1/definitions/suggest-constraints` |
| KPI 建議 | `POST /definitions/suggest-kpis` | `/api/v1/definitions/suggest-kpis` |
| 5W1H 產生 | `POST /definitions/generate-5w1h` | `/api/v1/definitions/generate-5w1h` |
| 索克拉底問題 | `POST /questions/generate` | `/api/v1/questions/generate` |
| CLD 產生 | `POST /causal-loops/generate` | `/api/v1/causal-loops/generate` |
| 矛盾形式化 | `POST /contradictions/{cid}/formalize` | `/api/v1/contradictions/{cid}/formalize` |
| 假設提取 | `POST /assumptions/extract` | `/api/v1/assumptions/extract` |
| Anti-Anchor | `POST /alternatives/anti-anchor` | `/api/v1/alternatives/anti-anchor` |
| TRIZ 求解 | `POST /triz/solve` | `/api/v1/triz/solve` |
| SCAMPER 執行 | `POST /scamper/perform` | `/api/v1/scamper/perform` |
| SCAMPER 子系統建議 | `POST /scamper/subsystem-suggestions` | `/api/v1/scamper/subsystem-suggestions` |
| SCAMPER 矛盾回饋 | `POST /scamper/feedback-contradictions` | `/api/v1/scamper/feedback-contradictions` |
| 風險分析 | `POST /risks/analyze` | `/api/v1/risks/analyze` |
| Action 建議 | `POST /actions/suggest` | `/api/v1/actions/suggest` |
| MUST 評估 | `POST /must/evaluate` | `/api/v1/must/evaluate` |
| Pre-CAD AI | `POST /pre-cad-reviews/{rid}/ai-analyze` | `/api/v1/pre-cad-reviews/{rid}/ai-analyze` |
| WANT Seed | `POST /want/criteria/seed` | `/api/v1/want/criteria/seed` |
| Gate 檢查 | `GET /gates/{gate_id}/check` | `/api/v1/gates/{gate_id}/check` |

### 🔸 SOW 外新增的端點（11 個，全部已實作）

| 功能 | 實際路徑 | 說明 |
|------|----------|------|
| 約束可行性檢查 | `POST /api/v1/definitions/check-feasibility` | 約束間衝突偵測（pass/warn/fail）|
| 索克拉底追問 | `POST /api/v1/questions/follow-up` | 根據既有回答產生追問 |
| 回答影響 Brief | `POST /api/v1/questions/brief-impact` | 將回答轉化為 Mission/約束/KPI 變更建議 |
| 自動標記 | `POST /api/v1/questions/auto-tag` | AI 標記回答為假設或矛盾 |
| 路線可行性護照 | `POST /api/v1/alternatives/validation-passport` | Anti-Anchor 路線的驗證護照 |
| TRIZ Su-Field | `POST /api/v1/triz/sufield` | 76 Standard Solutions（migration 004 對應）|
| 未知因素發現 | `POST /api/v1/unknown-factors/discover` | U-set AI 自動掃描 |
| 收斂掃描 | `POST /api/v1/convergence/scan` | 二次矛盾偵測 + 架構健康度 |
| 匯出 | `POST /api/v1/export` | Markdown / JSON / PDF 匯出 |
| 知識回寫 | `POST /api/v1/knowledge/writeback` | 6 類資產自動寫回 `knowledge_entries` |
| 健康檢查 | `GET /api/v1/health` | 基礎設施 |

### ⚠️ 路徑不一致：無

所有 SOW 定義的 AI 端點路徑已 100% 對齊。

---

## 前後端 Schema 一致性

**結論：所有已實作的 31 個端點，前後端欄位完全對齊。**

| 端點 | 前端 TS 介面 | 後端 Pydantic | 欄位一致 |
|------|-------------|--------------|---------|
| `/definitions/extract` | `BriefExtractRequest/Response` | `BriefExtractionRequest/Response` | ✅ |
| `/definitions/rewrite` | `BriefRewriteRequest/Response` | `BriefRewriteRequest/Response` | ✅ |
| `/definitions/suggest-constraints` | `ConstraintSuggestRequest/Response` | `ConstraintSuggestRequest/Response` | ✅ |
| `/definitions/suggest-kpis` | `KpiSuggestRequest/Response` | `KpiSuggestRequest/Response` | ✅ |
| `/definitions/generate-5w1h` | `TaskDef5W1HRequest/Response` | `TaskDef5W1HRequest/Response` | ✅ |
| `/questions/generate` | `SocraticGenerateRequest/Response` | `SocraticRequest/Response` | ✅ 型別名不同，欄位一致 |
| `/causal-loops/generate` | `CldGenerateRequest/Response` | `CldGenerationRequest/Response` | ✅ |
| `/contradictions/{cid}/formalize` | `ContradictionFormalizeRequest/Response` | `ContradictionFormalizeRequest/Response` | ✅ |
| `/assumptions/extract` | `AssumptionExtractRequest/Response` | `AssumptionExtractRequest/Response` | ✅ |
| `/alternatives/anti-anchor` | `AntiAnchorGenerateRequest/Response` | `AntiAnchorRequest/Response` | ✅ |
| `/triz/solve` | `TrizSolveRequest/Response` | `TrizLookupRequest/Response` | ✅ 型別名不同，欄位一致 |
| `/scamper/perform` | `ScamperTransformRequest/Response` | `ScamperRequest/Response` | ✅ |
| `/scamper/subsystem-suggestions` | `SubsystemSuggestRequest/Response` | `SubsystemSuggestRequest/Response` | ✅ |
| `/risks/analyze` | `RiskAnalyzeRequest/Response` | `RiskAnalysisRequest/Response` | ✅ |
| `/actions/suggest` | `ActionSuggestRequest/Response` | `ActionSuggestRequest/Response` | ✅ |
| `/convergence/scan` | `ConvergenceScanRequest/Response` | `ConvergenceScanRequest/Response` | ✅ |
| `/must/evaluate` | `MustEvaluateRequest/Response` | `MustEvaluationRequest/Response` | ✅ |
| `/pre-cad-reviews/{rid}/ai-analyze` | `PreCadAnalyzeRequest/Response` | `PreCadAnalyzeRequest/Response` | ✅ |
| `/want/criteria/seed` | `WantSeedRequest/Response` | `WantSeedRequest/Response` | ✅ |
| `/gates/{gate_id}/check` | `GateCheckResponse` | `GateCheckResponse` | ✅ |

唯一注意點：`EvidenceReference` 的 `url` / `snippet` 欄位，前端為 optional (`?`)，後端為 default empty string (`= ""`)。語意相容，不影響運作。

---

## 現有 Gap（剩餘缺口）

### P0 — 資料完整性

| 缺口 | 說明 | 建議實作方式 |
|------|------|-------------|
| Phase state machine trigger | `projects.phase` 仍可被任意 update，需要 BEFORE UPDATE trigger 強制 phase 流轉規則 | Supabase trigger |

### P1 — 使用者體驗

| 缺口 | 說明 | 建議實作方式 |
|------|------|-------------|
| `POST /assumptions/{aid}/disprove` | 反證專屬工作流（目前由 status='refuted' 替代）| FastAPI 端點 + Supabase update |
| `GET /knowledge/rag/search` | RAG 知識檢索（目前僅有 writeback）| 後端 RAG pipeline |

### P2 — 收尾與品質

| 項目 | 說明 |
|------|------|
| pytest + Playwright + Docker | 見 ADR-004 |
| 後端 OpenAPI Schema 自動匯出至前端型別 | 減少手動同步 |

---

## 結論（2026-04-07）

1. **API 路徑 100% 對齊 + 11 個增量**：20 個 SOW 端點全對齊，另新增 11 個 SOW 外功能（含 TRIZ Su-Field、Unknown Factors、Brief check-feasibility、Socratic 追問鏈、Validation Passport 等）。
2. **501 stub 全部清零**：先前的三個 stub（`/scamper/feedback-contradictions`、`/export`、`/knowledge/writeback`）已全部完成實作。
3. **前後端 Schema 一致**：所有 31 個端點的前端 TypeScript 介面與後端 Pydantic Schema 欄位完全對齊。
4. **LLM Service 完整**：retry + token estimation + 多 provider + 集中 prompts 已落地（ADR-003 closure）。
5. **資料庫成長至 31 表**：新增 `unknown_factors`、`contradiction_assumption_links` 等；migrations 001–004 補齊 validation passport / 追溯連結 / 子系統階層 / Su-Field 欄位。
6. **架構偏差是設計決策**：SOW 的 35+ 端點中約 24 個 CRUD 端點已由 Supabase 前端替代（ADR-001）。
7. **Gate 檢查已實作**：8 個 Gate（1.1, 1.2, PG1, 2.1, 2.2, PG2, 3.2, PG3）全部透過 Supabase 查詢實作。
8. **P0 唯一缺口**：Phase state machine trigger。
