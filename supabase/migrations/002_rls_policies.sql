-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security (RLS) Policies for Design Copilot Blueprint
-- ============================================================

-- ============================================================
-- 0. profiles (skip if table structure differs across environments)
-- ============================================================
-- profiles RLS is environment-specific; add user_id column if missing, then apply RLS.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1. projects (Layer 0)
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all projects" ON projects;
CREATE POLICY "Users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid()::text)
  WITH CHECK (created_by = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (created_by = auth.uid()::text);

-- ============================================================
-- 2. briefs (Layer 1 - project child)
-- ============================================================
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view briefs of own projects" ON briefs;
CREATE POLICY "Users can view briefs of own projects"
  ON briefs FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create briefs for own projects" ON briefs;
CREATE POLICY "Users can create briefs for own projects"
  ON briefs FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update briefs of own projects" ON briefs;
CREATE POLICY "Users can update briefs of own projects"
  ON briefs FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete briefs of own projects" ON briefs;
CREATE POLICY "Users can delete briefs of own projects"
  ON briefs FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 3. constraints (Layer 1 - project child)
-- ============================================================
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view constraints of own projects" ON constraints;
CREATE POLICY "Users can view constraints of own projects"
  ON constraints FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create constraints for own projects" ON constraints;
CREATE POLICY "Users can create constraints for own projects"
  ON constraints FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update constraints of own projects" ON constraints;
CREATE POLICY "Users can update constraints of own projects"
  ON constraints FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete constraints of own projects" ON constraints;
CREATE POLICY "Users can delete constraints of own projects"
  ON constraints FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 4. kpis (Layer 1 - project child)
-- ============================================================
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view kpis of own projects" ON kpis;
CREATE POLICY "Users can view kpis of own projects"
  ON kpis FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create kpis for own projects" ON kpis;
CREATE POLICY "Users can create kpis for own projects"
  ON kpis FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update kpis of own projects" ON kpis;
CREATE POLICY "Users can update kpis of own projects"
  ON kpis FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete kpis of own projects" ON kpis;
CREATE POLICY "Users can delete kpis of own projects"
  ON kpis FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 5. socratic_questions (Layer 1 - project child)
-- ============================================================
ALTER TABLE socratic_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view socratic questions of own projects" ON socratic_questions;
CREATE POLICY "Users can view socratic questions of own projects"
  ON socratic_questions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create socratic questions for own projects" ON socratic_questions;
CREATE POLICY "Users can create socratic questions for own projects"
  ON socratic_questions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update socratic questions of own projects" ON socratic_questions;
CREATE POLICY "Users can update socratic questions of own projects"
  ON socratic_questions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete socratic questions of own projects" ON socratic_questions;
CREATE POLICY "Users can delete socratic questions of own projects"
  ON socratic_questions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 6. contradictions (Layer 1 - project child)
-- ============================================================
ALTER TABLE contradictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contradictions of own projects" ON contradictions;
CREATE POLICY "Users can view contradictions of own projects"
  ON contradictions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create contradictions for own projects" ON contradictions;
CREATE POLICY "Users can create contradictions for own projects"
  ON contradictions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update contradictions of own projects" ON contradictions;
CREATE POLICY "Users can update contradictions of own projects"
  ON contradictions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete contradictions of own projects" ON contradictions;
CREATE POLICY "Users can delete contradictions of own projects"
  ON contradictions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 7. assumptions (Layer 2 - project child)
-- ============================================================
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assumptions of own projects" ON assumptions;
CREATE POLICY "Users can view assumptions of own projects"
  ON assumptions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create assumptions for own projects" ON assumptions;
CREATE POLICY "Users can create assumptions for own projects"
  ON assumptions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update assumptions of own projects" ON assumptions;
CREATE POLICY "Users can update assumptions of own projects"
  ON assumptions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete assumptions of own projects" ON assumptions;
CREATE POLICY "Users can delete assumptions of own projects"
  ON assumptions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 8. cld_nodes (Layer 2 - project child)
-- ============================================================
ALTER TABLE cld_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cld nodes of own projects" ON cld_nodes;
CREATE POLICY "Users can view cld nodes of own projects"
  ON cld_nodes FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create cld nodes for own projects" ON cld_nodes;
CREATE POLICY "Users can create cld nodes for own projects"
  ON cld_nodes FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update cld nodes of own projects" ON cld_nodes;
CREATE POLICY "Users can update cld nodes of own projects"
  ON cld_nodes FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete cld nodes of own projects" ON cld_nodes;
CREATE POLICY "Users can delete cld nodes of own projects"
  ON cld_nodes FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 9. cld_edges (Layer 2 - project child)
-- ============================================================
ALTER TABLE cld_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cld edges of own projects" ON cld_edges;
CREATE POLICY "Users can view cld edges of own projects"
  ON cld_edges FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create cld edges for own projects" ON cld_edges;
CREATE POLICY "Users can create cld edges for own projects"
  ON cld_edges FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update cld edges of own projects" ON cld_edges;
CREATE POLICY "Users can update cld edges of own projects"
  ON cld_edges FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete cld edges of own projects" ON cld_edges;
CREATE POLICY "Users can delete cld edges of own projects"
  ON cld_edges FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 10. anti_anchor_routes (Layer 3 - project child)
-- ============================================================
ALTER TABLE anti_anchor_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view anti anchor routes of own projects" ON anti_anchor_routes;
CREATE POLICY "Users can view anti anchor routes of own projects"
  ON anti_anchor_routes FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create anti anchor routes for own projects" ON anti_anchor_routes;
CREATE POLICY "Users can create anti anchor routes for own projects"
  ON anti_anchor_routes FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update anti anchor routes of own projects" ON anti_anchor_routes;
CREATE POLICY "Users can update anti anchor routes of own projects"
  ON anti_anchor_routes FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete anti anchor routes of own projects" ON anti_anchor_routes;
CREATE POLICY "Users can delete anti anchor routes of own projects"
  ON anti_anchor_routes FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 11. triz_solutions (Layer 3 - project child)
-- ============================================================
ALTER TABLE triz_solutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view triz solutions of own projects" ON triz_solutions;
CREATE POLICY "Users can view triz solutions of own projects"
  ON triz_solutions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create triz solutions for own projects" ON triz_solutions;
CREATE POLICY "Users can create triz solutions for own projects"
  ON triz_solutions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update triz solutions of own projects" ON triz_solutions;
CREATE POLICY "Users can update triz solutions of own projects"
  ON triz_solutions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete triz solutions of own projects" ON triz_solutions;
CREATE POLICY "Users can delete triz solutions of own projects"
  ON triz_solutions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 12. subsystems (Layer 3 - project child)
-- ============================================================
ALTER TABLE subsystems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subsystems of own projects" ON subsystems;
CREATE POLICY "Users can view subsystems of own projects"
  ON subsystems FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create subsystems for own projects" ON subsystems;
CREATE POLICY "Users can create subsystems for own projects"
  ON subsystems FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update subsystems of own projects" ON subsystems;
CREATE POLICY "Users can update subsystems of own projects"
  ON subsystems FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete subsystems of own projects" ON subsystems;
CREATE POLICY "Users can delete subsystems of own projects"
  ON subsystems FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 13. scamper_variants (Layer 3 - project child)
-- ============================================================
ALTER TABLE scamper_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view scamper variants of own projects" ON scamper_variants;
CREATE POLICY "Users can view scamper variants of own projects"
  ON scamper_variants FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create scamper variants for own projects" ON scamper_variants;
CREATE POLICY "Users can create scamper variants for own projects"
  ON scamper_variants FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update scamper variants of own projects" ON scamper_variants;
CREATE POLICY "Users can update scamper variants of own projects"
  ON scamper_variants FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete scamper variants of own projects" ON scamper_variants;
CREATE POLICY "Users can delete scamper variants of own projects"
  ON scamper_variants FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 14. alternatives (Layer 3 - project child)
-- ============================================================
ALTER TABLE alternatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alternatives of own projects" ON alternatives;
CREATE POLICY "Users can view alternatives of own projects"
  ON alternatives FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create alternatives for own projects" ON alternatives;
CREATE POLICY "Users can create alternatives for own projects"
  ON alternatives FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update alternatives of own projects" ON alternatives;
CREATE POLICY "Users can update alternatives of own projects"
  ON alternatives FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete alternatives of own projects" ON alternatives;
CREATE POLICY "Users can delete alternatives of own projects"
  ON alternatives FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 15. concept_routes (Layer 3 - project child)
-- ============================================================
ALTER TABLE concept_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view concept routes of own projects" ON concept_routes;
CREATE POLICY "Users can view concept routes of own projects"
  ON concept_routes FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create concept routes for own projects" ON concept_routes;
CREATE POLICY "Users can create concept routes for own projects"
  ON concept_routes FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update concept routes of own projects" ON concept_routes;
CREATE POLICY "Users can update concept routes of own projects"
  ON concept_routes FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete concept routes of own projects" ON concept_routes;
CREATE POLICY "Users can delete concept routes of own projects"
  ON concept_routes FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 16. compatibility_pairs (Layer 3 - project child)
-- ============================================================
ALTER TABLE compatibility_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view compatibility pairs of own projects" ON compatibility_pairs;
CREATE POLICY "Users can view compatibility pairs of own projects"
  ON compatibility_pairs FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create compatibility pairs for own projects" ON compatibility_pairs;
CREATE POLICY "Users can create compatibility pairs for own projects"
  ON compatibility_pairs FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update compatibility pairs of own projects" ON compatibility_pairs;
CREATE POLICY "Users can update compatibility pairs of own projects"
  ON compatibility_pairs FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete compatibility pairs of own projects" ON compatibility_pairs;
CREATE POLICY "Users can delete compatibility pairs of own projects"
  ON compatibility_pairs FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 17. evidence_matrix (Layer 4 - project child)
-- ============================================================
ALTER TABLE evidence_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view evidence matrix of own projects" ON evidence_matrix;
CREATE POLICY "Users can view evidence matrix of own projects"
  ON evidence_matrix FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create evidence matrix entries for own projects" ON evidence_matrix;
CREATE POLICY "Users can create evidence matrix entries for own projects"
  ON evidence_matrix FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update evidence matrix of own projects" ON evidence_matrix;
CREATE POLICY "Users can update evidence matrix of own projects"
  ON evidence_matrix FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete evidence matrix entries of own projects" ON evidence_matrix;
CREATE POLICY "Users can delete evidence matrix entries of own projects"
  ON evidence_matrix FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 18. risks (Layer 4 - project child)
-- ============================================================
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view risks of own projects" ON risks;
CREATE POLICY "Users can view risks of own projects"
  ON risks FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create risks for own projects" ON risks;
CREATE POLICY "Users can create risks for own projects"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update risks of own projects" ON risks;
CREATE POLICY "Users can update risks of own projects"
  ON risks FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete risks of own projects" ON risks;
CREATE POLICY "Users can delete risks of own projects"
  ON risks FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 19. decisions (Layer 4 - project child)
-- ============================================================
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view decisions of own projects" ON decisions;
CREATE POLICY "Users can view decisions of own projects"
  ON decisions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create decisions for own projects" ON decisions;
CREATE POLICY "Users can create decisions for own projects"
  ON decisions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update decisions of own projects" ON decisions;
CREATE POLICY "Users can update decisions of own projects"
  ON decisions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete decisions of own projects" ON decisions;
CREATE POLICY "Users can delete decisions of own projects"
  ON decisions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 20. want_criteria (Layer 4 - project child)
-- ============================================================
ALTER TABLE want_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view want criteria of own projects" ON want_criteria;
CREATE POLICY "Users can view want criteria of own projects"
  ON want_criteria FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create want criteria for own projects" ON want_criteria;
CREATE POLICY "Users can create want criteria for own projects"
  ON want_criteria FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update want criteria of own projects" ON want_criteria;
CREATE POLICY "Users can update want criteria of own projects"
  ON want_criteria FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete want criteria of own projects" ON want_criteria;
CREATE POLICY "Users can delete want criteria of own projects"
  ON want_criteria FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 21. want_scores (Layer 4 - project child)
-- ============================================================
ALTER TABLE want_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view want scores of own projects" ON want_scores;
CREATE POLICY "Users can view want scores of own projects"
  ON want_scores FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create want scores for own projects" ON want_scores;
CREATE POLICY "Users can create want scores for own projects"
  ON want_scores FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update want scores of own projects" ON want_scores;
CREATE POLICY "Users can update want scores of own projects"
  ON want_scores FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete want scores of own projects" ON want_scores;
CREATE POLICY "Users can delete want scores of own projects"
  ON want_scores FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 22. adverse_consequences (Layer 4 - project child)
-- ============================================================
ALTER TABLE adverse_consequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view adverse consequences of own projects" ON adverse_consequences;
CREATE POLICY "Users can view adverse consequences of own projects"
  ON adverse_consequences FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create adverse consequences for own projects" ON adverse_consequences;
CREATE POLICY "Users can create adverse consequences for own projects"
  ON adverse_consequences FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update adverse consequences of own projects" ON adverse_consequences;
CREATE POLICY "Users can update adverse consequences of own projects"
  ON adverse_consequences FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete adverse consequences of own projects" ON adverse_consequences;
CREATE POLICY "Users can delete adverse consequences of own projects"
  ON adverse_consequences FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 23. signatures (Layer 4 - project child)
-- ============================================================
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view signatures of own projects" ON signatures;
CREATE POLICY "Users can view signatures of own projects"
  ON signatures FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create signatures for own projects" ON signatures;
CREATE POLICY "Users can create signatures for own projects"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update signatures of own projects" ON signatures;
CREATE POLICY "Users can update signatures of own projects"
  ON signatures FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete signatures of own projects" ON signatures;
CREATE POLICY "Users can delete signatures of own projects"
  ON signatures FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 24. action_items (Layer 4 - project child)
-- ============================================================
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view action items of own projects" ON action_items;
CREATE POLICY "Users can view action items of own projects"
  ON action_items FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create action items for own projects" ON action_items;
CREATE POLICY "Users can create action items for own projects"
  ON action_items FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update action items of own projects" ON action_items;
CREATE POLICY "Users can update action items of own projects"
  ON action_items FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete action items of own projects" ON action_items;
CREATE POLICY "Users can delete action items of own projects"
  ON action_items FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

-- ============================================================
-- 25. knowledge_articles (Layer 5 - shared knowledge)
-- ============================================================
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all knowledge articles" ON knowledge_articles;
CREATE POLICY "Authenticated users can view all knowledge articles"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create knowledge articles" ON knowledge_articles;
CREATE POLICY "Authenticated users can create knowledge articles"
  ON knowledge_articles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update knowledge articles" ON knowledge_articles;
CREATE POLICY "Authenticated users can update knowledge articles"
  ON knowledge_articles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete knowledge articles" ON knowledge_articles;
CREATE POLICY "Authenticated users can delete knowledge articles"
  ON knowledge_articles FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 26. knowledge_entries (Layer 5 - project child)
-- ============================================================
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view knowledge entries of own projects" ON knowledge_entries;
CREATE POLICY "Users can view knowledge entries of own projects"
  ON knowledge_entries FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can create knowledge entries for own projects" ON knowledge_entries;
CREATE POLICY "Users can create knowledge entries for own projects"
  ON knowledge_entries FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update knowledge entries of own projects" ON knowledge_entries;
CREATE POLICY "Users can update knowledge entries of own projects"
  ON knowledge_entries FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete knowledge entries of own projects" ON knowledge_entries;
CREATE POLICY "Users can delete knowledge entries of own projects"
  ON knowledge_entries FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text));
