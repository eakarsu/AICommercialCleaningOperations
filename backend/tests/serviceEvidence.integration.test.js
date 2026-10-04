'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

test('photo evidence and two-person billing review stay in one tenant', { skip: !process.env.CLEANING_WORKFLOW_TEST_DB }, async () => {
  process.env.DB_NAME = process.env.CLEANING_WORKFLOW_TEST_DB;
  process.env.DB_USER = 'postgres';
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '5432';
  process.env.DB_PASSWORD = '';
  process.env.JWT_SECRET = 'codex-disposable-cleaning-workflow-secret-2026';
  process.env.EVIDENCE_SIGNING_SECRET = 'codex-disposable-cleaning-evidence-secret-2026';
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const sequelize = require('../config/database');
  const router = require('../routes/serviceWorkflow');
  const app = express(); app.use(express.json()); app.use('/api/service-workflow', router);
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tenant = crypto.randomUUID(), otherTenant = crypto.randomUUID();
  const site = crypto.randomUUID(), plan = crypto.randomUUID(), run = crypto.randomUUID();
  const token = (id, role, tenantId) => jwt.sign({ id, role, tenant_id: tenantId }, process.env.JWT_SECRET);
  async function request(path, actor, method = 'GET', body) {
    const response = await fetch(`${base}/api/service-workflow${path}`, { method, headers: { Authorization: `Bearer ${actor}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    const type = response.headers.get('content-type') || '';
    return { status: response.status, data: type.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer()) };
  }
  try {
    await sequelize.query('INSERT INTO governed_sites(id,tenant_id,client_id,name,timezone) VALUES(:site,:tenant,:client,:name,:timezone)', { replacements: { site, tenant, client: 'client-1', name: 'Site A', timezone: 'America/New_York' } });
    await sequelize.query("INSERT INTO service_plans(id,tenant_id,contract_id,site_id,recurrence_rule,checklist_snapshot,sla_minutes,valid_from) VALUES(:plan,:tenant,'contract-1',:site,'FREQ=DAILY','{}'::jsonb,60,CURRENT_DATE)", { replacements: { plan, tenant, site } });
    await sequelize.query("INSERT INTO service_runs(id,tenant_id,plan_id,occurrence_key,status,scheduled_start,scheduled_end) VALUES(:run,:tenant,:plan,'occurrence-1','accepted',NOW(),NOW()+INTERVAL '1 hour')", { replacements: { run, tenant, plan } });
    const photo = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,1,2,3]);
    const clientUploadId = crypto.randomUUID();
    const form = new FormData(); form.append('photo', new Blob([photo], { type: 'image/png' }), 'evidence.png'); form.append('note', 'After service'); form.append('clientUploadId', clientUploadId);
    const uploaded = await request(`/runs/${run}/photo-evidence`, token(1, 'crew_lead', tenant), 'POST', form);
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data));
    const evidenceId = uploaded.data.item.id;
    const replay = await request(`/runs/${run}/photo-evidence`, token(1, 'crew_lead', tenant), 'POST', form);
    assert.equal(replay.status, 200, JSON.stringify(replay.data));
    assert.equal(replay.data.item.id, evidenceId);
    const changedPhoto = new FormData(); changedPhoto.append('photo', new Blob([Buffer.concat([photo, Buffer.from([4])])], { type: 'image/png' }), 'changed.png'); changedPhoto.append('clientUploadId', clientUploadId);
    assert.equal((await request(`/runs/${run}/photo-evidence`, token(1, 'crew_lead', tenant), 'POST', changedPhoto)).status, 409);
    const retrieved = await request(`/runs/${run}/photo-evidence/${evidenceId}`, token(2, 'supervisor', tenant));
    assert.equal(retrieved.status, 200);
    assert.deepEqual(retrieved.data, photo);
    assert.equal((await request(`/runs/${run}/photo-evidence/${evidenceId}`, token(3, 'supervisor', otherTenant))).status, 404);
    const signedFields = {
      kind: 'checklist', objectKey: 'offline/checklist-1.json', sha256: 'b'.repeat(64),
      capturedAt: new Date(new Date(uploaded.data.item.captured_at).getTime() + 1000).toISOString(),
      priorEvidenceHash: uploaded.data.item.evidence_hash, metadata: { checklistId: 'final' },
    };
    const sign = fields => crypto.createHmac('sha256', process.env.EVIDENCE_SIGNING_SECRET)
      .update([run, fields.objectKey, fields.sha256, fields.capturedAt, fields.priorEvidenceHash || ''].join(':')).digest('hex');
    const signed = await request(`/runs/${run}/evidence`, token(1, 'crew_lead', tenant), 'POST', { ...signedFields, signature: sign(signedFields) });
    assert.equal(signed.status, 201, JSON.stringify(signed.data));
    assert.equal(signed.data.prior_evidence_hash, uploaded.data.item.evidence_hash);
    assert.equal((await request(`/runs/${run}/evidence`, token(1, 'crew_lead', tenant), 'POST', { ...signedFields, signature: sign(signedFields) })).status, 409);
    const staleFields = { ...signedFields, priorEvidenceHash: signed.data.evidence_hash };
    assert.equal((await request(`/runs/${run}/evidence`, token(1, 'crew_lead', tenant), 'POST', { ...staleFields, signature: sign(staleFields) })).status, 409);
    const candidate = await request(`/runs/${run}/billing-candidates`, token(4, 'manager', tenant), 'POST', { invoiceReference: 'INV-1', invoiceSha256: 'a'.repeat(64), sourceRefs: { timeEntryRefs: ['time-1'], expenseRefs: [] }, inputs: { approvedMinutes: 60, clockedMinutes: 62, approvedExpenses: 10, invoiceLaborMinutes: 60, invoiceExpenses: 10 } });
    assert.equal(candidate.status, 201, JSON.stringify(candidate.data));
    const id = candidate.data.item.id;
    assert.equal((await request(`/runs/${run}/billing-candidates/${id}/review`, token(4, 'manager', tenant), 'POST', { decision: 'accepted', reason: 'Checked timesheet and invoice' })).status, 403);
    const review = await request(`/runs/${run}/billing-candidates/${id}/review`, token(5, 'supervisor', tenant), 'POST', { decision: 'accepted', reason: 'Checked timesheet and invoice' });
    assert.equal(review.status, 200, JSON.stringify(review.data));
    assert.equal(review.data.item.review_status, 'accepted');
    assert.equal((await request(`/runs/${run}/billing-candidates`, token(3, 'supervisor', otherTenant))).data.items.length, 0);
  } finally { await new Promise(resolve => server.close(resolve)); await sequelize.close(); }
});
