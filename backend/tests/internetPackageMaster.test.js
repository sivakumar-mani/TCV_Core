const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function run(body, id, options = {}) {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (options.duplicate && sql.startsWith('INSERT')) throw { code: 'ER_DUP_ENTRY' };
    if (sql.startsWith('SELECT provider')) return [options.missing ? [] : [{ provider_category: 'KRISHI' }]];
    if (sql.startsWith('SELECT')) return [[{ package_id: 7, provider_category: 'KRISHI' }]];
    return [{ insertId: 7 }];
  } };
  const context = { require: () => ({ promise: () => db }), module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../controller/internetPackageController'), 'utf8'), context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.module.exports[options.list ? 'listPackages' : 'savePackage']({ body, params: id === undefined ? {} : { id } }, res);
  return { calls, res };
}
const valid = { package_name: 'Plan', package_code: 'P1', provider_category: 'KRISHI', price: 500, gst_percent: 18 };
test('list reads the dedicated Internet master', async () => {
  const { calls, res } = await run({}, undefined, { list: true });
  assert.equal(res.body.packages.length, 1);
  assert.match(calls[0].sql, /FROM internet_package_master/);
});
test('add calculates total server-side and only writes the master', async () => {
  const { calls, res } = await run({ ...valid, price_including_gst: 1 });
  assert.equal(res.code, 201);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /^INSERT INTO internet_package_master/);
  assert.equal(calls[0].values[5], 590);
});
test('edit preserves customer amounts, status and provider', async () => {
  const { calls, res } = await run(valid, '7');
  assert.equal(res.code, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /^UPDATE internet_package_master/);
  assert.doesNotMatch(calls[1].sql, /is_active|subscription|customer/);
  assert.equal(calls[1].values[7], 7);
  const changed = await run({ ...valid, provider_category: 'RAILWIRE' }, '7');
  assert.equal(changed.res.code, 400);
  assert.equal(changed.calls.length, 1);
});
test('invalid values are rejected before database writes', async () => {
  for (const patch of [{ price: -1 }, { price: 'abc' }, { gst_percent: 101 }, { package_name: ' ' }, { provider_category: 'OTHER' }]) {
    const { calls, res } = await run({ ...valid, ...patch });
    assert.equal(res.code, 400);
    assert.equal(calls.length, 0);
  }
});
test('missing IDs and duplicate codes return useful errors', async () => {
  assert.equal((await run(valid, '7', { missing: true })).res.code, 404);
  assert.equal((await run(valid, undefined, { duplicate: true })).res.code, 409);
});
test('all package endpoints use admin authorization before customer permissions', () => {
  const source = fs.readFileSync(require.resolve('../routes/internetCustomerRouter'), 'utf8');
  for (const method of ['get', 'post', 'put']) {
    assert.match(source, new RegExp(`router\\.${method}\\('/packages(?:/:id)?',auth\\.requireAdmin,internetPackages\\.`));
  }
});
