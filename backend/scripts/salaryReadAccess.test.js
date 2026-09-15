const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function run(method, locals, params = {}, found = true) {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({sql, values});
    return [found ? [{salary_id: 1, employee_id: 7}] : []];
  }};
  const ctx = { module: { exports: {} }, require: name => {
    assert.equal(name, '../connection'); return {promise: () => db};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/employeeSalaryController.js'), 'utf8'), ctx);
  const res = {locals, code: 200, status(code) {this.code=code; return this;}, json(body) {this.body=body; return this;}};
  await ctx.module.exports[method]({params, query: {employee_id: 999, role: 'ADMIN'}}, res);
  return {calls, res};
}
for (const method of ['getSalaries', 'getSalaryById', 'getSalaryByEmployee']) {
  test(method + ' scopes non-admin reads to persisted user assignment', async () => {
    const {calls} = await run(method, {role:'TECHNICIAN',userId:12,employee_id:999}, {salary_id:1,employee_id:999});
    assert.match(calls[0].sql, /employee_id = \(SELECT employee_id FROM users WHERE user_id = \? LIMIT 1\)/);
    assert.equal(calls[0].values.at(-1),12);
  });
  test(method + ' retains admin access', async () => {
    const {calls,res} = await run(method, {role:'ADMIN'}, {salary_id:1,employee_id:7});
    assert.doesNotMatch(calls[0].sql, /SELECT employee_id FROM users/);
    assert.equal(res.code,200);
  });
  test(method + ' missing identity never becomes unrestricted', async () => {
    const {calls} = await run(method, {}, {salary_id:1,employee_id:7}, false);
    assert.match(calls[0].sql, /SELECT employee_id FROM users/);
    assert.equal(calls[0].values.at(-1),null);
  });
}
test('inaccessible salary does not expose components', async () => {
  const {calls,res} = await run('getSalaryById', {role:'TECHNICIAN',userId:12}, {salary_id:99}, false);
  assert.equal(res.code,404);
  assert.equal(calls.length,1);
});
