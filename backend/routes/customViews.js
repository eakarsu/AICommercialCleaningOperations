const express = require('express');
const auth = require('../middleware/auth');
const Schedule = require('../models/Schedule');
const QualityInspection = require('../models/QualityInspection');
const Client = require('../models/Client');
const Checklist = require('../models/Checklist');
const Incident = require('../models/Incident');
const router = express.Router();

// In-memory store for service rules (CRUD)
let serviceRules = [
  { id: 1, name: 'Daily Office Cleaning', frequency: 'daily', tasks: ['Empty trash bins', 'Vacuum carpets', 'Wipe surfaces', 'Restock restrooms'], property_type: 'office', est_hours: 2, active: true },
  { id: 2, name: 'Weekly Deep Clean', frequency: 'weekly', tasks: ['Floor scrubbing', 'Window cleaning', 'Detailed dusting', 'Disinfect high-touch'], property_type: 'general', est_hours: 4, active: true },
  { id: 3, name: 'Medical Facility Sanitation', frequency: 'daily', tasks: ['Disinfect exam rooms', 'Biohazard disposal', 'Sterilize equipment areas', 'OSHA-grade restroom clean'], property_type: 'medical', est_hours: 3, active: true },
  { id: 4, name: 'Monthly Floor Care', frequency: 'monthly', tasks: ['Strip and wax floors', 'Carpet deep extraction', 'Polish hard surfaces'], property_type: 'retail', est_hours: 6, active: true },
  { id: 5, name: 'Restaurant Kitchen Detail', frequency: 'weekly', tasks: ['Degrease hoods', 'Sanitize prep areas', 'Clean fryers', 'Floor drains'], property_type: 'restaurant', est_hours: 5, active: true }
];
let nextRuleId = 6;

// ============== VIZ 1: Shift Schedule Gantt Timeline ==============
router.get('/shift-gantt', auth, async (req, res) => {
  try {
    const schedules = await Schedule.findAll({ order: [['date', 'ASC'], ['start_time', 'ASC']], limit: 100 });
    const items = schedules.map(s => {
      const startISO = `${s.date}T${s.start_time || '08:00:00'}`;
      const endISO = `${s.date}T${s.end_time || '17:00:00'}`;
      return {
        id: s.id,
        crew: s.crew_name,
        client: s.client_name,
        title: s.title,
        location: s.location,
        service_type: s.service_type,
        status: s.status,
        priority: s.priority,
        start: startISO,
        end: endISO,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time
      };
    });
    // Group by crew for swim lanes
    const crewMap = {};
    items.forEach(it => {
      if (!crewMap[it.crew]) crewMap[it.crew] = [];
      crewMap[it.crew].push(it);
    });
    const lanes = Object.keys(crewMap).sort().map(crew => ({ crew, shifts: crewMap[crew] }));
    res.json({ lanes, total_shifts: items.length, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== VIZ 2: Site Performance Heatmap (site x metric) ==============
router.get('/site-heatmap', auth, async (req, res) => {
  try {
    const [clients, inspections, incidents, schedules, checklists] = await Promise.all([
      Client.findAll({ limit: 25 }),
      QualityInspection.findAll(),
      Incident.findAll(),
      Schedule.findAll(),
      Checklist.findAll()
    ]);
    const metrics = ['Quality', 'Safety', 'On-Time', 'Completion', 'Satisfaction'];
    const rows = clients.map(c => {
      const clientInspections = inspections.filter(i => (i.client_name || i.location || '').toLowerCase().includes((c.company_name || '').toLowerCase().split(' ')[0]));
      const clientIncidents = incidents.filter(i => (i.client_name || i.location || '').toLowerCase().includes((c.company_name || '').toLowerCase().split(' ')[0]));
      const clientSchedules = schedules.filter(s => (s.client_name || '').toLowerCase().includes((c.company_name || '').toLowerCase().split(' ')[0]));
      const clientChecklists = checklists.filter(cl => (cl.assigned_client || '').toLowerCase().includes((c.company_name || '').toLowerCase().split(' ')[0]));
      // Quality: avg inspection score (0-100). Default deterministic by id.
      const qualityRaw = clientInspections.length
        ? clientInspections.reduce((a, b) => a + (parseFloat(b.score) || 75), 0) / clientInspections.length
        : 70 + ((c.id * 7) % 25);
      // Safety: inverse of incidents (100 minus incidents*10)
      const safety = Math.max(40, 100 - (clientIncidents.length * 12) - ((c.id * 3) % 10));
      // On-Time: completed vs scheduled
      const completedSched = clientSchedules.filter(s => s.status === 'completed').length;
      const onTime = clientSchedules.length
        ? Math.round((completedSched / clientSchedules.length) * 100)
        : 60 + ((c.id * 5) % 30);
      // Completion: checklist avg completion
      const completion = clientChecklists.length
        ? Math.round(clientChecklists.reduce((a, b) => a + (b.completion_percentage || 50), 0) / clientChecklists.length)
        : 55 + ((c.id * 11) % 35);
      // Satisfaction from client model
      const satisfaction = c.satisfaction_score ? Math.round(parseFloat(c.satisfaction_score) * 10) : 70 + ((c.id * 9) % 25);
      return {
        site: c.company_name,
        industry: c.industry,
        values: {
          Quality: Math.round(qualityRaw),
          Safety: Math.round(safety),
          'On-Time': onTime,
          Completion: completion,
          Satisfaction: satisfaction
        }
      };
    });
    res.json({ metrics, rows, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== NON-VIZ 1: Cleaning Checklist PDF ==============
router.get('/checklist-pdf/:id?', auth, async (req, res) => {
  try {
    let checklist;
    if (req.params.id) {
      checklist = await Checklist.findByPk(req.params.id);
    }
    if (!checklist) {
      checklist = await Checklist.findOne({ order: [['createdAt', 'DESC']] });
    }
    if (!checklist) {
      checklist = {
        id: 0,
        name: 'Sample Checklist',
        property_type: 'office',
        service_type: 'regular',
        items: [{ task: 'Empty trash', done: false }, { task: 'Vacuum', done: false }, { task: 'Wipe surfaces', done: false }],
        assigned_crew: 'Crew Alpha',
        assigned_client: 'Sample Client',
        due_date: new Date().toISOString().slice(0, 10),
        status: 'template',
        completion_percentage: 0
      };
    }
    const items = Array.isArray(checklist.items) && checklist.items.length
      ? checklist.items
      : [
          { task: 'Empty trash bins', done: false },
          { task: 'Vacuum and mop all floors', done: false },
          { task: 'Wipe all surfaces with disinfectant', done: false },
          { task: 'Clean and restock restrooms', done: false },
          { task: 'Clean entrance glass and door handles', done: false }
        ];

    // Minimal valid PDF generator (single page, Helvetica)
    const lines = [];
    lines.push('CleanOps AI - Cleaning Checklist');
    lines.push(`Name: ${checklist.name}`);
    lines.push(`Property Type: ${checklist.property_type}`);
    lines.push(`Service Type: ${checklist.service_type}`);
    lines.push(`Crew: ${checklist.assigned_crew || 'N/A'}`);
    lines.push(`Client: ${checklist.assigned_client || 'N/A'}`);
    lines.push(`Due: ${checklist.due_date || 'N/A'}`);
    lines.push(`Status: ${checklist.status}   Completion: ${checklist.completion_percentage || 0}%`);
    lines.push('');
    lines.push('TASKS:');
    items.forEach((it, idx) => {
      const task = (typeof it === 'string') ? it : (it.task || it.name || JSON.stringify(it));
      const done = (typeof it === 'object' && it.done) ? '[X]' : '[ ]';
      lines.push(`${done} ${idx + 1}. ${task}`.slice(0, 95));
    });
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);

    // Build PDF content stream
    let y = 760;
    const contentParts = ['BT', '/F1 11 Tf'];
    lines.forEach(line => {
      const safe = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      contentParts.push(`1 0 0 1 50 ${y} Tm (${safe}) Tj`);
      y -= 16;
    });
    contentParts.push('ET');
    const content = contentParts.join('\n');

    const objects = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n');
    objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
    objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`);

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach(obj => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += obj;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach(o => {
      pdf += String(o).padStart(10, '0') + ' 00000 n \n';
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="checklist_${checklist.id || 'sample'}.pdf"`);
    res.send(Buffer.from(pdf, 'binary'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== NON-VIZ 2: Service Rules Editor (CRUD) ==============
router.get('/service-rules', auth, (req, res) => {
  res.json({ rules: serviceRules, count: serviceRules.length });
});

router.post('/service-rules', auth, (req, res) => {
  const { name, frequency, tasks, property_type, est_hours, active } = req.body || {};
  if (!name || !frequency) return res.status(400).json({ error: 'name and frequency required' });
  const rule = {
    id: nextRuleId++,
    name,
    frequency,
    tasks: Array.isArray(tasks) ? tasks : (typeof tasks === 'string' ? tasks.split('\n').map(t => t.trim()).filter(Boolean) : []),
    property_type: property_type || 'general',
    est_hours: parseFloat(est_hours) || 1,
    active: active !== false
  };
  serviceRules.push(rule);
  res.status(201).json(rule);
});

router.put('/service-rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = serviceRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'rule not found' });
  const body = req.body || {};
  if (body.tasks && typeof body.tasks === 'string') {
    body.tasks = body.tasks.split('\n').map(t => t.trim()).filter(Boolean);
  }
  serviceRules[idx] = { ...serviceRules[idx], ...body, id };
  res.json(serviceRules[idx]);
});

router.delete('/service-rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const before = serviceRules.length;
  serviceRules = serviceRules.filter(r => r.id !== id);
  if (serviceRules.length === before) return res.status(404).json({ error: 'rule not found' });
  res.json({ deleted: true, id });
});

module.exports = router;
