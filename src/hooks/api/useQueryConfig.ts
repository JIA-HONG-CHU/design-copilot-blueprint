/**
 * Shared React Query configuration
 *
 * Centralizes query key factories and default options
 * to ensure consistent caching and invalidation across the app.
 */

/**
 * Query key factory — provides type-safe, consistent cache keys.
 *
 * Convention: ['table-name'] for lists, ['table-name', id] for details.
 * Follows the pattern from §7 of WBS_Mock_To_Live_Migration.md.
 */
export const queryKeys = {
  // Layer 0: Project backbone
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
    stats: (id: string) => ['projects', id, 'stats'] as const,
  },

  // Layer 1: Step 1 — Problem Definition
  briefs: {
    all: ['briefs'] as const,
    detail: (projectId: string) => ['briefs', projectId] as const,
  },
  constraints: {
    all: ['constraints'] as const,
    byProject: (projectId: string) => ['constraints', projectId] as const,
  },
  kpis: {
    all: ['kpis'] as const,
    byProject: (projectId: string) => ['kpis', projectId] as const,
  },
  socratic_questions: {
    all: ['socratic_questions'] as const,
    byProject: (projectId: string) => ['socratic_questions', projectId] as const,
  },
  contradictions: {
    all: ['contradictions'] as const,
    byProject: (projectId: string) => ['contradictions', projectId] as const,
    detail: (id: string) => ['contradictions', 'detail', id] as const,
  },

  // Layer 2: Step 1.2 — Assumption Management
  assumptions: {
    all: ['assumptions'] as const,
    byProject: (projectId: string) => ['assumptions', projectId] as const,
    detail: (id: string) => ['assumptions', 'detail', id] as const,
  },
  cld_nodes: {
    all: ['cld_nodes'] as const,
    byProject: (projectId: string) => ['cld_nodes', projectId] as const,
  },
  cld_edges: {
    all: ['cld_edges'] as const,
    byProject: (projectId: string) => ['cld_edges', projectId] as const,
  },

  // Layer 3: Step 2 — Solution Exploration
  anti_anchor_routes: {
    all: ['anti_anchor_routes'] as const,
    byProject: (projectId: string) => ['anti_anchor_routes', projectId] as const,
  },
  triz_solutions: {
    all: ['triz_solutions'] as const,
    byProject: (projectId: string) => ['triz_solutions', projectId] as const,
  },
  subsystems: {
    all: ['subsystems'] as const,
    byProject: (projectId: string) => ['subsystems', projectId] as const,
  },
  scamper_variants: {
    all: ['scamper_variants'] as const,
    byProject: (projectId: string) => ['scamper_variants', projectId] as const,
  },
  alternatives: {
    all: ['alternatives'] as const,
    byProject: (projectId: string) => ['alternatives', projectId] as const,
    detail: (id: string) => ['alternatives', 'detail', id] as const,
  },
  concept_routes: {
    all: ['concept_routes'] as const,
    byProject: (projectId: string) => ['concept_routes', projectId] as const,
  },
  compatibility_pairs: {
    all: ['compatibility_pairs'] as const,
    byProject: (projectId: string) => ['compatibility_pairs', projectId] as const,
  },

  // Layer 4: Step 3 — Review & Decision
  evidence_matrix: {
    all: ['evidence_matrix'] as const,
    byProject: (projectId: string) => ['evidence_matrix', projectId] as const,
  },
  risks: {
    all: ['risks'] as const,
    byProject: (projectId: string) => ['risks', projectId] as const,
  },
  decisions: {
    all: ['decisions'] as const,
    byProject: (projectId: string) => ['decisions', projectId] as const,
  },
  want_criteria: {
    all: ['want_criteria'] as const,
    byProject: (projectId: string) => ['want_criteria', projectId] as const,
  },
  want_scores: {
    all: ['want_scores'] as const,
    byProject: (projectId: string) => ['want_scores', projectId] as const,
  },
  adverse_consequences: {
    all: ['adverse_consequences'] as const,
    byProject: (projectId: string) => ['adverse_consequences', projectId] as const,
  },
  signatures: {
    all: ['signatures'] as const,
    byProject: (projectId: string) => ['signatures', projectId] as const,
  },
  action_items: {
    all: ['action_items'] as const,
    byProject: (projectId: string) => ['action_items', projectId] as const,
  },

  // Layer 5: Knowledge Management
  knowledge_articles: {
    all: ['knowledge_articles'] as const,
    bySlug: (slug: string) => ['knowledge_articles', slug] as const,
  },
  knowledge_entries: {
    all: ['knowledge_entries'] as const,
    byProject: (projectId: string) => ['knowledge_entries', projectId] as const,
  },
  constraint_labels: {
    byProject: (projectId: string) => ['constraint_labels', projectId] as const,
    historyByProject: (projectId: string) => ['constraint_labels', projectId, 'history'] as const,
  },

  // Evidence entries (structured measurement logs)
  evidence_entries: {
    all: ['evidence_entries'] as const,
    byProject: (projectId: string) => ['evidence_entries', projectId] as const,
    byKpi: (kpiId: string) => ['evidence_entries', 'kpi', kpiId] as const,
  },

  // Existing tables
  experiments: {
    all: ['experiments'] as const,
    byProject: (projectId: string) => ['experiments', projectId] as const,
    byAssumptionCode: (code: string) => ['experiments', 'assumption', code] as const,
  },

  // Track page (Kanban view of assumptions + unknown factors)
  track: {
    assumptions: (projectId: string) => ['track', 'assumptions', projectId] as const,
    unknownFactors: (projectId: string) => ['track', 'unknown_factors', projectId] as const,
  },
} as const;

/**
 * Default query options applied to all useSupabaseQuery calls.
 *
 * - staleTime: 30 seconds — data is considered fresh for 30s after fetch
 * - retry: 2 — retry failed requests up to 2 times before showing error
 */
export const defaultQueryOptions = {
  staleTime: 30 * 1000, // 30 seconds
  retry: 2,
} as const;
