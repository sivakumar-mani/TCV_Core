const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvController'), 'utf8');
async function edit(body = { package_name: 'Updated', price: 300 }, options = {}) {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT *')) return [options.missing ? [] : [{ package_type: 'MSO_PACKAGE', service_category: 'CATV' }]];
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
  assert.equal(writes[0].values[5], 7);
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
