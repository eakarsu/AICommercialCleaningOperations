const express = require('express');
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
    const { count, rows } = await WorkOrder.findAndCountAll({
      order: [['scheduled_date', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Work order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, client_name, location, scheduled_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!client_name) return res.status(400).json({ error: 'client_name is required' });
    if (!location) return res.status(400).json({ error: 'location is required' });
    if (!scheduled_date) return res.status(400).json({ error: 'scheduled_date is required' });
    const order = await WorkOrder.create(req.body);
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Work order not found' });
    await order.update(req.body);
    res.json(order);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Work order not found' });
    await order.destroy();
    res.json({ message: 'Work order deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/optimize', auth, rateLimiter, async (req, res) => {
  try {
    const order = await WorkOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Work order not found' });
    const aiResult = await aiService.optimizeWorkOrder({
      title: order.title, client: order.client_name, location: order.location,
      type: order.type, priority: order.priority, scheduled_date: order.scheduled_date,
      estimated_hours: order.estimated_hours, description: order.description, checklist: order.checklist
    });
    await order.update({ ai_scheduling_analysis: aiResult });
    res.json({ order, ai_analysis: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
