const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvComplaintController'), 'utf8');

async function complete(status = 'OPEN', id = '7', fail = false) {
  const queries = [];
  let committed = false, rolledBack = false;
  const db = { beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => { rolledBack = true; },
    query: async (sql, args) => {
      queries.push({ sql, args });
      if (sql.startsWith('SELECT *')) return [status ? [{ status, assigned_employee_id: null }] : []];
      if (sql.includes('AS attempt_no')) return [[{ attempt_no: 2 }]];
      if (fail && sql.startsWith('UPDATE')) throw new Error('DB failed');
      return [{}];
    } };
  const ctx = { connection: { promise: () => db }, resolveEmployeeId: async () => 3, userId: () => 4 };
  vm.createContext(ctx);
  vm.runInContext(source.slice(source.indexOf('const completeComplaint ='), source.indexOf('const deleteComplaint =')) + '\nthis.run = completeComplaint;', ctx);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await ctx.run({ params: { complaintId: id } }, res);
  return { queries, committed, rolledBack, res };
}

for (const status of ['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING']) test(`${status} can complete directly with audit history`, async () => {
  const f = await complete(status);
  assert.equal(f.res.code, 200);
  assert(f.committed);
  assert(f.queries.some(q => q.sql.includes('FOR UPDATE')));
  const history = f.queries.find(q => q.sql.startsWith('INSERT'));
  assert.match(history.sql, /'COMPLETED'/);
  assert.deepEqual(Array.from(history.args), [7, 2, null, 4, 3]);
  assert(f.queries.some(q => q.sql.includes('completed_at = NOW()')));
});
test('completed, missing and invalid complaints cannot add completion history', async () => {
  for (const [status, id, code] of [['COMPLETED','7',409], [null,'7',404], ['OPEN','bad',400]]) {
    const f = await complete(status, id);
    assert.equal(f.res.code, code);
    assert(!f.committed);
    assert(!f.queries.some(q => q.sql.startsWith('INSERT')));
  }
});
test('completion and history roll back together on database failure', async () => {
  const f = await complete('OPEN', '7', true);
  assert.equal(f.res.code, 500);
  assert(f.rolledBack);
  assert(!f.committed);
});
test('completion allows complaint viewers and deletion remains admin-only', () => {
  const router = fs.readFileSync(require.resolve('../routes/cableTvRouter'), 'utf8');
  assert.match(router, /router.patch\('\/complaints\/:complaintId\/complete', auth.requirePermissionAction\('CABLE_TV_COMPLAINTS', 'can_view'\), completeComplaint\)/);
  assert.match(router, /router.delete\('\/complaints\/:complaintId', auth.requireAdmin, deleteComplaint\)/);
});

test('Done permits viewers without update access and rejects users without complaint access', () => {
  const auth = fs.readFileSync(require.resolve('../services/authendication'), 'utf8');
  for (const [role, canView, expected] of [['STAFF', true, 200], ['TECHNICIAN', true, 200], ['STAFF', false, 403], ['ADMIN', false, 200]]) {
    let allowed = false;
    const ctx = { connection: { query(sql, args, callback) {
      assert.match(sql, /can_view = 1/);
      assert.doesNotMatch(sql, /can_update/);
      assert.equal(args[1], 'CABLE_TV_COMPLAINTS');
      callback(null, canView ? [{}] : []);
    } } };
    vm.createContext(ctx);
    vm.runInContext(auth.slice(auth.indexOf('function requirePermissionAction('), auth.indexOf('function requireAnyPermission(')) + '\nthis.guard = requirePermissionAction;', ctx);
    const res = { locals: { role }, code: 200, status(code) { this.code = code; return this; }, json() {} };
    ctx.guard('CABLE_TV_COMPLAINTS', 'can_view')({ method: 'PATCH' }, res, () => { allowed = true; });
    assert.equal(res.code, expected);
    assert.equal(allowed, expected === 200);
  }
});
