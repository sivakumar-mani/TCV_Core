const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvController'), 'utf8');
async function edit(body = { package_name: 'Updated', price: 300 }, options = {}) {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT *')) return [options.missing ? [] : [{ package_type: 'MSO_PACKAGE', service_category: 'CATV', mso_price: 125 }]];
    if (sql.startsWith('SELECT package_id')) return [options.duplicate ? [{ package_id: 2 }] : []];
    return [{ affectedRows: 1 }];
  } };
  const context = { connection: { promise: () => db }, ensureCableTvExtendedTables: async () => {}, money: Number, nullable: v => v || null };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('const updatePackage ='), source.indexOf('const addStbMaster =')) + '\nthis.edit = updatePackage;', context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.edit({ params: { packageId: '7' }, body }, res);
  return { calls, res };
}
test('edit updates only the selected master and preserves classification and billing', async () => {
  const { calls, res } = await edit({ package_name: 'Updated', price: 300, service_category: 'INTERNET', package_type: 'ADDON' });
  assert.equal(res.code, 200);
  const writes = calls.filter(c => c.sql.startsWith('UPDATE'));
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /^UPDATE cable_package_master/);
  assert.doesNotMatch(writes[0].sql, /service_category|package_type|subscription|paid_amount|is_active/);
  assert.equal(writes[0].values[6], 7);
  assert.equal(writes[0].values[2], 0);
});
test('invalid price, missing package and duplicate names do not write', async () => {
  for (const [body, options, expected] of [
    [{ package_name: 'Plan', price: -1 }, {}, 400],
    [{ package_name: 'Plan', price: 'invalid' }, {}, 400],
    [{ package_name: 'Plan', price: 100 }, { missing: true }, 404],
    [{ package_name: 'Plan', price: 100 }, { duplicate: true }, 409]
  ]) {
    const { calls, res } = await edit(body, options);
    assert.equal(res.code, expected);
    assert.equal(calls.some(c => c.sql.startsWith('UPDATE')), false);
  }
});
test('edit endpoint retains package action permission checks', () => {
  const routes = fs.readFileSync(require.resolve('../routes/cableTvRouter'), 'utf8');
  assert.ok(routes.includes("router.patch('/masters/packages/:packageId', auth.requirePermission('CABLE_TV_PACKAGES'), updatePackage)"));
});

test('edit saves MSO price, ignores supplied share and preserves MSO price for older clients', async () => {
  for (const [patch, expected] of [[{ mso_price: 175.50, lco_share: 999 }, 175.50], [{}, 125]]) {
    const { calls, res } = await edit({ package_name: 'Plan', price: 300, ...patch });
    assert.equal(res.code, 200);
    const write = calls.find(c => c.sql.startsWith('UPDATE'));
    assert.equal(write.values[5], expected);
    assert.doesNotMatch(write.sql, /lco_share/);
  }
});

test('invalid MSO prices cannot update the master', async () => {
  for (const mso_price of [-1, 'invalid']) {
    const { calls, res } = await edit({ package_name: 'Plan', price: 300, mso_price });
    assert.equal(res.code, 400);
    assert.equal(calls.some(c => c.sql.startsWith('UPDATE')), false);
  }
});

test('add persists MSO price and leaves share calculation to the database', async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    return sql.startsWith('SELECT') ? [[]] : [{ insertId: 1 }];
  } };
  const context = { connection: { promise: () => db }, ensureCableTvExtendedTables: async () => {}, money: Number, nullable: v => v || null };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('const addPackage ='), source.indexOf('const updatePackage =')) + '\nthis.add = addPackage;', context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.add({ body: { package_name: 'Plan', price: 300, mso_price: 200, lco_share: 999 } }, res);
  assert.equal(res.code, 201);
  const write = calls.find(c => c.sql.startsWith('INSERT'));
  assert.equal(write.values[4], 300);
  assert.equal(write.values[8], 200);
  assert.equal(write.values[9], 1);
  assert.doesNotMatch(write.sql, /lco_share/);
});

test('status edit changes only the selected master and rejects invalid values', async () => {
  for (const is_active of [0, 1]) {
    const { calls, res } = await edit({ package_name: 'Plan', price: 300, is_active });
    assert.equal(res.code, 200);
    const write = calls.find(c => c.sql.startsWith('UPDATE'));
    assert.match(write.sql, /is_active = \? WHERE package_id = \?/);
    assert.equal(write.values[6], is_active);
    assert.equal(write.values[7], 7);
    assert.doesNotMatch(write.sql, /subscription|approval_status|customer_packages/);
  }
  for (const is_active of [null, '', 'invalid', 2]) {
    const result = await edit({ package_name: 'Plan', price: 300, is_active });
    assert.equal(result.res.code, 400);
    assert.equal(result.calls.length, 0);
  }
});

async function removePackage(id, options = {}) {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (options.linked) throw { code: 'ER_ROW_IS_REFERENCED_2' };
    return [{ affectedRows: options.missing ? 0 : 1 }];
  } };
  const context = { connection: { promise: () => db } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('const deletePackage ='), source.indexOf('const addStbMaster =')) + '\nthis.remove = deletePackage;', context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.remove({ params: { packageId: id } }, res);
  return { calls, res };
}

test('delete targets one unused package and handles missing or linked records safely', async () => {
  const result = await removePackage('7');
  assert.equal(result.res.code, 200);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].sql, 'DELETE FROM cable_package_master WHERE package_id = ?');
  assert.equal(result.calls[0].values[0], 7);
  assert.equal((await removePackage('7', { missing: true })).res.code, 404);
  const linked = await removePackage('7', { linked: true });
  assert.equal(linked.res.code, 409);
  assert.match(linked.res.body.message, /Inactive/);
  assert.equal(linked.calls.length, 1);
  for (const id of ['0', '-1', 'abc']) {
    const invalid = await removePackage(id);
    assert.equal(invalid.res.code, 400);
    assert.equal(invalid.calls.length, 0);
  }
});

test('delete endpoint uses existing package delete authorization', () => {
  const routes = fs.readFileSync(require.resolve('../routes/cableTvRouter'), 'utf8');
  assert.ok(routes.includes("router.delete('/masters/packages/:packageId', auth.requirePermission('CABLE_TV_PACKAGES'), deletePackage)"));
  const auth = fs.readFileSync(require.resolve('../services/authendication'), 'utf8');
  assert.match(auth, /DELETE: 'can_delete'/);
});
