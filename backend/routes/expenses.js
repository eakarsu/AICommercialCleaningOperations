const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    if (req.query.from || req.query.to) {
      where.date = {};
      if (req.query.from) where.date[Op.gte] = req.query.from;
      if (req.query.to) where.date[Op.lte] = req.query.to;
    }
    const expenses = await Expense.findAll({ where, order: [['date', 'DESC']] });
    res.json(expenses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const results = await Expense.findAll({
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        date: { [Op.gte]: firstDay, [Op.lte]: lastDay }
      },
      group: ['category'],
      raw: true
    });

    const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    res.json({ month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, categories: results, grand_total: grandTotal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json(expense);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await expense.update(req.body);
    res.json(expense);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await expense.destroy();
    res.json({ message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await expense.update({ status: 'approved', approved_by: req.body.approved_by });
    res.json(expense);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
