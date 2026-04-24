const express = require('express');
const QualityInspection = require('../models/QualityInspection');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const inspections = await QualityInspection.findAll({ order: [['inspection_date', 'DESC']] });
    res.json(inspections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.create(req.body);
    res.status(201).json(inspection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    await inspection.update(req.body);
    res.json(inspection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    await inspection.destroy();
    res.json({ message: 'Inspection deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const aiResult = await aiService.analyzeQualityPhoto({
      location: inspection.location_name,
      inspector: inspection.inspector_name,
      date: inspection.inspection_date,
      categories: inspection.categories,
      current_score: inspection.overall_score,
      notes: inspection.notes
    });

    await inspection.update({ ai_photo_analysis: aiResult });
    res.json({ inspection, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
