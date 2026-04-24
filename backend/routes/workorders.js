const express = require('express');
const WorkOrder = require('../models/WorkOrder');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const orders = await WorkOrder.findAll({ order: [['scheduled_date', 'DESC']] });
    res.json(orders);
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

router.post('/:id/optimize', auth, async (req, res) => {
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
