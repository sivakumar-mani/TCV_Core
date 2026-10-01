const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/internetCustomerController'), 'utf8');

async function edit(admin, extra = {}, paymentStatus = 'PENDING') {
  const queries = [];
  let committed = false;
  const db = { beginTransaction: async () => {}, rollback: async () => {}, commit: async () => { committed = true; },
    query: async (sql, params) => {
      queries.push({ sql, params });
      return sql.startsWith('SELECT') ? [[{ internet_subscription_id: 12, payment_status: paymentStatus, initial_account_id: 7 }]] : [{ affectedRows: 1 }];
    }
  };
  const context = vm.createContext({ connection: { promise: () => db }, ensureInternetSchema: async () => {},
    isAdmin: () => admin, resolveLoggedInEmployeeId: async () => 5, dateOnly: value => value,
    money: value => Math.round(Number(value) || 0), intOrNull: value => Number(value) || null,
    textOrNull: value => String(value || '').trim() || null, syncNetEnrollmentAccount: async () => {}
  });
  vm.runInContext(source.slice(source.indexOf('const subscriptionRenewal ='), source.indexOf('const userId =')) +
    source.slice(source.indexOf('const updateInternetSubscription ='), source.indexOf('const deleteInternetSubscription =')) + '\nthis.edit=updateInternetSubscription;', context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.edit({ params: { id: 889, subscriptionId: 12 }, body: {
    subscription_month: 10, subscription_year: 2026, start_date: '2026-10-01', end_date: '2026-10-31',
    amount: 600, paid_amount: 100, renewed_by_value: 'ADMIN', payment_mode: 'CASH', ...extra
  } }, res);
  return { queries, committed, res };
}

test('admin saves invoice number scoped to subscription and customer, retaining payment calculation', async () => {
  const result = await edit(true, { invoice_no: ' INV/2026-12 ' });
  assert.equal(result.res.code, 200, JSON.stringify(result.res.body));
  assert.equal(result.committed, true);
  const invoice = result.queries.find(q => q.sql.includes('SET invoice_no='));
  assert.deepEqual(Array.from(invoice.params), ['INV/2026-12', 12, 889]);
  const payment = result.queries.find(q => q.sql.includes('SET subscription_month='));
  assert.deepEqual(Array.from(payment.params).slice(16, 20), [600, 100, 500, 'PARTIAL']);
});
test('omitting invoice number leaves it unchanged for admin and employee', async () => {
  for (const admin of [true, false]) {
    const result = await edit(admin);
    assert.equal(result.res.code, 200);
    assert.equal(result.queries.some(q => q.sql.includes('SET invoice_no=')), false);
  }
});
test('employee cannot change invoice number; paid subscription restriction remains', async () => {
  assert.equal((await edit(false, { invoice_no: 'FORGED' })).res.code, 403);
  assert.equal((await edit(false, {}, 'PAID')).res.code, 409);
});
test('invalid invoice numbers rejected before subscription writes; blank restores generation', async () => {
  for (const invoice_no of ['x'.repeat(101), 'bad\nnumber', 123, {}]) {
    const result = await edit(true, { invoice_no });
    assert.equal(result.res.code, 400);
    assert.equal(result.queries.some(q => q.sql.startsWith('UPDATE')), false);
  }
  const result = await edit(true, { invoice_no: '' });
  assert.equal(result.res.code, 200);
  assert.equal(result.queries.find(q => q.sql.includes('SET invoice_no=')).params[0], null);
});
