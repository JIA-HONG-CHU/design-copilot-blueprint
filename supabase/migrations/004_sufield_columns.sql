-- Migration 004: Add Su-Field (SF) columns to contradictions table
--
-- Supports the three-path TRIZ routing (TC / PC / SF) introduced in v10.
-- When a contradiction is classified as type='SF' (Su-Field Problem),
-- these columns store the Function Model data from Step 3.

ALTER TABLE contradictions
  ADD COLUMN IF NOT EXISTS sf_substance_1  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sf_substance_2  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sf_field        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sf_interaction  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sf_completeness TEXT DEFAULT NULL;

COMMENT ON COLUMN contradictions.sf_substance_1  IS 'S1: tool substance (acts on S2) — populated when type=SF';
COMMENT ON COLUMN contradictions.sf_substance_2  IS 'S2: product substance (acted upon) — populated when type=SF';
COMMENT ON COLUMN contradictions.sf_field        IS 'Field type: mechanical/thermal/electrical/magnetic/chemical — populated when type=SF';
COMMENT ON COLUMN contradictions.sf_interaction  IS 'Interaction type: useful/harmful/insufficient/missing — populated when type=SF';
COMMENT ON COLUMN contradictions.sf_completeness IS 'Su-Field completeness: complete/incomplete/harmful_complete — populated when type=SF';
