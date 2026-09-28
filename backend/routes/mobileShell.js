/**
 * Mobile field shell.
 *
 * Replaces the "limited mobile app" gaps. Without app-store credentials the
 * honest deliverable is a **PWA manifest plus a compact mobile API** — the
 * payloads a small-screen client needs, at one round trip.
 *
 *   GET /api/mobile/manifest   web-app manifest for install-to-homescreen
 *   GET /api/mobile/today      today's work for the signed-in user
 */
const express = require('express');

function createMobileShellRouter(authMiddleware, pool, config) {
  const router = express.Router();
  const name = config.name || 'Field App';
  const shortName = config.shortName || 'Field';

  router.get('/mobile/manifest', (_req, res) => {
    res.json({
      name,
      short_name: shortName,
      display: 'standalone',
      start_url: '/mobile',
      background_color: '#ffffff',
      theme_color: config.themeColor || '#0f766e',
      description: config.description || 'Mobile shell for field work.',
      // Honest boundary: this is an installable web app, not a store-native app.
      nativeStoreBuild: false,
      note: 'Installable as a PWA. App-store distribution requires store credentials and a native wrapper.',
    });
  });

  router.get('/mobile/today', authMiddleware, async (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Each configured query is bound with [signed-in user's name, today].
      // The documented date filter is applied in SQL via $2.
      const bindings = [req.user?.name || null, today];

      const items = [];
      for (const q of config.queries || []) {
        const r = await pool.query(q.sql, bindings);
        items.push({ kind: q.kind, count: r.rows.length, rows: r.rows.slice(0, 25) });
      }

      res.json({
        user: req.user?.name || req.user?.email || null,
        date: today,
        items,
        assumptions: [
          "Rows are today's recorded work assigned to the signed-in user (work_orders.assigned_crew = user name).",
          'A failing query returns an HTTP error instead of an empty-but-available result.',
        ],
      });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Failed to load today' });
    }
  });

  return router;
}

module.exports = createMobileShellRouter;
