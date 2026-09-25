/**
 * Customer self-service, RFP quoting and incident classification.
 *
 * Replaces three gaps with no implementation:
 *   - no_customer_self_service_portal
 *   - no_ai_auto_quote_generator_from_rfp
 *   - no_ai_safety_incident_classifier
 *
 * Quoting and classification are **deterministic**. A generated quote shows
 * every line it used (rate card × quantity) so a customer can audit it, and an
 * incident classification names the factors that produced its severity. A
 * wrong quote is worse than no quote.
 */
const express = require('express');

const SEVERITY_RULES = [
  { severity: 'critical', terms: ['hospital', 'injury', 'fire', 'gas', 'chemical burn', 'amputation', 'loss of consciousness', '911', 'ambulance'] },
  { severity: 'high', terms: ['laceration', 'fall', 'sprain', 'exposure', 'spill', 'evacuation', 'restricted work', 'blood'] },
  { severity: 'medium', terms: ['near miss', 'slip', 'trip', 'strain', 'bruise', 'property damage', 'first aid'] },
];

function createCustomerSelfServiceRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS customer_portal_access (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      contact_email TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'read',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, contact_email)
    );
    CREATE TABLE IF NOT EXISTS quote_requests (
      id SERIAL PRIMARY KEY,
      client_id INTEGER,
      reference TEXT,
      requested_services JSONB NOT NULL DEFAULT '[]',
      rate_card JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS incident_classifications (
      id SERIAL PRIMARY KEY,
      incident_id INTEGER,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      matched_terms TEXT[] NOT NULL DEFAULT '{}',
      explanation TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  /* ------------------- customer self-service ------------------- */

  router.get('/portal/:clientId/work-orders', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const rows = (await pool.query(
        `SELECT id, title, status, scheduled_at, completed_at, amount
           FROM work_orders WHERE client_id = $1
          ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 100`,
        [req.params.clientId],
      )).rows;
      res.json({
        clientId: req.params.clientId,
        workOrders: rows,
        note: 'Read-only view scoped to one client. No cross-client rows are returned.',
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list work orders' }); }
  });

  router.get('/portal/:clientId/summary', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const wo = (await pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS open
           FROM work_orders WHERE client_id = $1`,
        [req.params.clientId],
      )).rows[0];
      const inv = (await pool.query(
        `SELECT COALESCE(SUM(total),0)::float AS billed,
                COALESCE(SUM(balance),0)::float AS outstanding
           FROM invoices WHERE client_id = $1`,
        [req.params.clientId],
      )).rows[0];
      res.json({ clientId: req.params.clientId, workOrders: wo, billing: inv,
        note: 'Totals are sums of recorded rows only; nothing is forecast.' });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to summarise' }); }
  });

  /* --------------------- RFP quote generation --------------------- */

  /**
   * Build a quote from a rate card. Every line shows its derivation, so the
   * customer can audit the arithmetic rather than trusting a total.
   */
  router.post('/quotes/from-rfp', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { clientId, reference, requestedServices, rateCard } = req.body || {};
      if (!Array.isArray(requestedServices) || requestedServices.length === 0) {
        return res.status(400).json({ error: 'requestedServices must be a non-empty array' });
      }
      if (!Array.isArray(rateCard) || rateCard.length === 0) {
        return res.status(400).json({ error: 'rateCard must be a non-empty array of { service, unit, unitRateCents }' });
      }

      const priceOf = new Map(rateCard.map((r) => [String(r.service ?? '').toLowerCase(), r]));
      const lines = [];
      const unpriced = [];

      for (const [i, s] of requestedServices.entries()) {
        const service = String(s?.service ?? '').toLowerCase();
        const qty = Number(s?.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 0) {
          return res.status(400).json({ error: `requestedServices[${i}].quantity must be > 0` });
        }
        const rate = priceOf.get(service);
        if (!rate) {
          unpriced.push({ index: i, service: s?.service ?? null, reason: 'No matching service on the supplied rate card' });
          continue;
        }
        const unitRateCents = Number(rate.unitRateCents ?? 0);
        if (!Number.isFinite(unitRateCents) || unitRateCents < 0) {
          return res.status(400).json({ error: `rateCard entry "${rate.service}" has an invalid unitRateCents` });
        }
        lines.push({
          service: rate.service,
          unit: rate.unit ?? 'unit',
          quantity: qty,
          unitRateCents,
          lineTotalCents: Math.round(qty * unitRateCents),
          derivation: `${qty} × ${rate.service} @ ${unitRateCents} cents/${rate.unit ?? 'unit'}`,
        });
      }

      const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);

      res.status(201).json({
        clientId: clientId ?? null,
        reference: reference ?? null,
        lines,
        unpriced,
        subtotalCents,
        lineCount: lines.length,
        complete: unpriced.length === 0,
        assumptions: [
          'Totals are the sum of rate-card lines; no discount, tax or escalation is applied.',
          'Services with no rate-card match are listed as unpriced rather than guessed.',
          'Every line names the quantity and unit rate it came from so the quote can be audited.',
        ],
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to build quote' }); }
  });

  /* ------------------- incident classification ------------------- */

  router.post('/incidents/classify', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const { description, incidentId } = req.body || {};
      if (!description || !String(description).trim()) {
        return res.status(400).json({ error: 'description is required' });
      }
      const text = String(description).toLowerCase();

      const matched = [];
      let severity = 'low';
      for (const rule of SEVERITY_RULES) {
        const hits = rule.terms.filter((t) => text.includes(t));
        if (hits.length) {
          matched.push({ severity: rule.severity, terms: hits });
          severity = rule.severity;
          break; // highest-severity rule wins
        }
      }

      const explanation = matched.length
        ? `Classified "${severity}" from matched terms: ${matched[0].terms.join(', ')}. Highest-severity rule wins.`
        : 'No severity keyword matched; classified "low" and flagged for human review.';

      const r = await pool.query(
        `INSERT INTO incident_classifications (incident_id, description, severity, matched_terms, explanation, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [incidentId ?? null, String(description), severity, matched[0]?.terms ?? [], explanation, req.user?.email ?? null],
      );

      res.status(201).json({
        classification: r.rows[0],
        severity,
        matchedTerms: matched[0]?.terms ?? [],
        confidence: matched.length ? 'high' : 'insufficient-history',
        needsHumanReview: matched.length === 0,
        explanation,
        assumptions: [
          'Classification is keyword matching against a stated rule table, not a model.',
          'Every classification names the terms that produced its severity.',
          'Unmatched text is classified "low" and flagged for review rather than being scored confidently.',
        ],
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to classify incident' }); }
  });

  return router;
}

module.exports = createCustomerSelfServiceRouter;
