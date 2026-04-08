-- =====================================================================
-- Migration 008: Converge interfaces column into interface_contracts JSONB
-- =====================================================================
-- Stage 4 of refactor/subsystem-interface-contracts.
--
-- Background:
--   Historically the subsystems table carried TWO parallel representations
--   of the same concept:
--     * subsystems.interfaces            TEXT (comma-joined neighbour names)
--     * subsystems.interface_contracts   JSONB (map of neighbour → 6-dim)
--   The `interfaces` column was populated by the manual RD form; the
--   `interface_contracts` column was populated by the AI suggestion path.
--   Two ways to express the same thing, neither aware of the other, no
--   reconciliation — exactly the class of drift Stage 4 is eliminating.
--
-- Strategy:
--   Upgrade legacy rows whose `interfaces` is non-empty but whose
--   `interface_contracts` is empty. For each comma-separated neighbour name,
--   create an empty 6-dim contract entry (placeholder to be filled by RD
--   or AI later). Rows that already have real interface_contracts are left
--   untouched.
--
-- Safety:
--   - Non-destructive: the `interfaces` column is NOT dropped here. Stage 7
--     cleanup will drop it after one sprint of stable running.
--   - Idempotent: re-running has no effect because rows already carrying
--     non-empty interface_contracts are skipped.
--   - Only upgrades rows where the bug pattern applies (has interfaces,
--     lacks contracts).
-- =====================================================================

DO $$
DECLARE
  upgraded_count INTEGER;
BEGIN
  WITH to_upgrade AS (
    SELECT
      s.id,
      -- Split comma-separated names, trim whitespace, filter empty,
      -- deduplicate, then build a JSONB object keyed by name with an
      -- empty 6-dim contract as the value.
      (
        SELECT jsonb_object_agg(
          trimmed_name,
          jsonb_build_object(
            'envelope', '',
            'loadPath', '',
            'thermalPath', '',
            'signalPath', '',
            'datumTolerance', '',
            'serviceability', ''
          )
        )
        FROM (
          SELECT DISTINCT TRIM(name_part) AS trimmed_name
          FROM UNNEST(STRING_TO_ARRAY(s.interfaces, ',')) AS name_part
          WHERE TRIM(name_part) <> ''
        ) AS parts
      ) AS new_contracts
    FROM subsystems s
    WHERE s.interfaces IS NOT NULL
      AND TRIM(s.interfaces) <> ''
      AND (
        s.interface_contracts IS NULL
        OR s.interface_contracts = '{}'::jsonb
      )
  )
  UPDATE subsystems
     SET interface_contracts = to_upgrade.new_contracts
    FROM to_upgrade
   WHERE subsystems.id = to_upgrade.id
     AND to_upgrade.new_contracts IS NOT NULL;

  GET DIAGNOSTICS upgraded_count = ROW_COUNT;
  RAISE NOTICE 'Upgraded interface_contracts on % subsystems from legacy interfaces column', upgraded_count;
END $$;

-- Add a comment on the legacy column warning future developers
COMMENT ON COLUMN subsystems.interfaces IS
  'DEPRECATED: legacy comma-separated neighbour names. Use interface_contracts JSONB instead. Will be dropped in Stage 7 of refactor/subsystem-interface-contracts.';
