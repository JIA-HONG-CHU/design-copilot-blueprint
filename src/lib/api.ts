/**
 * API client for communicating with the FastAPI backend.
 *
 * All AI-powered features (TRIZ, Socratic, CLD, Anti-Anchor, Risk, etc.)
 * go through this client instead of using mock data + setTimeout.
 */

import type { ZodType } from "zod";

const API_PREFIX = "/api/v1";
const ENV_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function normalizeApiBaseUrl(rawBaseUrl?: string): string {
  if (!rawBaseUrl) return API_PREFIX;
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  if (/\/api\/v1$/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}${API_PREFIX}`;
}

// In dev, prefer Vite same-origin proxy to avoid "localhost" resolving to the user's browser machine.
const BASE_URL = import.meta.env.DEV ? API_PREFIX : normalizeApiBaseUrl(ENV_BASE_URL);
const REQUEST_TIMEOUT_MS = 90000;

// ─── Evidence Reference (shared across AI responses) ────────────────────────

export interface EvidenceReference {
  ref_id: string;
  ref_type: "web_search" | "uploaded_doc" | "engineering_reasoning";
  title: string;
  source: string;
  url?: string;
  snippet?: string;
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

class ApiNetworkError extends Error {
  kind: "network" | "timeout";

  constructor(kind: "network" | "timeout", message: string) {
    super(message);
    this.kind = kind;
  }
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

async function getAuthToken(): Promise<string | null> {
  if (DEV_BYPASS) return "dev-bypass-token";
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiNetworkError("timeout", `Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
    }
    if (err instanceof TypeError) {
      throw new ApiNetworkError("network", err.message);
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// ─── Runtime response validation ─────────────────────────────────────────────

interface RequestOptions<T> {
  /** Optional Zod schema — when provided, response is parsed & validated. */
  schema?: ZodType<T>;
}

const IS_DEV = import.meta.env.DEV;

/**
 * Safely parse a Response body as JSON.
 * Falls back to a descriptive ApiError when the body is not valid JSON.
 */
async function safeParseJson(res: Response, path: string): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    // Empty 2xx body — return null so callers can handle
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(
      res.status,
      `Expected JSON from ${path} but received non-JSON body: ${text.slice(0, 200)}`,
    );
  }
}

/**
 * Dev-only sanity check: warn when the parsed value doesn't look like a plain
 * object (the shape returned by 100 % of our backend endpoints).
 */
function devAssertObject(value: unknown, path: string): void {
  if (!IS_DEV) return;
  if (value === null || value === undefined) {
    console.warn(`[api] ${path}: response body is ${String(value)}`);
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    console.warn(
      `[api] ${path}: expected plain object, got ${Array.isArray(value) ? "array" : typeof value}`,
    );
  }
}

/**
 * If a Zod schema was supplied, validate the response and return the parsed
 * (and potentially transformed) value.  On failure, log a dev warning and
 * return the raw data so the app keeps working.
 */
function validateWithSchema<T>(data: unknown, schema: ZodType<T> | undefined, path: string): T {
  if (!schema) return data as T;
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (IS_DEV) {
    console.warn(`[api] ${path}: Zod validation failed`, result.error.format());
  }
  // Graceful degradation: return raw data so the UI isn't blocked.
  return data as T;
}

async function request<T>(path: string, body: unknown, opts?: RequestOptions<T>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Try JSON first (FastAPI error detail), fall back to raw text.
    const errorBody = await safeParseJsonError(res);
    throw new ApiError(res.status, errorBody);
  }
  const data = await safeParseJson(res, path);
  devAssertObject(data, path);
  return validateWithSchema(data, opts?.schema, path);
}

/**
 * Extract error payload from a non-ok response.
 * FastAPI returns `{ "detail": "..." }` for most errors — surface that string
 * when available so ApiError messages are human-readable.
 */
async function safeParseJsonError(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "unknown error");
  try {
    const json = JSON.parse(text);
    // FastAPI convention: { detail: string | object }
    if (json && typeof json === "object" && "detail" in json) {
      return json.detail;
    }
    return json;
  } catch {
    return text;
  }
}

// ─── Brief ──────────────────────────────────────────────────────────────────

export interface BriefExtractRequest {
  project_id: string;
  raw_text: string;
  file_urls?: string[];
}

export interface ExtractedConstraint {
  code: string;
  description: string;
  source: string;
  type: string;
  feasibility: string;
}

export interface ExtractedKpi {
  name: string;
  target_value: string;
  unit: string;
  measurement_method: string;
}

export interface BriefExtractResponse {
  constraints: ExtractedConstraint[];
  kpis: ExtractedKpi[];
  assumptions: string[];
  feasibility_warnings: string[];
}

export function briefExtract(body: BriefExtractRequest) {
  return request<BriefExtractResponse>("/definitions/extract", body);
}

// ─── Brief Rewrite ──────────────────────────────────────────────────────────

export interface BriefRewriteRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  kpis?: string[];
}

export interface BriefRewriteResponse {
  rewritten_mission: string;
  changes_summary: string;
  evidence_references?: EvidenceReference[];
}

export function briefRewrite(body: BriefRewriteRequest) {
  return request<BriefRewriteResponse>("/definitions/rewrite", body);
}

// ─── Constraint Feasibility Check ────────────────────────────────────────────

export interface ConstraintFeasibilityRequest {
  project_id: string;
  mission: string;
  constraints: string[];
}

export interface FeasibilityConflictResult {
  constraintA: string;
  constraintB: string;
  reason: string;
  suggestion: string;
}

export interface ConstraintFeasibilityResponse {
  status: "pass" | "warning" | "conflict";
  conflicts: FeasibilityConflictResult[];
}

export function constraintFeasibilityCheck(body: ConstraintFeasibilityRequest) {
  return request<ConstraintFeasibilityResponse>("/definitions/check-feasibility", body);
}

// ─── Constraint Suggestions ─────────────────────────────────────────────────

export interface ConstraintSuggestRequest {
  project_id: string;
  mission: string;
  existing_constraints?: string[];
}

export interface SuggestedConstraint {
  description: string;
  source: string;
  rationale: string;
  ref_ids?: string[];
}

export interface ConstraintSuggestResponse {
  suggestions: SuggestedConstraint[];
  evidence_references?: EvidenceReference[];
}

export function constraintSuggest(body: ConstraintSuggestRequest) {
  return request<ConstraintSuggestResponse>("/definitions/suggest-constraints", body);
}

// ─── KPI Suggestions ────────────────────────────────────────────────────────

export interface KpiSuggestRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  existing_kpis?: string[];
}

export interface SuggestedKpi {
  kpi_name: string;
  target_value: string;
  unit: string;
  measurement_method: string;
  rationale: string;
  ref_ids?: string[];
}

export interface KpiSuggestResponse {
  suggestions: SuggestedKpi[];
  evidence_references?: EvidenceReference[];
}

export function kpiSuggest(body: KpiSuggestRequest) {
  return request<KpiSuggestResponse>("/definitions/suggest-kpis", body);
}

// ─── 5W1H Task Definition ──────────────────────────────────────────────────

export interface TaskDef5W1HRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  kpis?: string[];
}

export interface TaskDef5W1HResponse {
  who: string;
  what: string;
  where: string;
  when: string;
  why: string;
  how: string;
  evidence_references?: EvidenceReference[];
}

export function briefGenerate5W1H(body: TaskDef5W1HRequest) {
  return request<TaskDef5W1HResponse>("/definitions/generate-5w1h", body);
}

// ─── Socratic ───────────────────────────────────────────────────────────────

export interface SocraticGenerateRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  existing_questions?: string[];
}

export interface SocraticQuestionResult {
  category: string;
  text: string;
  suggested_tag: string | null;
}

export interface SocraticGenerateResponse {
  questions: SocraticQuestionResult[];
}

export function socraticGenerate(body: SocraticGenerateRequest) {
  return request<SocraticGenerateResponse>("/questions/generate", body);
}

// ─── Socratic Follow-up & Brief Impact ─────────────────────────────────────

export interface SocraticFollowUpRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  answered_questions: { id?: string; category: string; question: string; answer: string }[];
}

export interface FollowUpItem {
  category: string;
  text: string;
  reason: string;
}

export interface SocraticFollowUpResponse {
  follow_ups: FollowUpItem[];
  depth_sufficient: boolean;
}

export function socraticFollowUp(body: SocraticFollowUpRequest) {
  return request<SocraticFollowUpResponse>("/questions/follow-up", body);
}

export interface SocraticBriefImpactRequest {
  project_id: string;
  new_mission: string;
  new_constraints?: string[];
  existing_questions: { id: string; category: string; text: string; answer?: string }[];
}

export interface AffectedQuestionItem {
  id: string;
  reason: string;
  replacement: { category: string; text: string; suggested_tag?: string | null };
}

export interface SocraticBriefImpactResponse {
  affected: AffectedQuestionItem[];
  unaffected_ids: string[];
}

export function socraticBriefImpact(body: SocraticBriefImpactRequest) {
  return request<SocraticBriefImpactResponse>("/questions/brief-impact", body);
}

// ─── Socratic Auto-Tag ──────────────────────────────────────────────────────

export interface UntaggedQuestionItem {
  id: string;
  category: string;
  text: string;
  answer: string;
}

export interface SocraticAutoTagRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  existing_assumptions?: string[];
  existing_contradictions?: string[];
  untagged_questions: UntaggedQuestionItem[];
}

export interface AutoTagSuggestionResult {
  question_id: string;
  suggested_tag: string;
  reason: string;
}

export interface SocraticAutoTagResponse {
  suggestions: AutoTagSuggestionResult[];
}

export function socraticAutoTag(body: SocraticAutoTagRequest) {
  return request<SocraticAutoTagResponse>("/questions/auto-tag", body);
}

// ─── CLD ────────────────────────────────────────────────────────────────────

export interface CldGenerateRequest {
  project_id: string;
  contradictions: string[];
  assumptions: string[];
  mission?: string;
  constraints?: string[];
  kpis?: string[];
}

export interface CldNode {
  id: string;
  label: string;
  type: string;
}

export interface CldEdge {
  from_node: string;
  to_node: string;
  polarity: string;
  source_id: string;
}

export interface CldLoop {
  id: string;
  type: string;
  node_ids: string[];
}

export interface CldBreakpoint {
  node_id: string;
  rationale: string;
}

export interface CldGenerateResponse {
  nodes: CldNode[];
  edges: CldEdge[];
  loops: CldLoop[];
  breakpoints: CldBreakpoint[];
}

export function cldGenerate(body: CldGenerateRequest) {
  return request<CldGenerateResponse>("/causal-loops/generate", body);
}

// ─── Anti-Anchor ────────────────────────────────────────────────────────────

export interface AntiAnchorGenerateRequest {
  project_id: string;
  mission: string;
  current_constraints: string[];
  existing_alternatives?: string[];
}

export interface AntiAnchorRouteResult {
  name: string;
  description: string;
  is_non_typical: boolean;
  rationale: string;
}

export interface AntiAnchorGenerateResponse {
  routes: AntiAnchorRouteResult[];
}

export function antiAnchorGenerate(body: AntiAnchorGenerateRequest) {
  return request<AntiAnchorGenerateResponse>("/alternatives/anti-anchor", body);
}

// ─── TRIZ ───────────────────────────────────────────────────────────────────

export interface TrizSolveRequest {
  project_id: string;
  contradiction_id: string;
  natural_description: string;
  improving_param?: number | null;
  worsening_param?: number | null;
  physical_contradiction?: string | null;
  type?: "TC" | "PC";
}

export interface TrizSuggestionResult {
  path: string;
  principle_number: number | null;
  principle_name: string;
  suggestion: string;
  affected_modules: string[];
  secondary_contradictions: string[];
}

export interface TrizSolveResponse {
  mapped_improving: number | null;
  mapped_worsening: number | null;
  candidate_principles: number[];
  suggestions: TrizSuggestionResult[];
}

export function trizSolve(body: TrizSolveRequest) {
  return request<TrizSolveResponse>("/triz/solve", body);
}

// ─── SCAMPER ────────────────────────────────────────────────────────────────

export interface ScamperTransformRequest {
  project_id: string;
  subsystem_name: string;
  subsystem_description: string;
  related_contradictions?: string[];
}

export interface ScamperVariantResult {
  action: string;
  description: string;
  potential_benefits: string;
  new_contradictions: string[];
}

export interface ScamperTransformResponse {
  variants: ScamperVariantResult[];
}

export function scamperTransform(body: ScamperTransformRequest) {
  return request<ScamperTransformResponse>("/scamper/perform", body);
}

// ─── Risk ───────────────────────────────────────────────────────────────────

export interface RiskAnalyzeRequest {
  project_id: string;
  alternative_name: string;
  mechanism: string;
  assumptions?: string[];
}

export interface RiskSuggestionResult {
  description: string;
  failure_mode: string;
  probability: number;
  severity: number;
  mitigation: string;
}

export interface RiskAnalyzeResponse {
  risks: RiskSuggestionResult[];
}

export function riskAnalyze(body: RiskAnalyzeRequest) {
  return request<RiskAnalyzeResponse>("/risks/analyze", body);
}

// ─── Action ─────────────────────────────────────────────────────────────────

export interface ActionSuggestRequest {
  project_id: string;
  selected_alternative: string;
  rationale: string;
  risks?: string[];
}

export interface ActionSuggestionResult {
  description: string;
  assignee_role: string;
  suggested_due_days: number;
}

export interface ActionSuggestResponse {
  actions: ActionSuggestionResult[];
}

export function actionSuggest(body: ActionSuggestRequest) {
  return request<ActionSuggestResponse>("/actions/suggest", body);
}

// ─── Convergence ────────────────────────────────────────────────────────────

export interface ConvergenceAlternativeInput {
  id: string;
  name: string;
  mechanism: string;
  source: string;
  resolves_contradiction_ids: string[];
}

export interface ConvergenceContradictionInput {
  id: string;
  natural_description: string;
  severity: string;
  resolved: boolean;
  type: string | null;
  improving_param: number | null;
  worsening_param: number | null;
  engineering_statement: string;
  physical_contradiction: string;
}

export interface ConvergenceScanRequest {
  project_id: string;
  alternatives?: ConvergenceAlternativeInput[];  // optional — empty for Phase A
  contradictions: ConvergenceContradictionInput[];
  mission?: string;
  constraints?: string[];
  kpis?: string[];
  phase?: "A" | "B";  // "A" = contradiction-only, "B" = full cross-check
}

export interface SecondaryContradictionResult {
  description: string;
  severity: string;
  source_alternative: string;
  type: string;
  improving_param: number | null;
  worsening_param: number | null;
  reasoning: string;
}

export interface ConvergenceScanResponse {
  new_contradictions: SecondaryContradictionResult[];
  convergence_score: number;  // 0-100
  architecture_health: string;
  force_pause: boolean;
  pause_reason: string;
  reasoning_trace: string;
  phase: "A" | "B";
}

export function convergenceScan(body: ConvergenceScanRequest) {
  return request<ConvergenceScanResponse>("/convergence/scan", body);
}

// ─── Validation Passport ─────────────────────────────────────────────────────

export interface ValidationPassportRequest {
  project_id: string;
  solution_name: string;
  mechanism: string;
  source?: string;
  constraints?: string[];
  kpis?: string[];
}

export interface ValidationPassportAssumptionResult {
  content: string;
  category: string;
  evidence_level: string;
  worst_consequence: string;
  worst_severity: string;
  suggested_experiment: string;
}

export interface ValidationPassportResult {
  assumptions: ValidationPassportAssumptionResult[];
  weak_points: string[];
  required_verifications: string[];
  cross_domain_source: string;
  confidence_level: number;
}

export interface ValidationPassportResponse {
  validation_passport: ValidationPassportResult;
}

export function validationPassportGenerate(body: ValidationPassportRequest) {
  return request<ValidationPassportResponse>("/alternatives/validation-passport", body);
}

// ─── MUST Evaluation ────────────────────────────────────────────────────────

export interface MustCriterionConfig {
  id: string;
  label: string;
  source: string;
  threshold?: string;
}

export interface MustEvaluateRequest {
  project_id: string;
  alternative_name: string;
  mechanism: string;
  must_criteria: MustCriterionConfig[];
  constraints?: string[];
  kpis?: string[];
}

export interface MustCriterionResult {
  id: string;
  label: string;
  passed: boolean | null;
  confidence: number;
  reasoning: string;
  evidence_sources: string[];
}

export interface MustEvaluateResponse {
  criteria_results: MustCriterionResult[];
  overall_pass: boolean | null;
  summary: string;
}

export function mustEvaluate(body: MustEvaluateRequest) {
  return request<MustEvaluateResponse>("/must/evaluate", body);
}

// ─── Contradiction Formalization ────────────────────────────────────────────

export interface ContradictionFormalizeRequest {
  project_id: string;
  contradiction_id: string;
  natural_description: string;
  mission?: string;
  constraints?: string[];
  kpis?: string[];
}

export interface ContradictionFormalizeResponse {
  engineering_statement: string;
  improving_param: number | null;
  worsening_param: number | null;
  physical_contradiction: string | null;
  pc_attribute_a: string | null;
  pc_attribute_not_a: string | null;
  type: "TC" | "PC";
  confidence: number;
}

export function contradictionFormalize(body: ContradictionFormalizeRequest) {
  return request<ContradictionFormalizeResponse>(`/contradictions/${body.contradiction_id}/formalize`, body);
}

// ─── Assumption Extraction ─────────────────────────────────────────────────

export interface AssumptionExtractRequest {
  project_id: string;
  questions_and_answers?: Record<string, unknown>[];
  mission?: string;
  constraints?: string[];
  kpis?: string[];
  existing_assumptions?: string[];
}

export interface ExtractedAssumption {
  content: string;
  source: string;
  worst_consequence: string;
  worst_severity: string;
}

export interface AssumptionExtractResponse {
  assumptions: ExtractedAssumption[];
}

export function assumptionExtract(body: AssumptionExtractRequest) {
  return request<AssumptionExtractResponse>("/assumptions/extract", body);
}

// ─── SCAMPER Subsystem Suggestions ─────────────────────────────────────────

export interface SubsystemSuggestRequest {
  project_id: string;
  mission: string;
  contradictions?: string[];
  existing_subsystems?: string[];
}

export interface SuggestedSubsystem {
  name: string;
  reason: string;
  related_contradictions: string[];
}

export interface SubsystemSuggestResponse {
  subsystems: SuggestedSubsystem[];
}

export function scamperSubsystemSuggest(body: SubsystemSuggestRequest) {
  return request<SubsystemSuggestResponse>("/scamper/subsystem-suggestions", body);
}

// ─── SCAMPER Feedback Contradictions ───────────────────────────────────────

export interface ScamperFeedbackRequest {
  project_id: string;
  new_contradictions: Record<string, unknown>[];
}

export interface ScamperFeedbackResponse {
  created_count: number;
  deduplicated_count: number;
  contradiction_ids: string[];
}

export function scamperFeedbackContradictions(body: ScamperFeedbackRequest) {
  return request<ScamperFeedbackResponse>("/scamper/feedback-contradictions", body);
}

// ─── Pre-CAD AI Analysis ───────────────────────────────────────────────────

export interface PreCadAnalyzeRequest {
  project_id: string;
  alternative_name: string;
  mechanism: string;
  constraints?: string[];
}

export interface PreCadAnalyzeResponse {
  spatial_score: number;
  cost_score: number;
  safety_score: number;
  decoupling_score: number;
  supply_score: number;
  overall_pass: boolean;
  analysis: string;
  evidence_references?: EvidenceReference[];
}

export function preCadAnalyze(rid: string, body: PreCadAnalyzeRequest) {
  return request<PreCadAnalyzeResponse>(`/pre-cad-reviews/${rid}/ai-analyze`, body);
}

// ─── WANT Criteria Seed ────────────────────────────────────────────────────

export interface WantSeedRequest {
  project_id: string;
  mission: string;
  constraints?: string[];
  kpis?: string[];
}

export interface SuggestedWantCriterion {
  name: string;
  description: string;
  weight: number;
  anchors: Record<string, string>;
}

export interface WantSeedResponse {
  criteria: SuggestedWantCriterion[];
}

export function wantCriteriaSeed(body: WantSeedRequest) {
  return request<WantSeedResponse>("/want/criteria/seed", body);
}

// ─── Gate Check ────────────────────────────────────────────────────────────

export interface GateCheckItem {
  label: string;
  met: boolean;
  detail?: string;
}

export interface GateCheckResponse {
  gate_id: string;
  passed: boolean;
  failed_reasons: string[];
  checklist_items: GateCheckItem[];
}

async function requestGet<T>(path: string, opts?: RequestOptions<T>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) {
    const errorBody = await safeParseJsonError(res);
    throw new ApiError(res.status, errorBody);
  }
  const data = await safeParseJson(res, path);
  devAssertObject(data, path);
  return validateWithSchema(data, opts?.schema, path);
}

export function gateCheck(gateId: string, projectId: string) {
  return requestGet<GateCheckResponse>(`/gates/${gateId}/check?project_id=${encodeURIComponent(projectId)}`);
}

export interface BackendHealthCheckResult {
  ok: boolean;
  message: string;
}

export async function checkBackendHealth(): Promise<BackendHealthCheckResult> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/health`, { method: "GET" });
    if (!res.ok) {
      const detail = await safeParseJsonError(res);
      const suffix = typeof detail === "string" ? `: ${detail}` : "";
      return { ok: false, message: `Health check 回應異常（HTTP ${res.status}）${suffix}` };
    }
    // Validate the response body is actually parseable JSON
    const data = await safeParseJson(res, "/health");
    if (data && typeof data === "object" && "status" in data) {
      return { ok: true, message: "後端連線正常" };
    }
    return { ok: true, message: "後端連線正常（回應格式非預期，但連線成功）" };
  } catch (err) {
    return { ok: false, message: getApiErrorMessage(err, "後端連線檢查") };
  }
}

export function getApiErrorMessage(error: unknown, actionLabel = "操作"): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return `${actionLabel}失敗：未授權（請重新登入或檢查 DEV_BYPASS）`;
    if (error.status === 403) return `${actionLabel}失敗：權限不足`;
    if (error.status === 404) return `${actionLabel}失敗：API 路徑不存在`;
    if (error.status >= 500) return `${actionLabel}失敗：後端服務異常（HTTP ${error.status}）`;
    return `${actionLabel}失敗：請求錯誤（HTTP ${error.status}）`;
  }
  if (error instanceof ApiNetworkError) {
    if (error.kind === "timeout") return `${actionLabel}失敗：請求逾時，請稍後重試`;
    return `${actionLabel}失敗：網路連線異常（無法連上後端）`;
  }
  if (error instanceof Error) {
    return `${actionLabel}失敗：${error.message}`;
  }
  return `${actionLabel}失敗：未知錯誤`;
}

export { ApiError, ApiNetworkError, type RequestOptions };
