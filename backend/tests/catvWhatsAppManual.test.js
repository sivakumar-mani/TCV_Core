const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('manual send route authenticates and restricts access to admins', async () => {
  const routes = [];
  const authenticate = () => {}, admin = () => {};
  const auth = { authendicateToken: authenticate, requireAdmin: admin,
    requirePermission: () => () => {}, requirePermissionAction: () => () => {}, requireAnyPermission: () => () => {} };
  const router = new Proxy({}, { get: (_, method) => (...args) => routes.push({ method, args }) });
  let calls = 0;
  const source = fs.readFileSync(require.resolve('../routes/cableTvRouter'), 'utf8');
  vm.runInNewContext(source, { module: { exports: {} }, require: name => {
    if (name === 'express') return { Router: () => router };
    if (name.includes('authendication')) return auth;
    if (name.includes('catvWhatsAppNotifications')) return { sendComplaintManually: async id => {
      calls++;
      assert.equal(id, 42);
      return { message: 'Sent' };
    } };
    return {};
  } });
  assert.equal(routes[0].args[0], authenticate);
  const route = routes.find(r => r.method === 'post' && r.args[0] === '/complaints/:complaintId/whatsapp');
  assert.equal(route.args[1], admin);
  const res = { json(body) { this.body = body; return this; } };
  await route.args[2]({ params: { complaintId: '42' } }, res);
  assert.equal(calls, 1);
  assert.equal(res.body.message, 'Sent');
});

test('manual send rejects invalid IDs and unavailable worker', async () => {
  const { sendComplaintManually } = require('../services/catvWhatsAppNotifications');
  for (const id of [NaN, 0, -1, 1.5]) await assert.rejects(sendComplaintManually(id), { status: 400 });
  await assert.rejects(sendComplaintManually(42), { status: 503 });
});

test('admin guard rejects staff even with complaint permissions', () => {
  const source = fs.readFileSync(require.resolve('../services/authendication'), 'utf8');
  const context = { module: { exports: {} }, require: name => name === 'dotenv' ? { config() {} } : {}, process: { env: {} } };
  vm.runInNewContext(source + '\nthis.guard = requireAdmin;', context);
  for (const role of ['TECHNICIAN', 'STAFF', undefined]) {
    let allowed = false;
    const res = { locals: { role }, status(code) { this.code = code; return this; }, json() {} };
    context.guard({}, res, () => { allowed = true; });
    assert.equal(res.code, 403);
    assert.equal(allowed, false);
  }
  let allowed = false;
  context.guard({}, { locals: { role: 'ADMIN' } }, () => { allowed = true; });
  assert.equal(allowed, true);
});
