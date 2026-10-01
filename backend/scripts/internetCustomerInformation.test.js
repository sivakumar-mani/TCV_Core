const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../controller/internetCustomerController.js'), 'utf8');
const handler = source.slice(source.indexOf('const updateInternetCustomerInformation ='), source.indexOf('const addInternetCustomerHistory ='));
const valid = { network_type: 'KRISHI', full_name: 'Test Customer', net_id: 'test', network_password: 'test', mobile_no: '9876543210', source_name: 'Direct', installed_by_employee_id: 1 };
async function run(body = {}, admin = true, approval = 'APPROVED') {
  const writes = [];
  const db = { query: async (sql, params) => {
    if (sql.startsWith('SELECT approval_status')) return [[{ approval_status: approval }]];
    if (sql.startsWith('SELECT internet_customer_id')) return [[]];
    if (sql.startsWith('SELECT employee_id')) return [[{ employee_id: 1 }]];
    writes.push({ sql, params }); return [{ affectedRows: 1 }];
  } };
  const ctx = vm.createContext({ connection: { promise: () => db }, ensureInternetSchema: async () => {}, isAdmin: () => admin, intOrNull: v => Number(v) || null, textOrNull: v => v || null });
  vm.runInContext(handler + ';this.update = updateInternetCustomerInformation;', ctx);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await ctx.update({ params: { id: '799' }, body: { ...valid, ...body } }, res);
  return { res, writes };
}
test('invalid fields identify the correction and do not write', async () => {
  for (const [field, value, message] of [
    ['network_password', '', 'Password is required'], ['mobile_no', '123', 'Mobile No must contain exactly 10 digits'],
    ['alternate_mobile_no', '123', 'Alternate Mobile must contain exactly 10 digits'], ['aadhaar_no', '123', 'Aadhaar No must contain exactly 12 digits'],
    ['source_name', '', 'Select a valid Source'], ['installed_by_employee_id', null, 'Select an Installed By employee'],
    ['full_name', '', 'Full Name is required'], ['net_id', '', 'Net ID is required'], ['network_type', '', 'Select a valid Network'],
  ]) {
    const { res, writes } = await run({ [field]: value });
    assert.equal(res.code, 400); assert.equal(res.body.message, message); assert.equal(writes.length, 0);
  }
});
test('valid information with optional fields empty still saves', async () => {
  const { res, writes } = await run();
  assert.equal(res.code, 200); assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /^UPDATE internet_customers SET/);
});
test('administrator and approval requirements are preserved', async () => {
  for (const [admin, approval, status] of [[false, 'APPROVED', 403], [true, 'PENDING', 409]]) {
    const { res, writes } = await run({}, admin, approval);
    assert.equal(res.code, status); assert.equal(writes.length, 0);
  }
});

test('customer email is trimmed and saved only for the requested customer', async () => {
  const { res, writes } = await run({ email: ' customer@example.com ' });
  assert.equal(res.code, 200);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /email=\?,updated_at=NOW\(\) WHERE internet_customer_id=\?/);
  assert.deepEqual(Array.from(writes[0].params).slice(-2), ['customer@example.com', 799]);
});

test('omitted email is preserved and explicitly blank email can be cleared', async () => {
  const unchanged = await run();
  assert.doesNotMatch(unchanged.writes[0].sql, /email=/);
  for (const email of ['', '   ', null]) {
    const result = await run({ email });
    assert.equal(result.res.code, 200);
    assert.equal(result.writes[0].params.at(-2), null);
  }
});

test('invalid email is rejected without changing customer information', async () => {
  for (const email of ['bad', 'a@example.com,b@example.com', 'a\nb@example.com', 'x'.repeat(250) + '@example.com', {}, 123]) {
    const { res, writes } = await run({ email });
    assert.equal(res.code, 400);
    assert.match(res.body.message, /valid Email/);
    assert.equal(writes.length, 0);
  }
});
