-- Migration 009: PC Decomposition
-- Adds parent_contradiction_id FK + separation principle columns to support
-- TC → multi-PC drill-down (ref: docs/e2e/module/Explore_TC_to_MultiPC_Decomposition_WBS.md)
-- L2 WBS task 4.1
-- Date: 2026-04-09
--
-- Background:
--   A single Technical Contradiction (TC) frequently decomposes into several
--   Physical Contradictions (PCs), each isolating a different parameter that
--   must be simultaneously A and NOT-A. Each child PC is then resolved via
--   one of the 16 canonical separation principles (time / space / condition /
--   whole_part families). We model this as a self-referential FK on the
--   existing `contradictions` table so that a child PC row points at its
--   parent TC row via `parent_contradiction_id`.
--
--   All new columns are nullable: existing TC/PC/SF rows must survive the
--   migration untouched. The `contradictions` table itself is defined in
--   000_full_deploy.sql; Su-Field columns were added in 004_sufield_columns.sql.
--   This migration does NOT duplicate any of those columns.

ALTER TABLE contradictions
  ADD COLUMN IF NOT EXISTS parent_contradiction_id UUID
    REFERENCES contradictions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS derived_parameter      TEXT,
  ADD COLUMN IF NOT EXISTS subsystem_hint         TEXT,
  ADD COLUMN IF NOT EXISTS separation_principle_id TEXT,
  ADD COLUMN IF NOT EXISTS separation_category    TEXT,
  ADD COLUMN IF NOT EXISTS separation_rationale   TEXT,
  ADD COLUMN IF NOT EXISTS pc_attribute_a         TEXT,
  ADD COLUMN IF NOT EXISTS pc_attribute_not_a     TEXT;

COMMENT ON COLUMN contradictions.parent_contradiction_id IS
  'Self-FK: when set, this row is a child PC derived from the referenced parent TC. NULL for root TCs and standalone PCs/SFs.';
COMMENT ON COLUMN contradictions.derived_parameter IS
  'The single parameter this child PC isolates (e.g. "tire contact patch width"). Populated when parent_contradiction_id IS NOT NULL.';
COMMENT ON COLUMN contradictions.subsystem_hint IS
  'Optional subsystem name this PC lives in (e.g. "drivetrain", "frame"). Used to bias downstream routing.';
COMMENT ON COLUMN contradictions.separation_principle_id IS
  'Canonical id of the applied separation principle, e.g. "time.pre_action", "space.partition_combine". One of 16 values across time/space/condition/whole_part families.';
COMMENT ON COLUMN contradictions.separation_category IS
  'Coarse separation family: time | space | condition | whole_part.';
COMMENT ON COLUMN contradictions.separation_rationale IS
  'Free-text justification of why this separation principle was chosen for this PC.';
COMMENT ON COLUMN contradictions.pc_attribute_a IS
  'The "A" side of the physical contradiction (e.g. "wheel must be large").';
COMMENT ON COLUMN contradictions.pc_attribute_not_a IS
  'The "NOT A" side of the physical contradiction (e.g. "wheel must be small").';

CREATE INDEX IF NOT EXISTS idx_contradictions_parent
  ON contradictions(parent_contradiction_id);

-- CHECK constraint on separation_category.
-- PostgreSQL does NOT support `ADD CONSTRAINT IF NOT EXISTS` on ALTER TABLE,
-- so we wrap the ADD CONSTRAINT in a DO block that first probes pg_constraint
-- for idempotency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'check_separation_category'
       AND conrelid = 'contradictions'::regclass
  ) THEN
    ALTER TABLE contradictions
      ADD CONSTRAINT check_separation_category
      CHECK (
        separation_category IS NULL
        OR separation_category IN ('time', 'space', 'condition', 'whole_part')
      );
  END IF;
END $$;

-- ROLLBACK (manual, if needed):
-- DROP INDEX IF EXISTS idx_contradictions_parent;
-- ALTER TABLE contradictions DROP CONSTRAINT IF EXISTS check_separation_category;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS parent_contradiction_id;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS derived_parameter;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS subsystem_hint;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_principle_id;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_category;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_rationale;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS pc_attribute_a;
-- ALTER TABLE contradictions DROP COLUMN IF EXISTS pc_attribute_not_a;
