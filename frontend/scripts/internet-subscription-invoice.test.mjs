import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/shared/internet-subscription-invoice-pdf.ts', import.meta.url), 'utf8');
let blob, downloadedName;
const context = vm.createContext({ exports: {}, TextEncoder, Blob, URL: { createObjectURL: value => { blob = value; return 'blob:test'; } },
  document: { createElement: () => ({ click() { downloadedName = this.download; }, remove() {} }), body: { appendChild() {} } },
  window: { setTimeout() {} }, fetch: async () => ({ ok: false })
});
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { internetSubscriptionInvoiceNumber: number, openInternetSubscriptionInvoicePdf: download } = context.exports;
for (const network_type of ['KRISHI', 'RAILWIRE', 'DMNET']) {
  for (const kind of ['PROVIDER', 'TCV']) {
    const customer = { network_type, full_name: 'magnum customer' };
    const subscription = { subscription_year: 2026, internet_subscription_id: 12,
      start_date: '2026-09-15', end_date: '2026-10-14', collect_date: '2026-10-03',
      created_at: '2026-10-02', amount: 1657, payment_status: 'PENDING', paid_amount: 0, balance_amount: 1657 };
    assert.equal(number(kind, customer, subscription), `${kind === 'TCV' ? 'TCV-NET' : network_type === 'KRISHI' ? 'KRISHI' : 'RAILWIRE'}-2026-12`);
    subscription.invoice_no = 'CUSTOM/2026-12';
    await download({ kind, customer, subscription, package: {}, address: '' });
    const pdf = await blob.text();
    assert.ok(pdf.includes('(CUSTOM/2026-12)'));
    assert.ok(pdf.includes('(15-09-2026)'));
    assert.ok(!pdf.includes('03-10-2026') && !pdf.includes('02-10-2026'));
    assert.ok(!/Payment Details|Status:|Paid:|Balance:/.test(pdf));
    assert.ok(pdf.includes('(***This is computer generated receipt no signature required ***)'));
    assert.equal(downloadedName, 'magnum_Invoice_Sep2026.pdf');
    const bankY = (kind === 'PROVIDER' ? network_type === 'KRISHI' ? 500 : 455 : 635) - 135;
    assert.ok(pdf.includes(`38 ${bankY + 16} m 557 ${bankY + 16} l`));
    assert.ok(pdf.includes(`${(38 + 557 - 27.734 * 8) / 2} ${bankY - 152} Td`));
    assert.ok(pdf.includes(`${(38 + 557 - 17.447 * 9) / 2} ${bankY - 170} Td`));
    assert.ok(pdf.includes('(Thank you for your prompt payment.)'));
    assert.ok(pdf.includes('(GRAND TOTAL)') && pdf.includes('(1657.00)'));
  }
}
const viewSource = fs.readFileSync(new URL('../src/app/internet/internet-customer-view/internet-customer-view.ts', import.meta.url), 'utf8');
context.internetSubscriptionInvoiceNumber = number;
vm.runInContext(ts.transpileModule('class View {' + viewSource.slice(viewSource.indexOf('  subscriptionEditPayload()'), viewSource.indexOf('  canEditSubscription(')) + '} globalThis.View=View;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const view = new context.View();
Object.assign(view, { lookups: { is_admin: true }, details: { customer: { network_type: 'RAILWIRE' }, subscriptions: [{ internet_subscription_id: 12, subscription_year: 2026 }] },
  canEditSubscription: () => true, inputDate: value => value, changeRenewedBy() {} });
view.editSubscription(view.details.subscriptions[0]);
assert.equal(view.historyForm.invoice_no, 'RAILWIRE-2026-12');
assert.equal(Object.hasOwn(view.subscriptionEditPayload(), 'invoice_no'), false);
view.historyForm.invoice_no = 'CUSTOM';
assert.equal(view.subscriptionEditPayload().invoice_no, 'CUSTOM');
view.lookups.is_admin = false;
assert.equal(Object.hasOwn(view.subscriptionEditPayload(), 'invoice_no'), false);
console.log('Generated numbers, edited PDF contents, edit form and admin-only payload checks passed.');
