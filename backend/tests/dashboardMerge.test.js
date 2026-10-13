const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { internetCustomerNumberSql } = require('../controller/internetCustomerNumber');

function controller(db) {
  const context = { module: { exports: {} }, console, require(name) {
    if (name === '../connection') return { promise: () => db };
    if (name === './internetCustomerNumber') return { internetCustomerNumberSql };
    if (name === './internetExpiryReminderLog') return { ensureReminderLog: async () => {} };
    throw new Error(`Unexpected dependency ${name}`);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/dashboardController.js'), 'utf8'), context);
  return context.module.exports;
}

test('merged dashboard keeps generic expiry APIs and reminder-aware Internet expiry data', async () => {
  const queries = [];
  const api = controller({ query: async sql => {
    queries.push(sql);
    return [[{ customer_id: 7, email: 'saved@example.com', sent_count: 2, days_remaining: 1 }]];
  } });
  let body;
  const res = { json(value) { body = value; }, status() { throw new Error('Unexpected failure'); } };
  for (const type of ['CATV', 'NET']) {
    await api.getUpcomingExpiries({ query: { type } }, res);
    assert.equal(body[0].service, type);
    assert.match(queries.at(-1), type === 'CATV' ? /MAX\(expiry_date\)/ : /MAX\(end_date\)/);
  }
  await api.getUpcomingInternetExpiries({}, res);
  assert.equal(body[0].email, 'saved@example.com');
  assert.equal(body[0].sent_count, 2);
  assert.match(queries.at(-1), /log\.status = 'SENT'/);
  assert.match(queries.at(-1), /INTERVAL 1 DAY/);
  assert.match(queries.at(-1), /INTERVAL 31 DAY/);
});

test('existing dashboard summary still returns its original counts', async () => {
  const api = controller({ query: async sql => {
    if (sql.includes('waiting_count')) return [[{ waiting_count: 3 }]];
    if (sql.includes('FROM cable_tv_customers')) return [[{ active_count: 4, deactive_count: 2 }]];
    if (sql.includes('FROM internet_customers')) return [[{ active_count: 5, deactive_count: 1 }]];
    if (sql.includes('fault_in_service_count')) return [[{ fault_in_service_count: 2 }]];
    return [[{ status: 'OPEN', count: 6 }]];
  } });
  let body;
  await api.getDashboardSummary({}, { json(value) { body = value; }, status() { throw new Error('Unexpected failure'); } });
  assert.equal(body.workflow_waiting_count, 3);
  assert.equal(body.internet.active, 5);
  assert.equal(body.catv.active, 4);
  assert.equal(body.complaints.OPEN, 6);
  assert.equal(body.complaints.COMPLETED, 0);
});
