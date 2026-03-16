-- ============================================================
-- Design Copilot Blueprint — Full Schema Migration
-- Generated from WBS §2 資料庫 Schema 規劃
-- 26 new tables + 3 existing tables extended
-- ============================================================

-- ============================================================
-- Utility: updated_at auto-update trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ############################################################
-- Layer 0：專案骨幹
-- ############################################################

-- 1. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',       -- in_progress | completed | archived
  phase TEXT NOT NULL DEFAULT 'Phase I',
  progress INTEGER DEFAULT 0,
  mission TEXT,
  phase_progress JSONB DEFAULT '{}',
  quick_stats JSONB DEFAULT '{}',
  gates_passed INTEGER DEFAULT 0,
  gates_total INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Layer 1：Step 1 — 問題界定
-- ############################################################

-- 2. briefs (TaskDefinition)
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  mission TEXT,
  task_definition_5w1h JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TRIGGER trg_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. constraints
CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  constraint_code TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT,
  type TEXT NOT NULL DEFAULT 'hard',                -- hard | soft | non_goal
  feasibility TEXT,                                 -- pass | warning | fail
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_constraints_updated_at
  BEFORE UPDATE ON constraints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. kpis
CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  target_value TEXT,
  unit TEXT,
  measurement_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_kpis_updated_at
  BEFORE UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. socratic_questions
CREATE TABLE IF NOT EXISTS socratic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                           -- clarification | assumption | consequence | counter | origin | action | reframing
  text TEXT NOT NULL,
  answer TEXT,
  tagged_as_assumption BOOLEAN DEFAULT false,
  tagged_as_contradiction BOOLEAN DEFAULT false,
  ai_suggested_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_socratic_questions_updated_at
  BEFORE UPDATE ON socratic_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. contradictions
CREATE TABLE IF NOT EXISTS contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  natural_description TEXT,
  improving_param INTEGER,
  worsening_param INTEGER,
  engineering_statement TEXT,
  physical_contradiction TEXT,
  type TEXT,                                        -- TC | PC | SF
  severity TEXT NOT NULL DEFAULT 'minor',           -- fatal | major | minor
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_contradictions_updated_at
  BEFORE UPDATE ON contradictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Layer 2：Step 1.2 — 假設管理
-- ############################################################

-- 7. assumptions
CREATE TABLE IF NOT EXISTS assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_type TEXT,                                 -- explore_tag | manual | ai_suggest | unknown_convert
  worst_consequence TEXT,
  worst_severity TEXT,                              -- critical | high | medium | low
  min_validation TEXT,
  validation_cost TEXT,
  validation_method TEXT,
  estimated_days INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',            -- pending | validating | validated | refuted
  verification_stage TEXT DEFAULT 'unplanned',       -- unplanned | planned | in_progress | completed | refuted
  impact_scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_assumptions_updated_at
  BEFORE UPDATE ON assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. cld_nodes (Causal Loop Diagram nodes)
CREATE TABLE IF NOT EXISTS cld_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  x DOUBLE PRECISION DEFAULT 0,
  y DOUBLE PRECISION DEFAULT 0,
  node_type TEXT DEFAULT 'variable',                -- assumption | variable
  assumption_id UUID REFERENCES assumptions(id),
  is_leverage BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_cld_nodes_updated_at
  BEFORE UPDATE ON cld_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. cld_edges (Causal Loop Diagram edges)
CREATE TABLE IF NOT EXISTS cld_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  from_node UUID REFERENCES cld_nodes(id) ON DELETE CASCADE,
  to_node UUID REFERENCES cld_nodes(id) ON DELETE CASCADE,
  polarity TEXT DEFAULT '+',                        -- + | -
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_cld_edges_updated_at
  BEFORE UPDATE ON cld_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Layer 3：Step 2 — 解方探索
-- ############################################################

-- 10. anti_anchor_routes
CREATE TABLE IF NOT EXISTS anti_anchor_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_non_typical BOOLEAN DEFAULT true,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_anti_anchor_routes_updated_at
  BEFORE UPDATE ON anti_anchor_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. triz_solutions
CREATE TABLE IF NOT EXISTS triz_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contradiction_id UUID REFERENCES contradictions(id),
  path TEXT NOT NULL,                               -- TC | PC | SF
  principle_number INTEGER,
  principle_name TEXT,
  suggestion TEXT,
  status TEXT DEFAULT 'pending',                    -- adopted | edited | skipped | pending
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_triz_solutions_updated_at
  BEFORE UPDATE ON triz_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. subsystems
CREATE TABLE IF NOT EXISTS subsystems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reason TEXT,
  related_contradictions TEXT[],                    -- contradiction IDs
  confirmed BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES subsystems(id),
  interfaces TEXT,
  source TEXT DEFAULT 'rd',                         -- rd | ai | ai_edited
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_subsystems_updated_at
  BEFORE UPDATE ON subsystems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. scamper_variants
CREATE TABLE IF NOT EXISTS scamper_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  subsystem_id UUID REFERENCES subsystems(id),
  action TEXT NOT NULL,                             -- S | C | A | M | P | E | R
  description TEXT,
  adopted BOOLEAN DEFAULT false,
  new_contradictions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_scamper_variants_updated_at
  BEFORE UPDATE ON scamper_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. alternatives (Concept Routes 前身)
CREATE TABLE IF NOT EXISTS alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mechanism TEXT,
  source TEXT,                                      -- triz_tc | triz_pc | triz_sf | scamper | manual | ai_integrated
  key_assumption_ids TEXT[],
  must_scores JSONB DEFAULT '{}',
  interface_contract JSONB DEFAULT '{}',
  pre_cad_scores JSONB DEFAULT '{}',
  overall_pass BOOLEAN,
  cad_status TEXT DEFAULT 'not_started',            -- not_started | in_progress | completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_alternatives_updated_at
  BEFORE UPDATE ON alternatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. concept_routes (多解採納)
CREATE TABLE IF NOT EXISTS concept_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  route_type TEXT NOT NULL DEFAULT 'single',        -- single | composite
  composition JSONB DEFAULT '[]',
  composition_rationale TEXT,
  anti_pattern_warnings TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_concept_routes_updated_at
  BEFORE UPDATE ON concept_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. compatibility_pairs (相容性矩陣)
CREATE TABLE IF NOT EXISTS compatibility_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  solution_a_id TEXT NOT NULL,
  solution_b_id TEXT NOT NULL,
  result TEXT NOT NULL,                             -- compatible | exclusive | needs_verification
  adoption_type TEXT,                               -- M1 | M2 | M3 | M4 | M5
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_compatibility_pairs_updated_at
  BEFORE UPDATE ON compatibility_pairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Layer 4：Step 3 — 審查與決策
-- ############################################################

-- 17. evidence_matrix
CREATE TABLE IF NOT EXISTS evidence_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assumption_code TEXT NOT NULL,
  summary TEXT,
  current_level TEXT DEFAULT 'E0',                  -- E0 | E1 | E2 | E3 | E4
  is_north_star BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_evidence_matrix_updated_at
  BEFORE UPDATE ON evidence_matrix
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. risks
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  failure_mode TEXT,
  probability INTEGER DEFAULT 1,                    -- 1-5
  severity INTEGER DEFAULT 1,                       -- 1-5
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. experiments — 建立完整表（新環境）或擴展既有表
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,
  assumption_code TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Plan',
  result TEXT,
  linked_assumptions TEXT[],
  evidence_level TEXT,
  method TEXT,
  success_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 若表已存在但缺少新欄位，補上
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS linked_assumptions TEXT[];
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS evidence_level TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS success_criteria TEXT;

CREATE TRIGGER set_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20. decisions
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  selected_alternative_id UUID REFERENCES alternatives(id),
  selected_alternative_name TEXT,
  rationale TEXT,
  risk_acceptance TEXT,
  decision_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',                      -- draft | confirmed | signed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 21. want_criteria
CREATE TABLE IF NOT EXISTS want_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER DEFAULT 5,                         -- 1-10
  description TEXT,
  anchors TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_want_criteria_updated_at
  BEFORE UPDATE ON want_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 22. want_scores
CREATE TABLE IF NOT EXISTS want_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES want_criteria(id),
  alternative_id UUID REFERENCES alternatives(id),
  score INTEGER DEFAULT 0,
  evidence TEXT,
  weighted_total DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_want_scores_updated_at
  BEFORE UPDATE ON want_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 23. adverse_consequences
CREATE TABLE IF NOT EXISTS adverse_consequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  alternative_id UUID REFERENCES alternatives(id),
  description TEXT NOT NULL,
  probability TEXT,                                 -- high | medium | low
  severity TEXT,                                    -- high | medium | low
  level TEXT,                                       -- L | M | H | H*
  mitigation TEXT,
  risk_artifact_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_adverse_consequences_updated_at
  BEFORE UPDATE ON adverse_consequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 24. signatures
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES decisions(id),
  name TEXT NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'pending',                    -- pending | signed | rejected
  signed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_signatures_updated_at
  BEFORE UPDATE ON signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 25. action_items
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES decisions(id),
  description TEXT NOT NULL,
  assignee TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Layer 5：知識管理
-- ############################################################

-- 26. knowledge_articles
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,                           -- playbook | case-study | template | convergence-pattern
  tags TEXT[],
  author TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  content TEXT,
  related_links JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 27. knowledge_entries (Feynman 產出)
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,                         -- decision_record | experiment_result | contradiction_resolution | failure_mode | design_rule | best_practice
  title TEXT NOT NULL,
  content TEXT,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_knowledge_entries_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################
-- Indexes: project_id on all child tables for fast lookups
-- ############################################################

-- Layer 1
CREATE INDEX IF NOT EXISTS idx_briefs_project_id ON briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_constraints_project_id ON constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_kpis_project_id ON kpis(project_id);
CREATE INDEX IF NOT EXISTS idx_socratic_questions_project_id ON socratic_questions(project_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_project_id ON contradictions(project_id);

-- Layer 2
CREATE INDEX IF NOT EXISTS idx_assumptions_project_id ON assumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_cld_nodes_project_id ON cld_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_cld_edges_project_id ON cld_edges(project_id);

-- Layer 3
CREATE INDEX IF NOT EXISTS idx_anti_anchor_routes_project_id ON anti_anchor_routes(project_id);
CREATE INDEX IF NOT EXISTS idx_triz_solutions_project_id ON triz_solutions(project_id);
CREATE INDEX IF NOT EXISTS idx_triz_solutions_contradiction_id ON triz_solutions(contradiction_id);
CREATE INDEX IF NOT EXISTS idx_subsystems_project_id ON subsystems(project_id);
CREATE INDEX IF NOT EXISTS idx_scamper_variants_project_id ON scamper_variants(project_id);
CREATE INDEX IF NOT EXISTS idx_scamper_variants_subsystem_id ON scamper_variants(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_alternatives_project_id ON alternatives(project_id);
CREATE INDEX IF NOT EXISTS idx_concept_routes_project_id ON concept_routes(project_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_pairs_project_id ON compatibility_pairs(project_id);

-- Layer 4
CREATE INDEX IF NOT EXISTS idx_evidence_matrix_project_id ON evidence_matrix(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_want_criteria_project_id ON want_criteria(project_id);
CREATE INDEX IF NOT EXISTS idx_want_scores_project_id ON want_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_want_scores_criterion_id ON want_scores(criterion_id);
CREATE INDEX IF NOT EXISTS idx_want_scores_alternative_id ON want_scores(alternative_id);
CREATE INDEX IF NOT EXISTS idx_adverse_consequences_project_id ON adverse_consequences(project_id);
CREATE INDEX IF NOT EXISTS idx_adverse_consequences_alternative_id ON adverse_consequences(alternative_id);
CREATE INDEX IF NOT EXISTS idx_signatures_project_id ON signatures(project_id);
CREATE INDEX IF NOT EXISTS idx_signatures_decision_id ON signatures(decision_id);
CREATE INDEX IF NOT EXISTS idx_action_items_project_id ON action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_action_items_decision_id ON action_items(decision_id);

-- Layer 5
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_slug ON knowledge_articles(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_project_id ON knowledge_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_asset_type ON knowledge_entries(asset_type);

-- ============================================================
-- End of migration
-- ============================================================
