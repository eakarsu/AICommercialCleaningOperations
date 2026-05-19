const express = require('express');
const Client = require('../models/Client');
const WorkOrder = require('../models/WorkOrder');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await Client.findAndCountAll({
      order: [['company_name', 'ASC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { company_name, contact_name, industry } = req.body;
    if (!company_name) return res.status(400).json({ error: 'company_name is required' });
    if (!contact_name) return res.status(400).json({ error: 'contact_name is required' });
    if (!industry) return res.status(400).json({ error: 'industry is required' });
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await client.update(req.body);
    res.json(client);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await client.destroy();
    res.json({ message: 'Client deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/analyze', auth, rateLimiter, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const aiResult = await aiService.analyzeClientRetention({
      company: client.company_name, industry: client.industry, status: client.status,
      monthly_revenue: client.monthly_revenue, satisfaction_score: client.satisfaction_score,
      since: client.since, properties_count: client.properties_count, notes: client.notes
    });
    await client.update({ ai_retention_analysis: aiResult });
    res.json({ client, ai_analysis: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
