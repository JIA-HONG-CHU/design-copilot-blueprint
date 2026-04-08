-- =====================================================================
-- Migration 007: Layered Spatial Lookup — learned & RD-override tables
-- =====================================================================
-- Background:
--   The hand-curated JSON reference library introduced in migration 006
--   does not scale: real e-bike work involves thousands of part variants,
--   datasheets are inconsistent, parts evolve per project, and RD will not
--   maintain a JSON file by hand. We replace the static-only library with
--   a LAYERED resolver. The JSON file becomes a small seed; most data
--   accumulates organically through these two tables.
--
-- The layered resolver looks up a component in this order, taking the first
-- non-null result:
--
--   1. project_component_overrides   (RD said "for THIS project, X = ...")
--   2. learned_components            (a previously confirmed estimate, any project)
--   3. (web search — runtime, not stored here)
--   4. seed JSON                     (the 25-entry backstop in app/data)
--   5. llm_estimate                  (the LLM's own number, lowest trust)
--
-- The two tables here cover layers 1 and 2.
-- =====================================================================

-- Layer 1: per-project RD override.
-- "For project X, the battery is 320×80×60 mm at 2.8 kg — stop guessing."
CREATE TABLE IF NOT EXISTS project_component_overrides (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Component identifier — free-form key chosen by RD (e.g. "main_battery",
  -- "front_caliper"). The resolver matches by exact key OR by category hint.
  component_key text NOT NULL,
  category     text DEFAULT '',
  bbox         jsonb NOT NULL,         -- {"x_mm": .., "y_mm": .., "z_mm": .., "anchor": ".."}
  mass_g       numeric NOT NULL DEFAULT 0,
  note         text DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, component_key)
);

CREATE INDEX IF NOT EXISTS idx_pco_project
  ON project_component_overrides (project_id);

COMMENT ON TABLE project_component_overrides IS
  'RD inline override: per-project authoritative dimensions for a component. Highest priority in the layered spatial resolver.';

-- Layer 2: globally learned components.
-- Populated when an RD confirms a Pre-CAD review whose spatial estimate came
-- from llm_estimate or web_search — confirming it promotes the values into
-- this table so the next project sees them as a "learned" reference.
CREATE TABLE IF NOT EXISTS learned_components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable lookup key: lowercased canonical name. Examples:
  --   "downtube_battery_500wh", "rear_hub_motor_250w", "torque_sensor_pas".
  -- The resolver builds this by category + descriptive hint.
  key             text NOT NULL UNIQUE,
  category        text NOT NULL,
  bbox            jsonb NOT NULL,
  mass_g          numeric NOT NULL DEFAULT 0,
  -- Provenance for traceability
  source_url      text DEFAULT '',     -- e.g. vendor datasheet URL when origin = "web"
  source_text     text DEFAULT '',     -- short description / quote
  origin          text NOT NULL,       -- "rd_override" | "web" | "seed_promote" | "manual"
  origin_project  uuid REFERENCES projects(id) ON DELETE SET NULL,
  -- Trust signal: bump every time another project's RD also confirms this entry.
  confirmed_count integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learned_components_category
  ON learned_components (category);

COMMENT ON TABLE learned_components IS
  'Globally accumulated component dimensions, grown from RD confirmations and web lookups. Layer 2 of the layered spatial resolver. The library that builds itself.';

-- Bump confirmed_count helper — call from the spatial-confirm endpoint.
CREATE OR REPLACE FUNCTION bump_learned_component_confirm(p_key text)
RETURNS void AS $$
BEGIN
  UPDATE learned_components
     SET confirmed_count = confirmed_count + 1,
         updated_at = now()
   WHERE key = p_key;
END $$ LANGUAGE plpgsql;
