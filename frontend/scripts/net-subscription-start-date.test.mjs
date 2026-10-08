import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/app/administration/net-subscription-pending/net-subscription-pending.ts', import.meta.url), 'utf8');
const context = vm.createContext({
  inject: () => ({ snapshot: { data: {} } }),
  ActivatedRoute: {},
  globalConstants: { errorRegex: 'error' },
});
vm.runInContext(ts.transpileModule(source.slice(source.indexOf('export class NetSubscriptionPending')).replace('export class', 'class'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText + ';globalThis.Form = NetSubscriptionPending;', context);

function create(admin, network = 'RAILWIRE') {
  const calls = [], messages = [];
  const service = { receiveSubscriptionPayment: (id, payload) => { calls.push({ id, payload }); return { subscribe() {} }; } };
  const form = new context.Form(service, { start() {} }, { openSnackbar: message => messages.push(message) }, { isAdmin: () => admin, employeeId: () => 7 });
  const customer = { network_type: network, package_price: 600 };
  const subscription = { internet_subscription_id: 5, subscription_month: 10, subscription_year: 2026, start_date: '2026-10-01', end_date: '2026-10-30', amount: 600, paid_amount: 0, balance_amount: 600 };
  form.open(customer, subscription);
  return { form, calls, messages, customer, subscription };
}

for (const admin of [true, false]) {
  for (const network of ['RAILWIRE', 'KRISHI']) {
    const { form, calls, customer, subscription } = create(admin, network);
    form.calculate();
    assert.equal(form.form.start_date, network === 'KRISHI' ? '2026-10-16' : '2026-10-01');
    assert.equal(form.form.end_date, network === 'KRISHI' ? '2026-11-15' : '2026-10-30');
    form.form.start_date = '2026-10-05';
    form.startDateChanged();
    assert.equal(form.form.end_date, network === 'KRISHI' ? '2026-11-04' : '2026-11-03');
    form.form.free_period_value = 2;
    form.form.free_period_unit = 'DAYS';
    form.calculate();
    assert.equal(form.form.start_date, '2026-10-05');
    assert.equal(form.form.end_date, network === 'KRISHI' ? '2026-11-06' : '2026-11-05');
    assert.equal(form.form.amount, 600);
    form.form.paid_amount = 100;
    form.save();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].payload.start_date, '2026-10-05');
    assert.equal(calls[0].payload.received_amount, 100);
    assert.equal(calls[0].payload.balance_amount, 500);
    form.open(customer, subscription);
    form.calculate();
    assert.equal(form.form.start_date, network === 'KRISHI' ? '2026-10-16' : '2026-10-01');
  }
}
const invalid = create(false);
invalid.form.form.start_date = '';
invalid.form.startDateChanged();
invalid.form.form.paid_amount = 100;
invalid.form.save();
assert.equal(invalid.calls.length, 0);
assert.equal(invalid.messages[0], 'Select a valid Start Date');

const assignment = create(false);
assignment.form.assignCollector = true;
assignment.form.form.start_date = '2026-10-05';
assignment.form.startDateChanged();
assert.equal(assignment.form.form.end_date, '2026-11-04');

console.log('Passed: admin/staff selectable dates, both network defaults, free days, save payload, payment balance, reset, invalid date and collector assignment.');
