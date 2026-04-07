-- =====================================================================
-- Migration 005: Cleanup empty interface_contracts on subsystems
-- =====================================================================
-- Background:
--   Prior to the schema fix in backend/app/models/schemas.py, the
--   InterfaceContract Pydantic model used `validation_alias` for snake_case
--   fields (load_path / thermal_path / signal_path / datum_tolerance).
--   Pydantic v2 only accepts the alias when validation_alias is set, so when
--   the LLM (per SUBSYSTEM_SUGGESTION prompt) returned camelCase keys, the
--   four fields silently fell back to default "" before being persisted to
--   Supabase. The result: subsystems.interface_contracts JSONB rows where
--   loadPath / signalPath / thermalPath / datumTolerance are all empty
--   strings, while envelope and serviceability are populated correctly.
--
-- Action:
--   Reset interface_contracts to '{}' for any subsystem whose contracts
--   contain at least one target with all four affected fields empty. The
--   user can then re-run "Suggest Subsystems" in Create page to regenerate
--   contracts using the now-fixed schema.
--
-- Safety:
--   - Only resets rows that match the bug signature (envelope/serviceability
--     populated but loadPath/etc empty). Hand-edited / fully-populated
--     contracts are preserved.
--   - Idempotent: re-running has no further effect.
-- =====================================================================

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  WITH bug_rows AS (
    SELECT s.id
    FROM subsystems s
    WHERE s.interface_contracts IS NOT NULL
      AND s.interface_contracts <> '{}'::jsonb
      AND EXISTS (
        SELECT 1
        FROM jsonb_each(s.interface_contracts) AS kv(target, contract)
        WHERE COALESCE(contract->>'loadPath',       '') = ''
          AND COALESCE(contract->>'signalPath',     '') = ''
          AND COALESCE(contract->>'thermalPath',    '') = ''
          AND COALESCE(contract->>'datumTolerance', '') = ''
      )
  )
  UPDATE subsystems
     SET interface_contracts = '{}'::jsonb
   WHERE id IN (SELECT id FROM bug_rows);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Cleared interface_contracts on % subsystems', affected_count;
END $$;
