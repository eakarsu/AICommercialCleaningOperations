# Completeness Review: AICommercialCleaningOperations

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad commercial cleaning operations surface (106 source files and 34 route modules), but static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path to turn contracts, sites, tasks, staffing, supplies, inspections, exceptions, and proof-of-service into a closed workflow.

## Why it is not complete

- 12 files are explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- The route/page inventory includes `ai new`, `checklists`, `clients`, `compliance`; these surfaces show breadth but not durable execution against authoritative systems.
- 34 files reference model-provider or chat-completion behavior; generic LLM calls are not a substitute for deterministic domain execution, grounding, or evaluation.
- 23 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- Only 3 recognizable test files were found, insufficient to prove the full workflow and failure modes.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to turn contracts, sites, tasks, staffing, supplies, inspections, exceptions, and proof-of-service into a closed workflow.
- 2. Connect workforce scheduling, mobile/offline capture, inventory/procurement, messaging, and billing; replace seed/demo records with durable synchronized data and explicit failure handling.
- 3. Test recurring schedules, coverage, inspection scoring, SLA exceptions, and payroll/invoice reconciliation.
- 4. Enforce site/tenant access, worker privacy, supervisor approval, and tamper-evident service evidence.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- Credential/secret fallback or demo-password patterns occur in 3 files and must be removed or made development-only.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `frontend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/models/index.js` — service composition, middleware, and registered routes.
- `backend/server.js` — service composition, middleware, and registered routes.
- `frontend/src/index.js` — service composition, middleware, and registered routes.
- `backend/routes/aiNew.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: use ai new and checklists to select one narrow commercial cleaning operations outcome, quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress

- **Needed feature 1 — implemented locally:** `serviceWorkflow.js`, `/api/service-workflow`, and migration `001_governed_service_workflow.sql` close the contract-plan occurrence path through idempotent scheduling, crew assignment state, signed/hash-chained proof, weighted inspections, exceptions, supervisor acceptance, and invoice eligibility with audit history.
- **Needed feature 2 — implementation boundary:** durable service/evidence/exception records and reconciliation rules are local. Workforce scheduling, offline mobile sync, inventory/procurement, messaging, payroll/accounting, and billing providers require real contracts and are not represented as synchronized.
- **Needed features 3–4 — implemented locally:** recurring occurrence uniqueness, schedule validation, deterministic critical-item inspection scoring, SLA exception blocks, time/invoice reconciliation, tenant-scoped identities, signed tamper-evident evidence chains, privacy boundaries, and manager/supervisor approval are modeled and tested. Field/mobile and payroll/invoice integration validation remains external.
- **Needed feature 5 and launch risks — implemented locally:** strict runtime secrets/CORS, `.env.example`, CI/tests, explicit migration, guarded destructive demo seed, `OPERATIONS.md`, and a non-destructive launcher replace port killing, installs, force-sync, and seed-on-start. Generated gap mounts were removed.
- **Validation:** changed JavaScript passed `node --check`; shell files passed `bash -n`; 3 workflow tests passed. Services, database, accounting/payroll, mobile, messaging, and browser E2E were not run.
- **Still blocked externally:** workforce/mobile clients, procurement and inventory systems, messaging, payroll/accounting/billing credentials, production migration, site access policy configuration, worker privacy review, and supervised field evidence validation.
