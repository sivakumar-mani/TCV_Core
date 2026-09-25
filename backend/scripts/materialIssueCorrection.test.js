const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup({ role = 'ADMIN', method = 'PATCH', stock = 10, payments = [], adjustments = [], status = 'ISSUED', allocated = 0 } = {}) {
  const calls = [];
  const db = {
    beginTransaction: async () => calls.push(['begin']), commit: async () => calls.push(['commit']), rollback: async () => calls.push(['rollback']),
    query: async (sql, values) => {
      calls.push([sql, values]);
      if (sql.startsWith('SELECT * FROM technician_material_movements')) return [[{ material_movement_id: 1, movement_no: 'MAT-000001', movement_type: 'SALE', sale_status: status, product_id: 2, qty: 4, unit_price: 10, paid_amount: 0 }]];
      if(sql.includes('AS qty FROM technician_material_movements')) return [[{qty:allocated}]];
      if (sql.includes('SELECT material_sale_payment_id')) return [payments];
      if (sql.includes('SELECT material_sale_adjustment_id')) return [adjustments];
      if (sql.includes('SELECT employee_id')) return [[{ employee_id: 3 }]];
      if (sql.includes('SELECT product_id')) return [[{ product_id: 2 }]];
      if (sql.includes('SELECT available_qty')) return [[{ available_qty: stock }]];
      return [{ affectedRows: 1 }];
    }
  };
  const sandbox = { require: name => { if(name==='./internetRouterStock') return require('../controller/internetRouterStock'); assert.equal(name, '../connection'); return { promise: () => db }; }, module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/materialSalesController.js'), 'utf8'), sandbox);
  const res = { locals: { role, employee_id: 3, userId: 1 }, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { method, res, params: { movementId: 1 }, body: { employee_id: 3, product_id: 2, qty: 6, unit_price: 10, commission_amount: 2, movement_date: '2026-09-11' } };
  return { calls, res, req, run: () => sandbox.module.exports.correctIssuedMaterial(req, res) };
}
test('non-admin cannot edit or delete, with no database access', async () => {
  for (const method of ['PATCH', 'DELETE']) { const x = setup({ role: 'TECHNICIAN', method }); await x.run(); assert.equal(x.res.statusCode, 403); assert.equal(x.calls.length, 0); }
});
test('editing adjusts stock by difference and recalculates amount', async () => {
  const x = setup(); await x.run(); assert.equal(x.res.statusCode, 200);
  assert.equal(x.calls.find(c => c[0].startsWith('UPDATE stock_master'))[1][0], 8);
  const update = x.calls.find(c => c[0].startsWith('UPDATE technician_material_movements'));
  assert.equal(update[1][5], 48); assert.equal(update[1][6], 48); assert.ok(x.calls.some(c => c[0] === 'commit'));
});
test('deleting restores original quantity and records reversal', async () => {
  const x = setup({ method: 'DELETE' }); await x.run(); assert.equal(x.res.statusCode, 200);
  assert.equal(x.calls.find(c => c[0].startsWith('UPDATE stock_master'))[1][0], 14);
  assert.ok(x.calls.some(c => c[0].startsWith('INSERT INTO stock_ledger')));
  assert.ok(x.calls.some(c => c[0].startsWith('DELETE FROM technician_material_movements')));
});
test('dependent records, sold entries and insufficient stock roll back', async () => {
  for (const options of [{ allocated: 1 }, { payments: [{}] }, { adjustments: [{}] }, { status: 'SOLD' }, { stock: 1 }]) {
    const x = setup(options); await x.run(); assert.equal(x.res.statusCode, 409); assert.ok(x.calls.some(c => c[0] === 'rollback')); assert.ok(!x.calls.some(c => c[0] === 'commit'));
  }
});
test('product correction restores original product and deducts replacement', async () => {
  const x = setup(); x.req.body.product_id = 5; await x.run(); assert.equal(x.res.statusCode, 200);
  const updates = x.calls.filter(c => c[0].startsWith('UPDATE stock_master'));
  assert.deepEqual(Array.from(updates[0][1]), [14, 2]); assert.deepEqual(Array.from(updates[1][1]), [4, 5]);
});
test('invalid quantity and date are rejected before transaction', async () => {
  for (const body of [{ qty: 'bad' }, { movement_date: '2026-02-30' }]) { const x = setup(); Object.assign(x.req.body, body); await x.run(); assert.equal(x.res.statusCode, 400); assert.equal(x.calls.length, 0); }
});
