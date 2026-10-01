const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvController'), 'utf8');
async function receive({ stock = 0, amount = 100, admin = true, failLedger = false, count = 1 } = {}) {
  const queries = [], approved = [];
  let committed = false, rolled = false, quantity = stock;
  const db = { beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => { rolled = true; },
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('FROM cable_customer_accounts')) return [[{ account_id: 1, approval_group_id: 2, cable_customer_id: 3, account_status: 'PENDING', grand_total: 100, office_received_amount: 0 }]];
      if (sql.includes('FROM cable_customer_stb_accessories')) return [Array.from({ length: count }, (_, i) => ({ stb_accessory_id: i + 10, customer_stb_id: 4, product_id: 5, accessory_name: 'Adaptor', qty: 1 }))];
      if (sql.includes('SELECT available_qty')) return [[{ available_qty: quantity }]];
      if (sql.includes('UPDATE stock_master')) quantity = params[0];
      if (sql.includes('INSERT INTO stock_ledger') && failLedger) throw new Error('Ledger unavailable');
      if (sql.includes('UPDATE cable_customer_stb_accessories')) approved.push(params[0]);
      return [{ affectedRows: 1 }];
    }
  };
  const ctx = vm.createContext({ connection: { promise: () => db }, isAdmin: () => admin,
    ensureCableTvExtendedTables: async () => {}, money: value => Number(value) || 0,
    intOrNull: value => Number(value) || null, textOrNull: value => value || null,
    currentUserId: () => 9, applyApprovedLocationChange: async () => {}, synchronizeLatestCustomerStbStatus: async () => {}
  });
  vm.runInContext(source.slice(source.indexOf('const postStockMovement ='), source.indexOf('const ensureUsedAccessoryProduct =')) +
    source.slice(source.indexOf('const receiveAccount ='), source.indexOf('const revertAccountToPending =')) + '\nthis.receive=receiveAccount;this.post=postStockMovement;', ctx);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await ctx.receive({ params: { accountId: 1 }, body: { cash_amount: amount, paid_date: '2026-10-01', received_date: '2026-10-01', due_date: '2026-10-31' } }, res);
  return { res, queries, approved, committed, rolled, quantity, ctx, db };
}
test('shortage saves Paid payment, leaves accessory pending and does not deduct stock', async () => {
  const r = await receive();
  assert.equal(r.res.code, 200); assert.equal(r.committed, true); assert.equal(r.rolled, false);
  assert.equal(r.res.body.payment_status, 'PAID'); assert.equal(r.res.body.balance_amount, 0);
  assert.match(r.res.body.message, /Accessories pending stock: Adaptor/);
  assert.equal(r.approved.length, 0);
  assert.equal(r.queries.some(q => q.sql.includes('INSERT INTO stock_ledger')), false);
  assert.ok(r.queries.some(q => q.sql.includes('INSERT INTO cable_customer_account_payments')));
});
test('available stock issues and approves only fulfilled accessories', async () => {
  const r = await receive({ stock: 1, count: 2 });
  assert.equal(r.committed, true); assert.equal(r.quantity, 0);
  assert.deepEqual(r.approved, [10]); assert.equal(r.res.body.pending_stock_accessories.length, 1);
  assert.equal(r.queries.filter(q => q.sql.includes('INSERT INTO stock_ledger')).length, 1);
});
test('fully stocked and partial payments retain existing behavior', async () => {
  const full = await receive({ stock: 2 });
  assert.equal(full.res.body.message, 'Payment received in full'); assert.deepEqual(full.approved, [10]);
  const partial = await receive({ amount: 50 });
  assert.equal(partial.res.body.payment_status, 'PARTIAL'); assert.equal(partial.committed, true);
  assert.equal(partial.queries.some(q => q.sql.includes('FROM cable_customer_stb_accessories')), false);
});
test('unrelated ledger errors still roll back and non-admin remains forbidden', async () => {
  const error = await receive({ stock: 1, failLedger: true });
  assert.equal(error.res.code, 500); assert.equal(error.rolled, true); assert.equal(error.committed, false);
  const denied = await receive({ admin: false }); assert.equal(denied.res.code, 403); assert.equal(denied.queries.length, 0);
});
test('stock helper still rejects shortages outside payment deferral', async () => {
  const r = await receive();
  await assert.rejects(r.ctx.post(r.db, { productId: 5, qtyOut: 1 }), { statusCode: 409 });
});
