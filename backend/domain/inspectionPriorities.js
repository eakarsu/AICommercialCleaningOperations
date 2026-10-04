'use strict';

function rankInspectionFailures(rows) {
  const counts = new Map();
  for (const row of rows) {
    const ids = Array.isArray(row.result?.criticalFailures) ? row.result.criticalFailures : [];
    for (const id of new Set(ids.filter(value => typeof value === 'string' && value.trim()))) {
      const entry = counts.get(id) || { checklistItemId: id, failureCount: 0, inspectionIds: [] };
      entry.failureCount += 1;
      entry.inspectionIds.push(String(row.id));
      counts.set(id, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.failureCount - a.failureCount || a.checklistItemId.localeCompare(b.checklistItemId));
}

function validateExplanations(data, ranked) {
  if (!data || !Array.isArray(data.items)) throw new Error('AI returned no inspection explanations');
  const known = new Map(ranked.map(item => [item.checklistItemId, new Set(item.inspectionIds)]));
  const items = data.items.map(item => {
    if (!known.has(item.checklistItemId) || typeof item.reason !== 'string' || !item.reason.trim() ||
        !Array.isArray(item.inspectionIds) || !item.inspectionIds.length ||
        item.inspectionIds.some(id => !known.get(item.checklistItemId).has(String(id)))) {
      throw new Error('AI explanation lacks matching inspection citations');
    }
    return { checklistItemId: item.checklistItemId, reason: item.reason.trim(), inspectionIds: [...new Set(item.inspectionIds.map(String))] };
  });
  return items;
}

module.exports = { rankInspectionFailures, validateExplanations };
