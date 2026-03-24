-- Migration: Add Validation Passport support
-- Anti-Anchor routes gain structured fields (mechanism, cross_domain_source, etc.)
-- Alternatives gain a validation_passport JSONB column

-- anti_anchor_routes: preserve full LLM output instead of dropping mechanism/cross_domain
ALTER TABLE anti_anchor_routes
  ADD COLUMN IF NOT EXISTS mechanism TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_unconventional TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS potential_advantage TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cross_domain_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS validation_passport JSONB;

-- alternatives: each solution hypothesis carries a self-declared validation passport
ALTER TABLE alternatives
  ADD COLUMN IF NOT EXISTS validation_passport JSONB;
