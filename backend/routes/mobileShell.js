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
      const userId = req.user?.id ?? req.user?.email;
      const email = req.user?.email ?? null;
      const today = new Date().toISOString().slice(0, 10);

      const items = [];
      for (const q of config.queries || []) {
        try {
          const r = await pool.query(q.sql, [email ?? userId ?? null, today]);
          items.push({ kind: q.kind, count: r.rows.length, rows: r.rows.slice(0, 25) });
        } catch (e) {
          // A missing table must not break the whole page.
          items.push({ kind: q.kind, count: 0, rows: [], unavailable: true });
        }
      }

      res.json({
        user: email ?? userId ?? null,
        date: today,
        items,
        assumptions: [
          'Rows are today\'s recorded work for the signed-in user only.',
          'A missing table is reported as unavailable rather than failing the request.',
        ],
      });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Failed to load today' });
    }
  });

  return router;
}

module.exports = createMobileShellRouter;
