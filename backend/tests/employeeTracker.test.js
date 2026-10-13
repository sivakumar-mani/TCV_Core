const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { point, positiveId, dayRange } = require('../tracker/validation');
const now = Date.now();
const valid = () => ({ point_id: 'point-12345678', latitude: 13.08, longitude: 80.27, accuracy: 10, battery_level: 60, recorded_at: new Date(now).toISOString() });
test('location validation rejects malformed coordinates, battery and timestamps', () => {
  assert.equal(point(valid(), now).latitude, 13.08);
  for (const patch of [{ latitude: null }, { latitude: '13' }, { longitude: 181 }, { accuracy: -1 }, { battery_level: 101 }, { speed: Infinity }, { recorded_at: 'bad' }, { recorded_at: new Date(now + 300000).toISOString() }, { point_id: 'x' }]) assert.throws(() => point({ ...valid(), ...patch }, now));
  assert.throws(() => point({ ...valid(), recorded_at: new Date(now - 8 * 86400000).toISOString() }, now));
});
test('history dates and IDs reject invalid input and SQL fragments', () => {
  assert.deepEqual(dayRange('2026-10-09'), ['2026-10-09 00:00:00', '2026-10-10 00:00:00']);
  for (const d of ['2026-02-30', '2026-99-99', '2026-10-09 OR 1=1']) assert.throws(() => dayRange(d));
  for (const id of [0, -1, '1 OR 1=1', 1.5]) assert.throws(() => positiveId(id));
});

function fixture(options = {}) {
  const calls = []; let rolledBack = false, committed = false;
  const db = {
    query: async (sql, args) => {
      calls.push({ sql, args });
      if (sql.includes('FROM users')) return [[{ user_id: 1, employee_id: options.employee === undefined ? 7 : options.employee, role: 'EMPLOYEE', is_active: options.active === false ? 0 : 1 }]];
      if (sql.includes('FOR UPDATE')) return [options.sessionMissing ? [] : [{ session_id: 10, employee_id: 7, started_at: new Date(now - 10000), ended_at: options.ended ? new Date(now) : null }]];
      if (sql.startsWith('SELECT')) return [[]];
      return [{ insertId: 10, affectedRows: 1 }];
    },
    beginTransaction: async () => calls.push({ sql: 'BEGIN' }),
    commit: async () => { committed = true; }, rollback: async () => { rolledBack = true; }
  };
  const auth = {
    authendicateToken: (req, res, next) => { res.locals = { userId: 1, employee_id: 999, role: 'ADMIN' }; next(); },
    requirePermissionAction: key => (req, res, next) => options.deny === key ? res.status(403).json({ message: 'Denied' }) : next()
  };
  const context = { module: { exports: {} }, require: name => name === '../services/authendication' ? auth : name === './validation' ? require('../tracker/validation') : require(name) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../tracker/router'), 'utf8'), context);
  const router = context.module.exports.createTrackerRouter({ promise: () => db });
  async function run(method, path, body = {}, query = {}, params = {}) {
    const req = { method, body, query, params };
    const res = { locals: {}, code: 200, done: false, status(n) { this.code = n; return this; }, json(b) { this.body = b; this.done = true; return this; } };
    const layers = router.stack.filter(l => !l.route).map(l => l.handle);
    const route = router.stack.find(l => l.route?.path === path && l.route.methods[method.toLowerCase()]);
    layers.push(...route.route.stack.map(l => l.handle));
    for (const handler of layers) { if (res.done) break; let next = false; await handler(req, res, () => { next = true; }); if (!next && !res.done) throw new Error('Middleware did not finish'); }
    return res;
  }
  return { run, calls, get rolledBack() { return rolledBack; }, get committed() { return committed; } };
}
test('duty requires consent and persisted employee identity, ignoring submitted identity', async () => {
  const f = fixture();
  assert.equal((await f.run('POST', '/duty/start', { consent: false })).code, 400);
  assert.equal((await f.run('POST', '/duty/start', { consent: true, employee_id: 99 })).code, 201);
  assert.equal(f.calls.find(c => c.sql.startsWith('INSERT')).args[0], 7);
  assert.equal((await fixture({ employee: null }).run('POST', '/duty/start', { consent: true })).code, 403);
  assert.equal((await fixture({ active: false }).run('GET', '/me')).code, 403);
});
test('admin live data requires its separate permission; employee cannot request others via self history', async () => {
  assert.equal((await fixture({ deny: 'EMPLOYEE_TRACKER_ADMIN' }).run('GET', '/live')).code, 403);
  const f = fixture();
  assert.equal((await f.run('GET', '/history', {}, { date: '2026-10-09', employee_id: 999 })).code, 200);
  assert.equal(f.calls.find(c => c.sql.includes('FROM tracker_locations')).args[0], 7);
});
test('locations are transactionally scoped to own active session and deduplicated', async () => {
  const f = fixture();
  assert.equal((await f.run('POST', '/locations', { session_id: 10, employee_id: 999, points: [valid()] })).code, 200);
  assert.ok(f.committed);
  assert.deepEqual(Array.from(f.calls.find(c => c.sql.includes('FOR UPDATE')).args), [10, 7]);
  const insert = f.calls.find(c => c.sql.includes('INSERT INTO tracker_locations'));
  assert.equal(insert.args[1], 7); assert.match(insert.sql, /ON DUPLICATE KEY/);
  for (const options of [{ ended: true }, { sessionMissing: true }]) {
    const denied = fixture(options);
    assert.equal((await denied.run('POST', '/locations', { session_id: 10, points: [valid()] })).code, 409);
    assert.ok(denied.rolledBack); assert.ok(!denied.calls.some(c => c.sql.includes('INSERT INTO tracker_locations')));
  }
});
test('out-of-duty points roll back and empty or oversized batches never open transactions', async () => {
  const f = fixture();
  const older = { ...valid(), recorded_at: new Date(now - 60000).toISOString() };
  assert.equal((await f.run('POST', '/locations', { session_id: 10, points: [older] })).code, 400); assert.ok(f.rolledBack);
  for (const points of [[], Array(101).fill(valid())]) {
    const invalid = fixture(); assert.equal((await invalid.run('POST', '/locations', { session_id: 10, points })).code, 400);
    assert.ok(!invalid.calls.some(c => c.sql === 'BEGIN'));
  }
});
test('employee can stop duty after tracker grant is revoked and cannot stop another employee', async () => {
  const f = fixture({ deny: 'EMPLOYEE_TRACKER' });
  assert.equal((await f.run('POST', '/duty/stop', { employee_id: 999 })).code, 200);
  assert.equal(f.calls.find(c => c.sql.startsWith('UPDATE tracker_sessions')).args[0], 7);
});
