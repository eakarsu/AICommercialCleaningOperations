const express = require('express');
const Compliance = require('../models/Compliance');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const records = await Compliance.findAll({ order: [['due_date', 'ASC']] });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const record = await Compliance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const record = await Compliance.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const record = await Compliance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await record.update(req.body);
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await Compliance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await record.destroy();
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const record = await Compliance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const allRecords = await Compliance.findAll();
    const aiResult = await aiService.analyzeCompliance({
      current_record: {
        title: record.title,
        category: record.category,
        status: record.status,
        due_date: record.due_date,
        priority: record.priority,
        description: record.description
      },
      all_records_summary: allRecords.map(r => ({
        title: r.title,
        category: r.category,
        status: r.status,
        due_date: r.due_date
      }))
    });

    await record.update({ ai_recommendations: aiResult });
    res.json({ record, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
