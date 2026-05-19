/**
 * Notifications subsystem (audit gap: missing notifications).
 * In-memory + DB-detect fallback.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const memStore = new Map();
let nextMemId = 1;

async function tableExists() {
  try {
    const r = await pool.query("SELECT to_regclass('public.notifications') AS t");
    return !!(r.rows[0] && r.rows[0].t);
  } catch (_) { return false; }
}

router.get('/', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
        [req.user.id]
      );
      return res.json(r.rows);
    }
    res.json(memStore.get(req.user.id) || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread-count', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await pool.query(
        'SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = false',
        [req.user.id]
      );
      return res.json({ unread: r.rows[0].c });
    }
    const list = memStore.get(req.user.id) || [];
    res.json({ unread: list.filter(n => !n.read).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const target = user_id || req.user.id;
    const t = type || 'info';
    if (await tableExists()) {
      const r = await pool.query(
        'INSERT INTO notifications (user_id, message, type, read) VALUES ($1,$2,$3,false) RETURNING *',
        [target, message, t]
      );
      return res.json(r.rows[0]);
    }
    const item = { id: nextMemId++, user_id: target, message, type: t, read: false, created_at: new Date().toISOString() };
    if (!memStore.has(target)) memStore.set(target, []);
    memStore.get(target).unshift(item);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    if (await tableExists()) {
      const r = await pool.query(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [req.params.id, req.user.id]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(r.rows[0]);
    }
    const list = memStore.get(req.user.id) || [];
    const item = list.find(n => String(n.id) === String(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    item.read = true;
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    if (await tableExists()) {
      await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
      return res.json({ success: true });
    }
    (memStore.get(req.user.id) || []).forEach(n => { n.read = true; });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (await tableExists()) {
      await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      return res.json({ success: true });
    }
    const list = memStore.get(req.user.id) || [];
    const idx = list.findIndex(n => String(n.id) === String(req.params.id));
    if (idx >= 0) list.splice(idx, 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
