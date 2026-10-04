const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function loadController(name, connection) {
  const sandbox = {
    module: { exports: {} }, Buffer, process,
    require: (name) => {
      if (name === '../connection') return connection;
      if (name === 'dotenv') return { config() {} };
      if (name === '../utils/permissionCatalog') return require('../utils/permissionCatalog');
      return require(name);
    }
  };
  const source = fs.readFileSync(path.join(root, 'controller', name), 'utf8');
  vm.runInNewContext(source + (name === 'userController.js' ? '\nmodule.exports.testNormalizeRole = normalizeRole;' : ''), sandbox);
  return sandbox.module.exports;
}

function response() {
  return { locals: { userId: 1 }, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('user role normalization preserves Senior Manager and existing roles', () => {
  const controller = loadController('userController.js', {});
  for (const role of ['ADMIN', 'MANAGER', 'EMPLOYEE', 'SALES', 'SERVICE', 'SENIOR_MANAGER']) {
    assert.equal(controller.testNormalizeRole(role.toLowerCase()), role);
  }
  for (const role of ['USER', 'STAFF', 'unknown', undefined]) assert.equal(controller.testNormalizeRole(role), 'EMPLOYEE');
  const source = fs.readFileSync(path.join(root, 'controller/userController.js'), 'utf8');
  assert.equal((source.match(/normalizeRole\(user.role\)/g) || []).length, 2);
});

test('permission API lists and saves Senior Manager without touching other roles', async () => {
  const calls = [];
  const controller = loadController('permissionController.js', { query(sql, params, callback) { calls.push({ sql, params }); callback(null, []); } });
  const list = response();
  await controller.getPermissions({}, list);
  assert.deepEqual(Array.from(list.body.roles), ['MANAGER', 'EMPLOYEE', 'SALES', 'SERVICE', 'SENIOR_MANAGER']);
  for (const role of ['SENIOR_MANAGER', 'MANAGER']) {
    calls.length = 0;
    const res = response();
    await controller.updatePermissions({ params: { role }, body: { permissions: [{ permission_key: 'DASHBOARD', can_view: true, can_create: false, can_update: false, can_delete: false }] } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.find(call => call.sql.startsWith('DELETE')).params[0], role);
    const insert = calls.find(call => call.sql.includes('INSERT INTO role_permissions'));
    assert.equal(insert.params[0], role);
    assert.equal(insert.params[2], true);
    assert.equal(insert.params[3], false);
    assert.equal(calls.at(-1).sql, 'COMMIT');
  }
  calls.length = 0;
  const invalid = response();
  await controller.updatePermissions({ params: { role: 'ADMIN' }, body: { permissions: [] } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);
});
