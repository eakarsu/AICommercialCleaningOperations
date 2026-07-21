BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE TABLE IF NOT EXISTS governed_sites (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, client_id text NOT NULL, name text NOT NULL, timezone text NOT NULL,
  access_policy jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS service_plans (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, contract_id text NOT NULL, site_id uuid NOT NULL REFERENCES governed_sites(id),
  recurrence_rule text NOT NULL, checklist_snapshot jsonb NOT NULL, sla_minutes integer NOT NULL CHECK (sla_minutes > 0), valid_from date NOT NULL, valid_to date
);
CREATE TABLE IF NOT EXISTS service_runs (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, plan_id uuid NOT NULL REFERENCES service_plans(id), occurrence_key text NOT NULL,
  crew_id text, status text NOT NULL CHECK (status IN ('scheduled','assigned','in_progress','submitted','accepted','rework','exception','invoiced','cancelled')),
  scheduled_start timestamptz NOT NULL, scheduled_end timestamptz NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, occurrence_key)
);
CREATE TABLE IF NOT EXISTS service_evidence (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, service_run_id uuid NOT NULL REFERENCES service_runs(id), captured_by text NOT NULL,
  kind text NOT NULL, object_key text NOT NULL, sha256 char(64) NOT NULL, captured_at timestamptz NOT NULL, device_timestamp timestamptz,
  prior_evidence_hash char(64), evidence_hash char(64) NOT NULL UNIQUE, metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS service_inspections (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, service_run_id uuid NOT NULL REFERENCES service_runs(id), inspector_id text NOT NULL,
  rubric_snapshot jsonb NOT NULL, result jsonb NOT NULL, score numeric NOT NULL CHECK(score BETWEEN 0 AND 100), passed boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_exceptions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, service_run_id uuid NOT NULL REFERENCES service_runs(id), type text NOT NULL,
  status text NOT NULL CHECK(status IN ('open','resolved','waived')), owner_id text NOT NULL, resolution text, approved_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, service_run_id uuid NOT NULL, actor_id text,
  event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_integration_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, provider text NOT NULL, direction text NOT NULL,
  idempotency_key text NOT NULL, status text NOT NULL CHECK(status IN ('pending','succeeded','failed')), external_id text,
  failure_code text, retry_count integer NOT NULL DEFAULT 0, next_retry_at timestamptz, occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,provider,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_service_runs_schedule ON service_runs(tenant_id, scheduled_start, status);
COMMIT;
