ALTER TABLE projects
ADD COLUMN IF NOT EXISTS must_criteria_config jsonb DEFAULT NULL;

COMMENT ON COLUMN projects.must_criteria_config IS
  'MUST criteria config derived from Brief constraints/KPIs. Array of {id, label, source, threshold}.';
