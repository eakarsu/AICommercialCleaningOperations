BEGIN;

CREATE TABLE IF NOT EXISTS service_evidence_media (
  evidence_id uuid PRIMARY KEY REFERENCES service_evidence(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  bytes bytea NOT NULL,
  byte_length integer NOT NULL CHECK (byte_length > 0 AND byte_length <= 8388608),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_evidence_media_tenant_idx ON service_evidence_media(tenant_id, evidence_id);

COMMIT;
