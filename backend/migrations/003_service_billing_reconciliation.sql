BEGIN;

CREATE TABLE IF NOT EXISTS service_billing_reconciliations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  service_run_id uuid NOT NULL REFERENCES service_runs(id),
  invoice_reference text NOT NULL,
  invoice_sha256 char(64) NOT NULL,
  source_refs jsonb NOT NULL,
  inputs jsonb NOT NULL,
  calculation jsonb NOT NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','accepted','rejected')),
  created_by text NOT NULL,
  reviewed_by text,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (tenant_id, service_run_id, invoice_reference, invoice_sha256)
);
CREATE INDEX IF NOT EXISTS service_billing_run_idx ON service_billing_reconciliations(tenant_id, service_run_id, created_at DESC);

COMMIT;
