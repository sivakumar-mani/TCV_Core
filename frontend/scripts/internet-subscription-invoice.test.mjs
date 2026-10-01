import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/shared/internet-subscription-invoice-pdf.ts', import.meta.url), 'utf8');
let blob;
const context = vm.createContext({ exports: {}, TextEncoder, Blob, URL: { createObjectURL: value => { blob = value; return 'blob:test'; } },
  document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
  window: { setTimeout() {} }, fetch: async () => ({ ok: false })
});
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { internetSubscriptionInvoiceNumber: number, openInternetSubscriptionInvoicePdf: download } = context.exports;
for (const network_type of ['KRISHI', 'RAILWIRE']) {
  for (const kind of ['PROVIDER', 'TCV']) {
    const customer = { network_type };
    const subscription = { subscription_year: 2026, internet_subscription_id: 12 };
    assert.equal(number(kind, customer, subscription), `${kind === 'TCV' ? 'TCV-NET' : network_type}-2026-12`);
    subscription.invoice_no = 'CUSTOM/2026-12';
    await download({ kind, customer, subscription, package: {}, address: '' });
    assert.ok((await blob.text()).includes('(CUSTOM/2026-12)'));
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
