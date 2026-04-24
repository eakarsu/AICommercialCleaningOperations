const express = require('express');
const Checklist = require('../models/Checklist');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const checklists = await Checklist.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(checklists);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const checklist = await Checklist.findByPk(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    res.json(checklist);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const checklist = await Checklist.create(req.body);
    res.status(201).json(checklist);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const checklist = await Checklist.findByPk(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    await checklist.update(req.body);
    res.json(checklist);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const checklist = await Checklist.findByPk(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    await checklist.destroy();
    res.json({ message: 'Checklist deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/items', auth, async (req, res) => {
  try {
    const checklist = await Checklist.findByPk(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    const items = req.body.items || [];
    const requiredItems = items.filter(i => i.required);
    const completedRequired = requiredItems.filter(i => i.completed);
    const totalItems = items.length;
    const completedItems = items.filter(i => i.completed).length;
    const completion_percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const allRequiredDone = requiredItems.length === 0 || completedRequired.length === requiredItems.length;
    let status = checklist.status;
    if (allRequiredDone && completion_percentage === 100) {
      status = 'completed';
    } else if (completedItems > 0 && status !== 'overdue') {
      status = 'in_progress';
    }
    const completed_date = status === 'completed' ? new Date().toISOString().split('T')[0] : checklist.completed_date;
    await checklist.update({ items, completion_percentage, status, completed_date });
    res.json(checklist);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
