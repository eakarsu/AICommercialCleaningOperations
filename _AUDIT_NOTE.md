# Audit Note — AICommercialCleaningOperations

Source: `_AUDIT/reports/batch_01.md` (Project 34)

## Maturity: PARTIAL-BUILD (17 routes; audit reports 0 AI endpoints, but `aiNew.js` is mounted at `/api/ai`)

## Original audit recommendations

### Gaps & Opportunities
- Missing AI Layer (incorrect — see above).
- Missing Notifications.
- Missing Reporting.
- Missing Integration API.

### Strategic Feature Suggestions
1. Agentic Workflow Orchestration
2. RAG over Domain Documents
3. Real-time Anomaly Detection
4. White-label/Reseller Platform

## Categorization
- **MECHANICAL:** notifications, webhooks.
- **NEEDS-PRODUCT-DECISION:** agentic, RAG, white-label.
- Reporting can be added later (CSV exports per resource).

## Implementations applied
1. **`backend/routes/notifications.js`** — full CRUD with DB-detect + memory fallback.
2. **`backend/routes/webhooks.js`** — registry CRUD + manual test-delivery.
3. **`backend/server.js`** — mounted at `/api/notifications` and `/api/webhooks`.

Syntax-checked with `node --check`.

## Backlog (prioritized)

### High priority
- **CSV/PDF reporting** for invoices, work orders, inspections.
- **Crew dispatch optimization AI** (`POST /api/ai/optimize-routes`) — match crews to schedules with travel time.

### Medium priority
- **Inspection-photo vision endpoint** — flag missed cleaning areas.
- **RAG over compliance regulations** (OSHA, EPA cleaning chemical safety).

### Low priority
- White-label per-cleaning-company branding.
- Agentic full-cycle workorder management.

## Apply pass 3 (frontend)

Backend `aiNew.js` mounts 3 endpoints under `/api/ai`: `client-retention`, `crew-performance`, `energy-audit`. None had FE wiring. Created `frontend/src/pages/AIInsightsPage.js` with a 3-tab UI to invoke each endpoint, registered the `/ai-insights` route in `App.js`, and added a navbar entry. Uses existing `services/api.js` (JWT Bearer from localStorage). 503/missing-key responses surface a yellow banner. No new deps. No `npm install`.

## Apply pass 4 (mechanical backlog)

Added two new AI endpoints to `backend/routes/aiNew.js` reusing the existing `callOpenRouter` + `parseAIJson` helpers, `auth`, `rateLimiter`, and the inline 503-on-missing-key pattern:
1. `POST /api/ai/inspection-analysis` — text-based analysis of `quality_inspections` records (filters by `inspection_id`, `location_name`, `days`) flagging missed areas, recurring failures, worst-performing locations/categories, corrective actions, training needs (mechanical substitute for the backlog "inspection-photo vision endpoint" without requiring a multimodal upload pipeline).
2. `POST /api/ai/supply-forecast` — replenishment forecast over a configurable horizon using `current_stock`, `monthly_usage_avg`, `lead_time_days`, `reorder_level`. Returns immediate reorders, week-window reorders, projected stockouts, consolidated POs by supplier, cost-optimization opportunities.

Also hardened the three pass-3 endpoints (`client-retention`, `crew-performance`, `energy-audit`) with explicit `if (err.code === 'NO_API_KEY') return 503` handling so the FE banner triggers cleanly.

Frontend `frontend/src/pages/AIInsightsPage.js` extended with two new tabs and forms reusing identical styling, the shared `api.js` axios instance (JWT bearer from `localStorage.token`), and the existing 503 banner handler. Result rendering picks up `ai_inspection_analysis` and `ai_supply_forecast` keys via the existing `AIOutput` component. No new deps. No `npm install`.

Syntax check: `node --check backend/routes/aiNew.js` passes. FE file structurally complete (single default export, balanced JSX).

Backlog now: CSV/PDF reporting (non-AI), white-label branding (NEEDS-PRODUCT-DECISION), agentic workorder management (NEEDS-PRODUCT-DECISION), full vector RAG over compliance docs (TOO-RISKY for this pass — `compliance-advisor` covers prompt-grounded guidance).
