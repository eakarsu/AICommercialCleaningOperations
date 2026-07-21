'use strict';
const express = require('express');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const auth = require('../middleware/auth');
const { transitionService, inspectionScore } = require('../domain/serviceWorkflow');
const router = express.Router();
router.use(auth);
function tenant(req, res) { if (!req.user.tenant_id) { res.status(403).json({ error: 'Tenant-scoped identity required' }); return null; } return req.user.tenant_id; }

router.post('/runs', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const { planId, occurrenceKey, scheduledStart, scheduledEnd, crewId } = req.body;
  const startAt = new Date(scheduledStart); const endAt = new Date(scheduledEnd);
  if (!planId || !occurrenceKey || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) return res.status(400).json({ error: 'Valid plan, occurrence key, and schedule window required' });
  try {
    const [row] = await sequelize.query(`INSERT INTO service_runs(id,tenant_id,plan_id,occurrence_key,crew_id,status,scheduled_start,scheduled_end)
      SELECT :id,:tenant,p.id,:key,:crew,'scheduled',:start,:end FROM service_plans p WHERE p.id=:plan AND p.tenant_id=:tenant
      ON CONFLICT(tenant_id,occurrence_key) DO UPDATE SET occurrence_key=EXCLUDED.occurrence_key RETURNING *`,
      { replacements: { id: crypto.randomUUID(), tenant: tenantId, plan: planId, key: occurrenceKey, crew: crewId || null, start: scheduledStart, end: scheduledEnd }, type: QueryTypes.INSERT });
    res.status(201).json(Array.isArray(row) ? row[0] : row);
  } catch (error) { res.status(422).json({ error: 'Unable to schedule service run' }); }
});

router.post('/runs/:id/evidence', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const { kind, objectKey, sha256, capturedAt, priorEvidenceHash, metadata = {}, signature } = req.body;
  const secret = process.env.EVIDENCE_SIGNING_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ error: 'Evidence verification is not configured' });
  const material = [req.params.id, objectKey, sha256, capturedAt, priorEvidenceHash || ''].join(':');
  const expected = crypto.createHmac('sha256', secret).update(material).digest('hex');
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: 'Evidence signature invalid' });
  if (!kind || !objectKey || !/^[a-f0-9]{64}$/i.test(sha256 || '') || !capturedAt) return res.status(400).json({ error: 'Complete checksummed evidence required' });
  const [run] = await sequelize.query(`SELECT id FROM service_runs WHERE id=:run AND tenant_id=:tenant`, { replacements: { tenant: tenantId, run: req.params.id }, type: QueryTypes.SELECT });
  if (!run) return res.status(404).json({ error: 'Service run not found in tenant' });
  const [last] = await sequelize.query(`SELECT evidence_hash FROM service_evidence WHERE tenant_id=:tenant AND service_run_id=:run ORDER BY captured_at DESC LIMIT 1`, { replacements: { tenant: tenantId, run: req.params.id }, type: QueryTypes.SELECT });
  if ((last?.evidence_hash || null) !== (priorEvidenceHash || null)) return res.status(409).json({ error: 'Evidence hash chain mismatch' });
  const evidenceHash = crypto.createHash('sha256').update(material).digest('hex');
  const [rows] = await sequelize.query(`INSERT INTO service_evidence(id,tenant_id,service_run_id,captured_by,kind,object_key,sha256,captured_at,prior_evidence_hash,evidence_hash,metadata)
    VALUES(:id,:tenant,:run,:actor,:kind,:object,:sha,:captured,:prior,:hash,:metadata::jsonb) RETURNING *`, { replacements: { id: crypto.randomUUID(), tenant: tenantId, run: req.params.id, actor: req.user.id, kind, object: objectKey, sha: sha256.toLowerCase(), captured: capturedAt, prior: priorEvidenceHash || null, hash: evidenceHash, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT });
  res.status(201).json(Array.isArray(rows) ? rows[0] : rows);
});

router.post('/runs/:id/inspection', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  if (!['manager','supervisor','inspector','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Inspector role required' });
  try {
    const [run] = await sequelize.query(`SELECT id FROM service_runs WHERE id=:run AND tenant_id=:tenant`, { replacements: { tenant: tenantId, run: req.params.id }, type: QueryTypes.SELECT });
    if (!run) return res.status(404).json({ error: 'Service run not found in tenant' });
    const score = inspectionScore(req.body.items);
    const [rows] = await sequelize.query(`INSERT INTO service_inspections(id,tenant_id,service_run_id,inspector_id,rubric_snapshot,result,score,passed)
      VALUES(:id,:tenant,:run,:actor,:rubric::jsonb,:result::jsonb,:score,:passed) RETURNING *`, { replacements: { id: crypto.randomUUID(), tenant: tenantId, run: req.params.id, actor: req.user.id, rubric: JSON.stringify(req.body.rubric || {}), result: JSON.stringify(score), score: score.score, passed: score.passed }, type: QueryTypes.INSERT });
    res.status(201).json(Array.isArray(rows) ? rows[0] : rows);
  } catch (error) { res.status(422).json({ error: error.message }); }
});

router.post('/runs/:id/transition', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const transaction = await sequelize.transaction();
  try {
    const [run] = await sequelize.query(`SELECT * FROM service_runs WHERE id=:id AND tenant_id=:tenant FOR UPDATE`, { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction });
    if (!run) { await transaction.rollback(); return res.status(404).json({ error: 'Service run not found' }); }
    const [inspection, evidence, exceptions] = await Promise.all([
      sequelize.query(`SELECT passed FROM service_inspections WHERE service_run_id=:id AND tenant_id=:tenant ORDER BY created_at DESC LIMIT 1`, { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction }),
      sequelize.query(`SELECT count(*)::int AS count FROM service_evidence WHERE service_run_id=:id AND tenant_id=:tenant`, { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction }),
      sequelize.query(`SELECT count(*)::int AS count FROM service_exceptions WHERE service_run_id=:id AND tenant_id=:tenant AND status='open'`, { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction })
    ]);
    const governedRole = req.user.role === 'manager' ? 'supervisor' : req.user.role;
    const next = transitionService(run.status, req.body.status, governedRole, { inspectionComplete: Boolean(inspection[0]?.passed), evidenceVerified: evidence[0]?.count > 0, openExceptionCount: exceptions[0]?.count || 0 });
    await sequelize.query(`UPDATE service_runs SET status=:next,version=version+1 WHERE id=:id AND tenant_id=:tenant`, { replacements: { next, id: req.params.id, tenant: tenantId }, transaction });
    await sequelize.query(`INSERT INTO service_audit_events(tenant_id,service_run_id,actor_id,event_type,payload) VALUES(:tenant,:id,:actor,'status.changed',:payload::jsonb)`, { replacements: { tenant: tenantId, id: req.params.id, actor: req.user.id, payload: JSON.stringify({ from: run.status, to: next }) }, transaction });
    await transaction.commit(); res.json({ status: next });
  } catch (error) { await transaction.rollback(); res.status(409).json({ error: error.message }); }
});
module.exports = router;
