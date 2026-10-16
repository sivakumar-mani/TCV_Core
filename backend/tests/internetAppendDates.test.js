const { test } = require('node:test');
const assert = require('node:assert/strict');
const { internetAppendDates } = require('../controller/internetAppendDates');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function renewal(network, previous, months = 1, extra = {}) {
  return internetAppendDates({ network_type: network, previous_end_date: previous,
    previous_billing_basis: 'MONTH', previous_period_value: months, previous_period_count: months, ...extra }, '2026-12-01');
}
test('Krishi renewals start after the saved end date, including arrears, and finish on the 15th', () => {
  const one = renewal('KRISHI', '2026-10-15');
  assert.equal(one.start_date, '2026-10-16');
  assert.equal(one.end_date, '2026-11-15');
  assert.equal(one.number_of_days, 31);
  assert.equal(renewal('KRISHI', '2026-11-15').number_of_days, 30);
  const three = renewal('KRISHI', '2026-10-15', 3);
  assert.equal(three.end_date, '2026-11-15');
  assert.equal(three.period_count, 1);
});
test('RailWire appends one inclusive 30-day period regardless of previous duration', () => {
  const one = renewal('RAILWIRE', '2026-10-15');
  assert.equal(one.start_date, '2026-10-16');
  assert.equal(one.end_date, '2026-11-14');
  assert.equal(one.number_of_days, 30);
  const three = renewal('RAILWIRE', '2026-10-15', 3);
  assert.equal(three.end_date, '2026-11-14');
  assert.equal(three.number_of_days, 30);
});
test('leap-year, year boundary, legacy period counts and missing history remain supported', () => {
  assert.equal(renewal('KRISHI', '2028-02-15').end_date, '2028-03-15');
  assert.equal(renewal('RAILWIRE', '2028-02-28').end_date, '2028-03-29');
  assert.equal(renewal('KRISHI', '2026-12-15').end_date, '2027-01-15');
  assert.equal(renewal('RAILWIRE', '2026-10-15', 3, { previous_period_value: 1 }).period_count, 1);
  assert.equal(renewal('RAILWIRE', null).start_date, '2026-12-01');
});
test('Krishi always ends next month on the 15th, including irregular expiry and previous free days', () => {
  for (const previous of ['2026-09-30', '2026-10-14', '2026-10-30']) {
    const result = renewal('KRISHI', previous, 1, { previous_billing_basis: 'DAYS', previous_period_value: 7,
      previous_free_period_value: 5, previous_free_period_unit: 'DAYS' });
    assert.equal(result.end_date, '2026-11-15');
    assert.equal(result.free_period_value, 0);
    assert.equal(result.billing_basis, 'MONTH');
  }
  assert.equal(renewal('KRISHI', '2026-12-31').end_date, '2027-02-15');
  const railwire = renewal('RAILWIRE', '2026-10-15', 1, { previous_billing_basis: 'YEAR', previous_period_value: 1,
    previous_free_period_value: 5, previous_free_period_unit: 'DAYS' });
  assert.equal(railwire.end_date, '2026-11-14');
  assert.equal(railwire.free_period_value, 0);
});
test('DMNET day-based plans and free periods keep their existing duration', () => {
  const days = renewal('DMNET', '2026-10-15', 1, { previous_billing_basis: 'DAYS', previous_period_value: 7, previous_period_count: 7 / 30 });
  assert.equal(days.end_date, '2026-10-22');
  assert.equal(days.period_value, 7);
  const free = renewal('DMNET', '2026-10-15', 1, { previous_free_period_value: 5, previous_free_period_unit: 'DAYS' });
  assert.equal(free.end_date, '2026-11-19');
});

test('append saves the exact preview dates, one-month duration and matching amount', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../controller/internetCustomerController.js'), 'utf8');
  const code = source.slice(source.indexOf('const internetAppendPeriod='), source.indexOf('const parseNetIds='));
  const inserts = [];
  const db = { beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, query: async (sql, values) => {
    if (sql.startsWith('INSERT')) { inserts.push({ sql, values }); return [{ insertId: 1 }]; }
    assert.match(sql, /NOT EXISTS/);
    assert.match(sql, /approval_status='APPROVED'/);
    return [[{ internet_customer_id: 7, internet_customer_package_id: 8, network_type: 'RAILWIRE',
      previous_end_date: '2026-10-15', previous_billing_basis: 'MONTH', previous_period_value: 3,
      previous_period_count: 3, package_price: 100 }]];
  } };
  const context = { connection: { promise: () => db }, isAdmin: () => true, ensureInternetSchema: async () => {},
    internetCustomerNumberSql: () => 'c.customer_code', internetAppendDates,
    dateOnly: value => new Date(value).toISOString().slice(0, 10), money: value => Math.round(Number(value) || 0), intOrNull: value => Number(value) || null };
  vm.runInNewContext(code + ';this.preview=previewInternetSubscriptionAppend;this.append=appendInternetSubscriptions;', context);
  const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const preview = response();
  await context.preview({ query: { subscription_month: 11, subscription_year: 2026 } }, preview);
  assert.equal(preview.body.total_amount, 100);
  const saved = response();
  await context.append({ body: { subscription_month: 11, subscription_year: 2026, customer_ids: [7] } }, saved);
  assert.equal(saved.code, 201);
  assert.equal(inserts.length, 1);
  const values = inserts[0].values;
  assert.equal((inserts[0].sql.match(/\?/g) || []).length, values.length);
  assert.equal(values[5], 1);
  assert.equal(values[6], 1);
  assert.equal(values[9], preview.body.rows[0].start_date);
  assert.equal(values[10], preview.body.rows[0].end_date);
  assert.equal(values[11], 100);
  context.isAdmin = () => false;
  const denied = response();
  await context.append({ body: {} }, denied);
  assert.equal(denied.code, 403);
  assert.equal(inserts.length, 1);
});
