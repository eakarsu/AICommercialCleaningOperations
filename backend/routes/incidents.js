const express = require('express');
const Incident = require('../models/Incident');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const incidents = await Incident.findAll({ order: [['incident_date', 'DESC']] });
    res.json(incidents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const incident = await Incident.create(req.body);
    res.status(201).json(incident);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    await incident.update(req.body);
    res.json(incident);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    await incident.destroy();
    res.json({ message: 'Incident deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const aiResult = await aiService.analyzeIncidentRisk({
      title: incident.title, type: incident.type, severity: incident.severity,
      location: incident.location, description: incident.description,
      actions_taken: incident.actions_taken, cost_impact: incident.cost_impact,
      insurance_claim: incident.insurance_claim
    });
    await incident.update({ ai_risk_analysis: aiResult });
    res.json({ incident, ai_analysis: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
