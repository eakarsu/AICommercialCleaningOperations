const express = require('express');
const Equipment = require('../models/Equipment');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const items = await Equipment.findAll({ order: [['name', 'ASC']] });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Equipment not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const item = await Equipment.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Equipment not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Equipment not found' });
    await item.destroy();
    res.json({ message: 'Equipment deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/predict', auth, async (req, res) => {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Equipment not found' });
    const aiResult = await aiService.predictEquipmentMaintenance({
      name: item.name, type: item.type, condition: item.condition,
      purchase_date: item.purchase_date, purchase_cost: item.purchase_cost,
      last_maintenance: item.last_maintenance, next_maintenance: item.next_maintenance,
      hours_used: item.hours_used, maintenance_interval_days: item.maintenance_interval_days
    });
    await item.update({ ai_maintenance_prediction: aiResult });
    res.json({ equipment: item, ai_analysis: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
