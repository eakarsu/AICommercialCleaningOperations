/**
 * Webhook subscriptions (audit gap: missing integration API).
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const memStore = [];
let nextId = 1;

async function tableExists() {
  try {
    const r = await pool.query("SELECT to_regclass('public.webhooks') AS t");
    return !!(r.rows[0] && r.rows[0].t);
  } catch (_) { return false; }
}

router.get('/', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await pool.query('SELECT * FROM webhooks ORDER BY id DESC');
      return res.json(r.rows);
    }
    res.json(memStore);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { url, events, headers, status } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    if (await tableExists()) {
      const r = await pool.query(
        'INSERT INTO webhooks (url, events, headers, status) VALUES ($1,$2,$3,$4) RETURNING *',
        [url, JSON.stringify(events || []), JSON.stringify(headers || {}), status || 'active']
      );
      return res.json(r.rows[0]);
    }
    const item = { id: nextId++, url, events: events || [], headers: headers || {}, status: status || 'active' };
    memStore.push(item);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { url, events, headers, status } = req.body;
    if (await tableExists()) {
      const r = await pool.query(
        'UPDATE webhooks SET url = COALESCE($1, url), events = COALESCE($2, events), headers = COALESCE($3, headers), status = COALESCE($4, status) WHERE id = $5 RETURNING *',
        [url, events ? JSON.stringify(events) : null, headers ? JSON.stringify(headers) : null, status, req.params.id]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(r.rows[0]);
    }
    const item = memStore.find(w => String(w.id) === String(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (url !== undefined) item.url = url;
    if (events !== undefined) item.events = events;
    if (headers !== undefined) item.headers = headers;
    if (status !== undefined) item.status = status;
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (await tableExists()) {
      await pool.query('DELETE FROM webhooks WHERE id = $1', [req.params.id]);
      return res.json({ success: true });
    }
    const idx = memStore.findIndex(w => String(w.id) === String(req.params.id));
    if (idx >= 0) memStore.splice(idx, 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/test', async (req, res) => {
  try {
    let target;
    if (await tableExists()) {
      const r = await pool.query('SELECT * FROM webhooks WHERE id = $1', [req.params.id]);
      target = r.rows[0];
    } else {
      target = memStore.find(w => String(w.id) === String(req.params.id));
    }
    if (!target) return res.status(404).json({ error: 'Not found' });
    const payload = { event: 'webhook.test', sent_at: new Date().toISOString() };
    try {
      const resp = await fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(target.headers || {}) },
        body: JSON.stringify(payload)
      });
      res.json({ delivered: resp.ok, status: resp.status });
    } catch (err) {
      res.json({ delivered: false, error: err.message });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
