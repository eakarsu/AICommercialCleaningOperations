const express = require('express');
const { Op } = require('sequelize');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.date) where.date = req.query.date;
    if (req.query.crew) where.crew_name = { [Op.iLike]: `%${req.query.crew}%` };
    if (req.query.status) where.status = req.query.status;

    const schedules = await Schedule.findAll({ where, order: [['date', 'ASC'], ['start_time', 'ASC']] });
    res.json(schedules);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    res.json(schedule);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.status(201).json(schedule);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    await schedule.update(req.body);
    res.json(schedule);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    await schedule.destroy();
    res.json({ message: 'Schedule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
