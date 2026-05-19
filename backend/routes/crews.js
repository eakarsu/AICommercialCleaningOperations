const express = require('express');
const Crew = require('../models/Crew');
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
    const { count, rows } = await Crew.findAndCountAll({
      order: [['name', 'ASC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
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
    const { name, team_lead } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!team_lead) return res.status(400).json({ error: 'team_lead is required' });
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

router.post('/:id/analyze', auth, rateLimiter, async (req, res) => {
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
