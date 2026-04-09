-- ============================================================================
-- Migration 010: TRIZ Layered Drill-Down (v7)
--
-- WBS refs:
--   docs/e2e/module/TRIZ_Layered_Drilldown_Development_WBS.md §1.5, §11.6
--   docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §5 schema
--   docs/e2e/TRIZ_Multi_Solution_Adoption_Strategy.md v1.1 §4.2
--
-- Changes:
--   1. Extend `concept_routes` to support `route_type='layered'` (M6 drill-down).
--      - Add `layered_solution` JSONB column carrying LayeredConceptRouteMeta.
--      - Add CHECK constraint enforcing the three known route types.
--   2. New `layered_triz_solutions` table persisting LayeredTrizSolution objects
--      (one per contradiction) so that the Decision Hub can reference them by
--      `lts_id` and Phase B can honour `phase_b_directive`.
--
-- Rollback:
--   DROP TABLE IF EXISTS layered_triz_solutions CASCADE;
--   ALTER TABLE concept_routes DROP CONSTRAINT IF EXISTS concept_routes_route_type_check;
--   ALTER TABLE concept_routes DROP COLUMN IF EXISTS layered_solution;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1.  concept_routes extension
-- ----------------------------------------------------------------------------

ALTER TABLE concept_routes
  ADD COLUMN IF NOT EXISTS layered_solution JSONB;

-- Back-compat: rows created before this migration keep route_type='single' or
-- 'composite'. New values only ever include 'layered'. The CHECK constraint
-- is additive and won't break historical rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'concept_routes'
      AND constraint_name = 'concept_routes_route_type_check'
  ) THEN
    ALTER TABLE concept_routes
      ADD CONSTRAINT concept_routes_route_type_check
      CHECK (route_type IN ('single', 'composite', 'layered'));
  END IF;
END $$;

COMMENT ON COLUMN concept_routes.layered_solution IS
  'v7 M6: When route_type=layered, carries LayeredConceptRouteMeta '
  '({ltsId, adoptedLayers, availableLayers, recommendedRoute, fallbackRoute, '
  'adoptionMode, phaseBDirective}). NULL for single/composite routes.';

-- ----------------------------------------------------------------------------
-- 2.  layered_triz_solutions table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS layered_triz_solutions (
  id TEXT PRIMARY KEY,                             -- e.g. "LTS-EBIKE-012"
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contradiction_id TEXT NOT NULL,                  -- FK-by-name to contradictions.id
  contradiction_natural_description TEXT,
  severity TEXT NOT NULL DEFAULT 'unknown'
    CHECK (severity IN ('fatal', 'major', 'minor', 'unknown')),

  -- Three layer payloads as JSONB. Structure mirrors
  -- backend/app/models/schemas.py::L1Surface / L2RootCause / L3StructuralCheck
  l1_surface JSONB NOT NULL,
  l2_root_cause JSONB,                             -- NULL when condition not met / quick_mode
  l3_structural_check JSONB NOT NULL,

  differential_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  phase_b_directive JSONB NOT NULL DEFAULT '{
    "same_contradiction_intra_layer_conflict": "skip",
    "cross_contradiction_conflict": "check"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_layered_triz_solutions_updated_at
  BEFORE UPDATE ON layered_triz_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_layered_triz_solutions_project_id
  ON layered_triz_solutions(project_id);
CREATE INDEX IF NOT EXISTS idx_layered_triz_solutions_contradiction_id
  ON layered_triz_solutions(contradiction_id);

COMMENT ON TABLE layered_triz_solutions IS
  'v7 M6: One drill-down diagnosis per contradiction. Stores L1 TC surface + '
  'L2 PC root-cause (conditional) + L3 SF structural lens + '
  'differential_analysis + phase_b_directive. Consumed by Decision Hub and '
  'Phase B scanner. Ref TRIZ_Layered_DrillDown_Optimization.md §5.';

-- ----------------------------------------------------------------------------
-- 3.  RLS policies — follow existing project-scoped pattern
-- ----------------------------------------------------------------------------

ALTER TABLE layered_triz_solutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS layered_triz_solutions_select ON layered_triz_solutions;
CREATE POLICY layered_triz_solutions_select ON layered_triz_solutions
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS layered_triz_solutions_insert ON layered_triz_solutions;
CREATE POLICY layered_triz_solutions_insert ON layered_triz_solutions
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS layered_triz_solutions_update ON layered_triz_solutions;
CREATE POLICY layered_triz_solutions_update ON layered_triz_solutions
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS layered_triz_solutions_delete ON layered_triz_solutions;
CREATE POLICY layered_triz_solutions_delete ON layered_triz_solutions
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE auth.uid() IS NOT NULL)
  );

COMMIT;
