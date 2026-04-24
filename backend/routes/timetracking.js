const express = require('express');
const { Op } = require('sequelize');
const TimeEntry = require('../models/TimeEntry');
const auth = require('../middleware/auth');
const router = express.Router();

function calculateHoursAndPay(entry) {
  if (entry.clock_in && entry.clock_out) {
    const diffMs = new Date(entry.clock_out) - new Date(entry.clock_in);
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = (entry.break_minutes || 0) / 60;
    const totalHours = Math.max(0, parseFloat((diffHours - breakHours).toFixed(2)));
    const overtimeHours = totalHours > 8 ? parseFloat((totalHours - 8).toFixed(2)) : 0;
    const regularHours = totalHours - overtimeHours;
    const rate = parseFloat(entry.hourly_rate) || 0;
    const totalPay = parseFloat(((regularHours * rate) + (overtimeHours * rate * 1.5)).toFixed(2));
    return { total_hours: totalHours, overtime_hours: overtimeHours, total_pay: totalPay };
  }
  return {};
}

router.get('/summary/weekly', auth, async (req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const entries = await TimeEntry.findAll({
      where: {
        date: {
          [Op.between]: [startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]]
        }
      },
      order: [['employee_name', 'ASC'], ['date', 'ASC']]
    });

    const grouped = {};
    entries.forEach(entry => {
      const name = entry.employee_name;
      if (!grouped[name]) {
        grouped[name] = { employee_name: name, entries: [], total_hours: 0, total_pay: 0, total_overtime: 0 };
      }
      grouped[name].entries.push(entry);
      grouped[name].total_hours += parseFloat(entry.total_hours || 0);
      grouped[name].total_pay += parseFloat(entry.total_pay || 0);
      grouped[name].total_overtime += parseFloat(entry.overtime_hours || 0);
    });

    res.json(Object.values(grouped));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const entries = await TimeEntry.findAll({ order: [['date', 'DESC'], ['clock_in', 'DESC']] });
    res.json(entries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, ...calculateHoursAndPay(req.body) };
    if (data.clock_out && data.status === 'clocked_in') {
      data.status = 'clocked_out';
    }
    const entry = await TimeEntry.create(data);
    res.status(201).json(entry);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    const data = { ...req.body, ...calculateHoursAndPay(req.body) };
    await entry.update(data);
    res.json(entry);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    await entry.destroy();
    res.json({ message: 'Time entry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/clockout', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    if (entry.status !== 'clocked_in') return res.status(400).json({ error: 'Entry is not clocked in' });
    const clockOut = new Date();
    const updated = {
      clock_out: clockOut,
      status: 'clocked_out',
      ...calculateHoursAndPay({ ...entry.toJSON(), clock_out: clockOut })
    };
    await entry.update(updated);
    res.json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
