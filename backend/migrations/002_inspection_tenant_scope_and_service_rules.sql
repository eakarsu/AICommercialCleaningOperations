BEGIN;

-- Tenant-scope legacy inspection evidence. Rows created before this migration
-- keep tenant_id NULL; tenant-scoped users only see their own tenant's rows.
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_quality_inspections_tenant
  ON quality_inspections(tenant_id, inspection_date DESC);

-- Service rules were previously held in process memory and lost on restart.
CREATE TABLE IF NOT EXISTS service_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]',
  property_type VARCHAR(50) NOT NULL DEFAULT 'general',
  est_hours NUMERIC(5,2) NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
