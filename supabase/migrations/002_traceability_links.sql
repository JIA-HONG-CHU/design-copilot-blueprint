-- Migration: Traceability links — Socratic → Contradiction → Assumption
-- Closes 4 traceability gaps identified via first-principles analysis.

-- 1. Contradictions: track which Socratic question they came from
ALTER TABLE contradictions
  ADD COLUMN IF NOT EXISTS source_question_id UUID REFERENCES socratic_questions(id),
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
  -- source_type: 'socratic' | 'manual' | 'scamper_feedback' | 'convergence'

CREATE INDEX IF NOT EXISTS idx_contradictions_source_question
  ON contradictions(source_question_id) WHERE source_question_id IS NOT NULL;

-- 2. N:N link table: Contradiction ↔ Assumption
--    Enables: "if assumption X is invalidated, which contradictions are affected?"
CREATE TABLE IF NOT EXISTS contradiction_assumption_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contradiction_id UUID NOT NULL REFERENCES contradictions(id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'depends_on',
    -- depends_on: contradiction relies on this assumption being true
    -- challenges: contradiction challenges this assumption
    -- derived_from: contradiction was derived from this assumption's analysis
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contradiction_id, assumption_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_contradiction ON contradiction_assumption_links(contradiction_id);
CREATE INDEX IF NOT EXISTS idx_cal_assumption ON contradiction_assumption_links(assumption_id);

-- RLS: same pattern as other project-child tables
ALTER TABLE contradiction_assumption_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_contradiction_assumption_links_select" ON contradiction_assumption_links;
CREATE POLICY "rls_contradiction_assumption_links_select"
  ON contradiction_assumption_links FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "rls_contradiction_assumption_links_insert" ON contradiction_assumption_links;
CREATE POLICY "rls_contradiction_assumption_links_insert"
  ON contradiction_assumption_links FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "rls_contradiction_assumption_links_delete" ON contradiction_assumption_links;
CREATE POLICY "rls_contradiction_assumption_links_delete"
  ON contradiction_assumption_links FOR DELETE TO authenticated
  USING (true);
