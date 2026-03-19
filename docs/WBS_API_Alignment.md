# WBS × API 對齊分析：SOW v1.0 vs 現況實作

> **Date**: 2026-03-13 (Updated)
> **Purpose**: 逐項比對 SOW WBS 規劃的 API 端點與現有實作，標記路徑偏差、缺失端點、實作方式差異

---

## 總覽

| 指標 | SOW 規劃 | 實際實作 |
|------|----------|----------|
| 後端 API 端點數 | 35+ (CRUD + AI) | 24 (AI + Gate + stub) |
| CRUD 端點 | 後端 REST API | 前端 Supabase JS Client |
| AI 端點 | 後端 FastAPI | 後端 FastAPI ✅（全部 SOW 路徑對齊）|
| 資料庫表 | 27 (SQLAlchemy ORM) | 29 (Supabase，多 concept_routes + compatibility_pairs) |
| 認證 | 自訂 JWT | Supabase Auth |
| Gate 檢查 | `GET /gates/:id/check` | ✅ 已實作（8 Gate 全查 Supabase）|

**根因**：ADR-001 決定採用 BaaS-First 架構，CRUD 由前端直接操作 Supabase，後端僅負責 AI 編排。

### 後端路由全清單（28 routes）

| # | Method | Path | 模組 | 狀態 |
|---|--------|------|------|------|
| 1 | POST | `/api/v1/definitions/extract` | 任務定義 | ✅ 完整實作 |
| 2 | POST | `/api/v1/definitions/rewrite` | 任務定義 | ✅ 完整實作 |
| 3 | POST | `/api/v1/definitions/suggest-constraints` | 任務定義 | ✅ 完整實作 |
| 4 | POST | `/api/v1/definitions/suggest-kpis` | 任務定義 | ✅ 完整實作 |
| 5 | POST | `/api/v1/definitions/generate-5w1h` | 任務定義 | ✅ 完整實作 |
| 6 | POST | `/api/v1/questions/generate` | 索克拉底問答 | ✅ 完整實作 |
| 7 | POST | `/api/v1/causal-loops/generate` | 因果迴路 | ✅ 完整實作 |
| 8 | POST | `/api/v1/contradictions/{cid}/formalize` | 矛盾管理 | ✅ 完整實作 |
| 9 | POST | `/api/v1/assumptions/extract` | 假設台帳 | ✅ 完整實作 |
| 10 | POST | `/api/v1/alternatives/anti-anchor` | 反錨定 | ✅ 完整實作 |
| 11 | POST | `/api/v1/triz/solve` | TRIZ | ✅ 完整實作 |
| 12 | POST | `/api/v1/scamper/perform` | SCAMPER | ✅ 完整實作 |
| 13 | POST | `/api/v1/scamper/subsystem-suggestions` | SCAMPER | ✅ 完整實作 |
| 14 | POST | `/api/v1/scamper/feedback-contradictions` | SCAMPER | 🔸 501 stub |
| 15 | POST | `/api/v1/risks/analyze` | 風險分析 | ✅ 完整實作 |
| 16 | POST | `/api/v1/actions/suggest` | 行動建議 | ✅ 完整實作 |
| 17 | POST | `/api/v1/convergence/scan` | 收斂掃描 | ✅ 完整實作 |
| 18 | POST | `/api/v1/must/evaluate` | MUST 評估 | ✅ 完整實作 |
| 19 | POST | `/api/v1/pre-cad-reviews/{rid}/ai-analyze` | Pre-CAD | ✅ 完整實作 |
| 20 | POST | `/api/v1/want/criteria/seed` | WANT 評分 | ✅ 完整實作 |
| 21 | GET | `/api/v1/gates/{gate_id}/check` | Gate 檢查 | ✅ 完整實作（8 gates） |
| 22 | POST | `/api/v1/export` | 匯出 | 🔸 501 stub (v1.1) |
| 23 | POST | `/api/v1/knowledge/writeback` | 知識回寫 | 🔸 501 stub (v1.1) |
| 24 | GET | `/api/v1/health` | 健康檢查 | ✅ |

---

## WP-1: Infrastructure

| WBS | SOW 規劃 | 實際實作 | 狀態 |
|-----|----------|----------|------|
| WP-1.1 | FastAPI scaffold + middleware + error handler | FastAPI scaffold ✅ CORS middleware ✅ | ✅ 完成 |
| WP-1.2 | 27 ORM tables + Alembic migration | 29 Supabase tables + SQL migrations | ⚠️ 偏差：無 ORM，改用 Supabase migration |
| WP-1.3 | 統一 LLMService (retry + token + prompt loader) | 簡易 `call_llm_json` / `call_llm_structured` | ⚠️ 缺失：無 retry / token / prompt loader（見 ADR-003）|
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
| 記錄反證 | POST | `/assumptions/{aid}/disprove` | — | ❌ 未實作 |
| Unknown Factors CRUD | POST/GET/PUT | `/unknown-factors/*` | — | ❌ 使用 localStorage（見 ADR-002）|

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
| 矛盾回饋 | POST | `/scamper/feedback-contradictions` | `/api/v1/scamper/feedback-contradictions` | 🔸 501 stub（需 Supabase 整合）|

### WP-3.5 Contradiction Feedback Loop

| SOW API | SOW 路徑 | 實際實作 | 狀態 |
|---------|----------|----------|------|
| 回饋新矛盾 | `/scamper/feedback-contradictions` | 後端 501 stub + 前端 `useContradictionScan` hook | 🔸 前端邏輯替代，後端待整合 |

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
| 知識回寫 | POST | `/knowledge/writeback` | `/api/v1/knowledge/writeback` | 🔸 501 stub (v1.1) |
| Knowledge CRUD | — | — | — | ❌ 前端 Supabase `knowledge_entries` + `knowledge_articles` |

### WP-4.8 Export

| SOW API | Method | SOW 路徑 | 實際路徑 | 狀態 |
|---------|--------|----------|----------|------|
| 匯出 | POST | `/export` | `/api/v1/export` | 🔸 501 stub (v1.1) |

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

### 🔸 SOW 外新增的端點（4 個）

| 功能 | 實際路徑 | 說明 |
|------|----------|------|
| 收斂掃描 | `POST /api/v1/convergence/scan` | 二次矛盾偵測 + 架構健康度 |
| 匯出 | `POST /api/v1/export` | 501 stub，v1.1 實作 |
| 知識回寫 | `POST /api/v1/knowledge/writeback` | 501 stub，v1.1 實作 |
| 健康檢查 | `GET /api/v1/health` | 基礎設施 |

### ⚠️ 路徑不一致：無

所有 SOW 定義的 AI 端點路徑已 100% 對齊。

---

## 前後端 Schema 一致性

**結論：所有已實作的 24 個端點，前後端欄位完全對齊。**

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
| Phase state machine | 防止非法 Phase 轉換，`projects.phase` 可被任意設值 | Supabase `BEFORE UPDATE` trigger |

### P1 — 使用者體驗

| 缺口 | 說明 | 建議實作方式 |
|------|------|-------------|
| Unknown Factors CRUD | 目前用 localStorage，資料不持久 | Supabase 表 + 前端 hooks |
| `POST /assumptions/{aid}/disprove` | 反證工作流 | FastAPI 端點 + Supabase update |
| SCAMPER feedback-contradictions | 目前 501 stub | 整合 Supabase `contradictions` 表寫入 |

### P2 — v1.1

| 缺口 | 說明 |
|------|------|
| `POST /export` | Markdown + JSON 匯出（目前 501 stub）|
| `POST /knowledge/writeback` | 知識沉澱管線（目前 501 stub）|
| `GET /knowledge/rag/search` | RAG 知識搜尋 |
| LLM retry + token management | 見 ADR-003 |
| pytest + Playwright + Docker | 見 ADR-004 |

---

## 結論

1. **API 路徑 100% 對齊**：所有 20 個 SOW 定義的 AI 端點路徑已完全對齊，無任何路徑不一致。
2. **前後端 Schema 一致**：所有 24 個端點的前端 TypeScript 介面與後端 Pydantic Schema 欄位完全對齊。
3. **架構偏差是設計決策**：SOW 的 35+ 端點中約 24 個 CRUD 端點已由 Supabase 前端替代（ADR-001）。
4. **功能超出 SOW**：新增 4 個 SOW 未規劃的端點（Convergence、Export stub、Knowledge stub、Health）。
5. **Gate 檢查已實作**：8 個 Gate（1.1, 1.2, PG1, 2.1, 2.2, PG2, 3.2, PG3）全部透過 Supabase 查詢實作。
6. **P0 缺口**：僅剩 Phase state machine（Supabase trigger）是最急迫項目。
