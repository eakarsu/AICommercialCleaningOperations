const test = require('node:test');
const assert = require('node:assert/strict');
const { rankInspectionFailures, validateExplanations } = require('../domain/inspectionPriorities');

test('ranks only recorded critical checklist failures and validates cited AI explanations', () => {
  const ranked = rankInspectionFailures([
    { id: 'inspection-a', result: { criticalFailures: ['restroom', 'restroom', 'lobby'] } },
    { id: 'inspection-b', result: { criticalFailures: ['restroom'] } },
  ]);
  assert.deepEqual(ranked[0], { checklistItemId: 'restroom', failureCount: 2, inspectionIds: ['inspection-a', 'inspection-b'] });
  assert.deepEqual(validateExplanations({ items: [{ checklistItemId: 'restroom', reason: 'Repeated critical misses', inspectionIds: ['inspection-a'] }] }, ranked),
    [{ checklistItemId: 'restroom', reason: 'Repeated critical misses', inspectionIds: ['inspection-a'] }]);
  assert.throws(() => validateExplanations({ items: [{ checklistItemId: 'restroom', reason: 'Unverified claim', inspectionIds: ['invented'] }] }, ranked), /matching inspection citations/);
});
