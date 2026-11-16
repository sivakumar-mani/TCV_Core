const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvController'), 'utf8');
const context = { dateOnly: value => value, daysInMonth: (month, year) => new Date(year, month, 0).getDate() };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const subscriptionBillingDays ='), source.indexOf('const customerStatusForStbStatus =')) + '\nthis.bill = subscriptionBillingDays;', context);

test('five-day buckets preserve full month and every boundary through day 31', () => {
  for (const [day, expected] of [[1,31],[5,31],[6,25],[10,25],[11,20],[15,20],[16,15],[20,15],[21,10],[25,10],[26,5],[30,5],[31,5]]) {
    assert.equal(context.bill(`2026-10-${String(day).padStart(2, '0')}`), expected);
  }
  assert.equal(context.bill('2026-11-14'), 20);
  assert.equal(context.bill('2026-11-05'), 30);
  assert.equal(context.bill('2027-02-05'), 28);
  assert.equal(context.bill('2028-02-05'), 29);
});
