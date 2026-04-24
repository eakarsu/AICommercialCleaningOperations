const express = require('express');
const Supply = require('../models/Supply');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const supplies = await Supply.findAll({ order: [['name', 'ASC']] });
    res.json(supplies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    res.json(supply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const supply = await Supply.create(req.body);
    res.status(201).json(supply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    await supply.update(req.body);
    res.json(supply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    await supply.destroy();
    res.json({ message: 'Supply deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/forecast', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });

    const aiResult = await aiService.forecastSupply({
      name: supply.name,
      category: supply.category,
      current_stock: supply.current_stock,
      unit: supply.unit,
      monthly_usage_avg: supply.monthly_usage_avg,
      reorder_level: supply.reorder_level,
      unit_cost: supply.unit_cost,
      lead_time_days: supply.lead_time_days
    });

    await supply.update({ forecast_data: aiResult });
    res.json({ supply, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
