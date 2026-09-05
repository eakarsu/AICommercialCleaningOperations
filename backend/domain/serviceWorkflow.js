'use strict';

const TRANSITIONS = Object.freeze({ scheduled: ['assigned', 'cancelled'], assigned: ['in_progress', 'exception'], in_progress: ['submitted', 'exception'], submitted: ['accepted', 'rework'], rework: ['in_progress'], exception: ['assigned', 'cancelled'], accepted: ['invoiced'], invoiced: [], cancelled: [] });

function transitionService(current, next, actorRole, context = {}) {
  if (!(TRANSITIONS[current] || []).includes(next)) throw new Error(`invalid transition ${current} -> ${next}`);
  if (next === 'accepted' && !['supervisor', 'client_reviewer', 'admin'].includes(actorRole)) throw new Error('supervisor or client approval required');
  if (next === 'accepted' && (context.inspectionComplete !== true || context.evidenceVerified !== true)) throw new Error('verified evidence and inspection are required');
  if (['accepted', 'invoiced'].includes(next) && (!Number.isSafeInteger(context.openExceptionCount) || context.openExceptionCount !== 0)) throw new Error('resolved SLA exceptions and a verified exception count are required');
  if (next === 'invoiced' && !['supervisor', 'admin', 'billing'].includes(actorRole)) throw new Error('billing authority required');
  return next;
}

function inspectionScore(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('inspection items required');
  let earned = 0; let possible = 0; const failures = []; const ids = new Set();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('unique inspection item identifiers required');
    ids.add(item.id);
    if (![item.weight,item.score].every(v => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '')) throw new Error('invalid inspection item');
    const weight = Number(item.weight); const score = Number(item.score);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(score) || score < 0 || score > 100) throw new Error('invalid inspection item');
    possible += weight * 100; earned += weight * score; if (item.critical && score < 100) failures.push(item.id);
  }
  const score = Math.round((earned / possible) * 10000) / 100;
  return { score, criticalFailures: failures, passed: score >= 85 && failures.length === 0 };
}

function reconcile({ approvedMinutes, clockedMinutes, approvedExpenses, invoiceLaborMinutes, invoiceExpenses }) {
  for (const value of [approvedMinutes, clockedMinutes, approvedExpenses, invoiceLaborMinutes, invoiceExpenses]) if (!['number','string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('reconciliation values must be non-negative numbers');
  const laborVariance = Number(clockedMinutes) - Number(approvedMinutes);
  const invoiceLaborVariance = Number(invoiceLaborMinutes) - Number(approvedMinutes);
  const expenseVariance = Number(invoiceExpenses) - Number(approvedExpenses);
  return { laborVariance, invoiceLaborVariance, expenseVariance, requiresReview: Math.abs(laborVariance) > 15 || invoiceLaborVariance !== 0 || expenseVariance !== 0 };
}

module.exports = { TRANSITIONS, transitionService, inspectionScore, reconcile };
