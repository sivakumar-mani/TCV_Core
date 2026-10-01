import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/internet/internet-customer-view/internet-customer-view.ts', import.meta.url), 'utf8');
const methods = source.slice(source.indexOf('  async previewSubscriptionEmail('), source.indexOf('  openSubscriptionInvoice('));
const pdf = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
let sends = 0, response;
const context = vm.createContext({ firstValueFrom: value => value,
  buildInternetSubscriptionInvoicePdf: async () => ({ blob: pdf, filename: 'invoice.pdf' }), FormData,
  URL: { createObjectURL: () => 'blob:preview', revokeObjectURL() {} }
});
vm.runInContext(ts.transpileModule(`class View { ${methods} } globalThis.View=View;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const view = new context.View(), alerts = [];
Object.assign(view, { id: 480, invoiceEmailVersion: 0, details: { customer: {} },
  api: { previewSubscriptionEmail: async () => ({ to: 'customer@example.com', period: '01-10-2026 to 31-10-2026' }),
    sendSubscriptionEmail: (customer, subscription, data) => {
      sends++; assert.equal(customer, 480); assert.equal(subscription, 12);
      assert.equal(data.get('preview_to'), 'customer@example.com');
      assert.equal(data.get('invoice').size, pdf.size);
      return { subscribe: callbacks => { response = callbacks; } };
    } },
  sanitizer: { bypassSecurityTrustResourceUrl: value => value },
  common: { handleError: error => alerts.push(error), handleTokenAndMessage: result => alerts.push(result) },
  subscriptionPackage: () => ({}), address: () => ''
});
await view.previewSubscriptionEmail({ internet_subscription_id: 12 });
assert.equal(sends, 0); assert.equal(view.invoiceEmailPreview, 'blob:preview'); assert.equal(view.invoiceEmailLoading, false);
view.sendInvoiceEmail(); view.sendInvoiceEmail(); assert.equal(sends, 1);
view.closeInvoiceEmail(); assert.ok(view.invoiceEmailSubscription);
response.error({ error: { message: 'SMTP failed' } }); assert.equal(view.invoiceEmailSending, false); assert.ok(view.invoiceEmailPreview);
view.sendInvoiceEmail(); response.next({ message: 'Sent successfully' });
assert.equal(view.invoiceEmailSubscription, null); assert.equal(alerts.length, 2);
await view.previewSubscriptionEmail({ internet_subscription_id: 12 }); view.closeInvoiceEmail(); assert.equal(sends, 2);
console.log('Preview never sends, explicit send, duplicate click guard, errors, alerts and cancellation passed.');
