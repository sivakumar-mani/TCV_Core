import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/internet/internet-customer-view/internet-customer-view.ts', import.meta.url), 'utf8');
const methods = source.slice(source.indexOf('  canUpdate() {'), source.indexOf('  searchCustomerByNumber() {'));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule('class View {' + methods + '} globalThis.View=View;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context);
const view = new context.View();
view.isLegacyCustomer = () => false;
for (const status of ['PENDING', 'PARTIAL', 'PAID', undefined]) {
 view.details = {customer:{approval_status:'APPROVED'},account:{account_status:status}};
 view.activeTab = 'connection';
 assert.equal(view.canAddHistory(), true);
 assert.equal(view.canUpdate(), status === 'PAID');
 for (const tab of ['router','package','subscription']) {
  view.activeTab = tab;
  assert.equal(view.canAddHistory(), status === 'PAID');
 }
}
view.activeTab = 'connection';
view.details.customer.approval_status = 'PENDING';
assert.equal(view.canAddHistory(), false);
view.isLegacyCustomer = () => true;
assert.equal(view.canAddHistory(), false);
view.details.customer.approval_status = 'APPROVED';
assert.equal(view.canAddHistory(), true);
console.log('Connection Add eligibility and existing customer edit/other section guards passed.');
