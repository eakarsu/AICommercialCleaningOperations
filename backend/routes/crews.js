const express = require('express');
const Crew = require('../models/Crew');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const crews = await Crew.findAll({ order: [['name', 'ASC']] });
    res.json(crews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const crew = await Crew.findByPk(req.params.id);
    if (!crew) return res.status(404).json({ error: 'Crew not found' });
    res.json(crew);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const crew = await Crew.create(req.body);
    res.status(201).json(crew);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const crew = await Crew.findByPk(req.params.id);
    if (!crew) return res.status(404).json({ error: 'Crew not found' });
    await crew.update(req.body);
    res.json(crew);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const crew = await Crew.findByPk(req.params.id);
    if (!crew) return res.status(404).json({ error: 'Crew not found' });
    await crew.destroy();
    res.json({ message: 'Crew deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const crew = await Crew.findByPk(req.params.id);
    if (!crew) return res.status(404).json({ error: 'Crew not found' });
    const aiResult = await aiService.analyzeCrewPerformance({
      name: crew.name, team_lead: crew.team_lead, members: crew.members,
      specializations: crew.specializations, shift: crew.shift, region: crew.region,
      performance_score: crew.performance_score, total_jobs_completed: crew.total_jobs_completed,
      certifications: crew.certifications
    });
    await crew.update({ ai_performance_analysis: aiResult });
    res.json({ crew, ai_analysis: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
