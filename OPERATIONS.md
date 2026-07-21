# Operations

Copy `.env.example` to `.env`, replace secrets, run `scripts/bootstrap.sh` once, and apply `scripts/migrate.sh`. `start.sh` only starts and stops its own processes. The force-recreate seed is isolated behind `CONFIRM_DEMO_SEED=yes` and an explicit demo password.

The governed API is `/api/service-workflow`. Recurring occurrences are idempotent, evidence is signed and hash-chained, inspections are deterministic, and supervisor acceptance is blocked by missing evidence, failed inspections, or open SLA exceptions. Workforce/mobile offline sync, procurement, messaging, payroll/accounting adapters, client billing, worker-privacy review, and field evidence validation remain external gates.
