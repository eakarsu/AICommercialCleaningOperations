const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const Schedule = require('../models/Schedule');
const QualityInspection = require('../models/QualityInspection');
const Client = require('../models/Client');
const Checklist = require('../models/Checklist');
const Incident = require('../models/Incident');
const router = express.Router();

// Service rules live in Postgres (previously process memory, so edits were lost
// on restart and the UI's "used by scheduling" claim never held).
const DEFAULT_SERVICE_RULES = [
  { name: 'Daily Office Cleaning', frequency: 'daily', tasks: ['Empty trash bins', 'Vacuum carpets', 'Wipe surfaces', 'Restock restrooms'], property_type: 'office', est_hours: 2, active: true },
  { name: 'Weekly Deep Clean', frequency: 'weekly', tasks: ['Floor scrubbing', 'Window cleaning', 'Detailed dusting', 'Disinfect high-touch'], property_type: 'general', est_hours: 4, active: true },
  { name: 'Medical Facility Sanitation', frequency: 'daily', tasks: ['Disinfect exam rooms', 'Biohazard disposal', 'Sterilize equipment areas', 'OSHA-grade restroom clean'], property_type: 'medical', est_hours: 3, active: true },
  { name: 'Monthly Floor Care', frequency: 'monthly', tasks: ['Strip and wax floors', 'Carpet deep extraction', 'Polish hard surfaces'], property_type: 'retail', est_hours: 6, active: true },
  { name: 'Restaurant Kitchen Detail', frequency: 'weekly', tasks: ['Degrease hoods', 'Sanitize prep areas', 'Clean fryers', 'Floor drains'], property_type: 'restaurant', est_hours: 5, active: true }
];

let serviceRulesReady = false;
async function ensureServiceRulesTable() {
  if (serviceRulesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_rules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      frequency VARCHAR(50) NOT NULL,
      tasks JSONB NOT NULL DEFAULT '[]',
      property_type VARCHAR(50) NOT NULL DEFAULT 'general',
      est_hours NUMERIC(5,2) NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM service_rules');
  if (count.rows[0].c === 0) {
    for (const rule of DEFAULT_SERVICE_RULES) {
      await pool.query(
        `INSERT INTO service_rules (name, frequency, tasks, property_type, est_hours, active)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
        [rule.name, rule.frequency, JSON.stringify(rule.tasks), rule.property_type, rule.est_hours, rule.active]
      );
    }
  }
  serviceRulesReady = true;
}

function normalizeTasks(tasks) {
  if (Array.isArray(tasks)) return tasks.map(t => String(t).trim()).filter(Boolean);
  if (typeof tasks === 'string') return tasks.split('\n').map(t => t.trim()).filter(Boolean);
  return [];
}

// Case-insensitive site matching between a free-text location/client name on a
// record and the client's company name. Returns false when either side is empty,
// so missing data never produces a value.
function normSite(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function matchesSite(candidate, companyName) {
  const a = normSite(candidate);
  const b = normSite(companyName);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const first = b.split(' ')[0];
  return first.length > 3 && a.includes(first);
}

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
// All metrics come from recorded rows: QualityInspection.overall_score (0-10,
// scaled to 0-100), Incident severity, Schedule status, Checklist completion
// and Client.satisfaction_score. Missing data is returned as null ("no data");
// nothing is derived from row ids.
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
    const severityPenalty = { minor: 5, moderate: 12, major: 25, critical: 40 };

    const rows = clients.map(c => {
      const siteInspections = inspections.filter(i => matchesSite(i.location_name, c.company_name));
      const siteIncidents = incidents.filter(i => matchesSite(i.location, c.company_name));
      const siteSchedules = schedules.filter(s => matchesSite(s.client_name, c.company_name));
      const siteChecklists = checklists.filter(cl => matchesSite(cl.assigned_client, c.company_name));

      // Quality: average recorded inspection score (model stores 0-10).
      const scores = siteInspections
        .map(i => parseFloat(i.overall_score))
        .filter(Number.isFinite);
      const quality = scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10)
        : null;

      // Safety: penalty per recorded incident severity; null when no incidents
      // are on record (absence of records is not evidence of safety).
      const safety = siteIncidents.length
        ? Math.max(0, 100 - siteIncidents.reduce((sum, i) => sum + (severityPenalty[i.severity] || 10), 0))
        : null;

      // On-Time: share of recorded shifts completed (real status values).
      const completedSchedules = siteSchedules.filter(s => s.status === 'completed').length;
      const onTime = siteSchedules.length
        ? Math.round((completedSchedules / siteSchedules.length) * 100)
        : null;

      // Completion: average recorded checklist completion percentage.
      const completions = siteChecklists
        .map(cl => Number(cl.completion_percentage))
        .filter(Number.isFinite);
      const completion = completions.length
        ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
        : null;

      // Satisfaction: recorded client satisfaction score (0-10 -> 0-100).
      const satisfaction = c.satisfaction_score != null
        ? Math.round(parseFloat(c.satisfaction_score) * 10)
        : null;

      const valueCount = [quality, safety, onTime, completion, satisfaction].filter(v => v != null).length;
      return {
        site: c.company_name,
        industry: c.industry,
        values: {
          Quality: quality,
          Safety: safety,
          'On-Time': onTime,
          Completion: completion,
          Satisfaction: satisfaction
        },
        sampleSizes: {
          inspections: siteInspections.length,
          incidents: siteIncidents.length,
          schedules: siteSchedules.length,
          checklists: siteChecklists.length
        },
        hasData: valueCount > 0
      };
    });
    res.json({
      metrics,
      rows,
      noDataLabel: 'no data',
      note: 'Metrics are computed from recorded inspections, incidents, schedules, checklists and client satisfaction scores only.',
      generated_at: new Date().toISOString()
    });
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

// ============== NON-VIZ 2: Service Rules Editor (CRUD, persisted) ==============
router.get('/service-rules', auth, async (req, res) => {
  try {
    await ensureServiceRulesTable();
    const result = await pool.query('SELECT * FROM service_rules ORDER BY id ASC');
    res.json({ rules: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/service-rules', auth, async (req, res) => {
  try {
    await ensureServiceRulesTable();
    const { name, frequency, tasks, property_type, est_hours, active } = req.body || {};
    if (!name || !frequency) return res.status(400).json({ error: 'name and frequency required' });
    const result = await pool.query(
      `INSERT INTO service_rules (name, frequency, tasks, property_type, est_hours, active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6) RETURNING *`,
      [name, frequency, JSON.stringify(normalizeTasks(tasks)), property_type || 'general', parseFloat(est_hours) || 1, active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/service-rules/:id', auth, async (req, res) => {
  try {
    await ensureServiceRulesTable();
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const result = await pool.query(
      `UPDATE service_rules SET
         name = COALESCE($1, name),
         frequency = COALESCE($2, frequency),
         tasks = COALESCE($3::jsonb, tasks),
         property_type = COALESCE($4, property_type),
         est_hours = COALESCE($5, est_hours),
         active = COALESCE($6, active),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        body.name ?? null,
        body.frequency ?? null,
        body.tasks !== undefined ? JSON.stringify(normalizeTasks(body.tasks)) : null,
        body.property_type ?? null,
        body.est_hours !== undefined ? (parseFloat(body.est_hours) || 0) : null,
        body.active ?? null,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/service-rules/:id', auth, async (req, res) => {
  try {
    await ensureServiceRulesTable();
    const id = parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM service_rules WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'rule not found' });
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
