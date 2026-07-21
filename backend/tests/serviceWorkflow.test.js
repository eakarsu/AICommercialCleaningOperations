const test = require('node:test');
const assert = require('node:assert/strict');
const { transitionService, inspectionScore, reconcile } = require('../domain/serviceWorkflow');

test('requires tamper-verified evidence, inspection, and approval', () => {
  assert.throws(() => transitionService('submitted', 'accepted', 'worker', { inspectionComplete: true, evidenceVerified: true }), /approval/);
  assert.throws(() => transitionService('submitted', 'accepted', 'supervisor', { inspectionComplete: true, evidenceVerified: false }), /evidence/);
  assert.equal(transitionService('submitted', 'accepted', 'supervisor', { inspectionComplete: true, evidenceVerified: true }), 'accepted');
});
test('scores weighted inspections and fails critical misses', () => {
  assert.deepEqual(inspectionScore([{ id: 'surface', weight: 1, score: 100, critical: false }]), { score: 100, criticalFailures: [], passed: true });
  assert.equal(inspectionScore([{ id: 'biohazard', weight: 1, score: 99, critical: true }]).passed, false);
});
test('reconciles approved time, captured time, payroll, and invoice inputs', () => {
  assert.equal(reconcile({ approvedMinutes: 60, clockedMinutes: 90, approvedExpenses: 5, invoiceLaborMinutes: 60, invoiceExpenses: 5 }).requiresReview, true);
});
