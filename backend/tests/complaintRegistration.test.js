const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(pending) {
  const queries = [];
  let committed = false, rolledBack = false;
  const db = {
    beginTransaction: async () => {},
    commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; },
    query: async (sql, args) => {
      queries.push({ sql, args });
      if (sql.includes('AS next_no')) return [[{ next_no: 2 }]];
      if (sql.includes("status <> 'COMPLETED'")) return [[...(pending ? [pending] : [])]];
      if (sql.includes('INSERT INTO')) return [{ insertId: 2 }];
      return [[{ cable_customer_id: 1, customer_id: 1, internet_customer_id: 1 }]];
    }
  };
  const source = fs.readFileSync(require.resolve('../controller/cableTvComplaintController'), 'utf8');
  const context = { module: { exports: {} }, require: name => name === '../connection'
    ? { promise: () => db } : require('../controller/internetCustomerNumber') };
  vm.runInNewContext(source.replace('const ensureComplaintTables =', 'let ensureComplaintTables =').replace('const resolveEmployeeId =', 'let resolveEmployeeId =') + '\nensureComplaintTables = async () => {}; resolveEmployeeId = async () => 1;', context);
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  return { controller: context.module.exports, res, queries, state: () => ({ committed, rolledBack }) };
}

for (const [type, field] of [['CATV', 'cable_customer_id'], ['NET', 'internet_customer_id'], ['CCTV', 'service_customer_id']]) {
  test(`${type}: unfinished complaint blocks registration without inserting`, async () => {
    const f = fixture({ complaint_id: 1, complaint_no: 'CMP-000001', status: 'IN_PROGRESS' });
    await f.controller.addComplaint({ body: { complainant_type: type, [field]: 1, subject: 'Signal', nature_of_complaint: 'No signal' } }, f.res);
    assert.equal(f.res.statusCode, 409);
    assert.match(f.res.body.message, /CMP-000001/);
    assert.equal(f.res.body.code, 'CUSTOMER_COMPLAINT_PENDING');
    assert(!f.queries.some(q => q.sql.includes('INSERT INTO')));
    assert(f.queries.some(q => q.sql.includes(`WHERE ${field} = ? AND status <> 'COMPLETED'`)));
    assert(f.state().rolledBack);
  });
  test(`${type}: no unfinished complaint allows registration`, async () => {
    const f = fixture(null);
    await f.controller.addComplaint({ body: { complainant_type: type, [field]: 1, subject: 'Signal', nature_of_complaint: 'No signal' } }, f.res);
    assert.equal(f.res.statusCode, 201);
    assert(f.state().committed);
  });
}

test('anonymous callers remain registerable without customer duplicate matching', async () => {
  const f = fixture(null);
  await f.controller.addComplaint({ body: { complainant_type: 'ANONYMOUS', anonymous_name: 'Caller', subject: 'Signal', nature_of_complaint: 'No signal' } }, f.res);
  assert.equal(f.res.statusCode, 201);
  assert(!f.queries.some(q => q.sql.includes("status <> 'COMPLETED'")));
});

test('active complaint list sorts highest days ago first and exposes calendar age', async () => {
  const f = fixture(null);
  await f.controller.getComplaints({ query: { status: 'ACTIVE' } }, f.res);
  const query = f.queries.find(q => q.sql.includes('ORDER BY age_days'));
  assert.match(query.sql, /c.status IN \('OPEN', 'IN_PROGRESS'\)/);
  assert.match(query.sql, /ORDER BY age_days DESC, c.registered_at ASC, c.complaint_id ASC/);
  assert.match(query.sql, /DATEDIFF\(COALESCE\(c.completed_at, NOW\(\)\), c.registered_at\)/);
});

