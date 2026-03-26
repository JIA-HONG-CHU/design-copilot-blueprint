-- Add level column for System → Module → Component hierarchy
ALTER TABLE subsystems
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'module'
  CHECK (level IN ('system', 'module', 'component'));

-- Add structured interface_contracts (JSONB) alongside the legacy TEXT interfaces
ALTER TABLE subsystems
  ADD COLUMN IF NOT EXISTS interface_contracts JSONB DEFAULT '{}';

COMMENT ON COLUMN subsystems.level IS 'Hierarchy level: system > module > component';
COMMENT ON COLUMN subsystems.interface_contracts IS 'Structured 6-dim interface contracts keyed by target subsystem ID';
