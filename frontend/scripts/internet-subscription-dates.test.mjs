import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/internet/internet-customer-view/internet-customer-view.ts', import.meta.url), 'utf8');
const method = source.slice(source.indexOf('  calculateSubscription('), source.indexOf('  periodValueOptions('));
const ctx = vm.createContext({});
vm.runInContext(ts.transpileModule('class Form {' + method + '} globalThis.Form = Form;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, ctx);
for (const admin of [true, false]) {
 const f = new ctx.Form();
 Object.assign(f, {activeTab:'subscription',lookups:{is_admin:admin},details:{customer:{network_type:'RAILWIRE'},packages:[{is_active:1,internet_customer_package_id:1,package_price:600}],subscriptions:[{end_date:'2026-09-30'}]},historyForm:{period_value:1,period_unit:'MONTH',free_period_value:0,paid_amount:0}});
 f.calculateSubscription();
 assert.equal(f.historyForm.start_date,'2026-10-01');assert.equal(f.historyForm.end_date,'2026-10-30');
 Object.assign(f.historyForm,{start_date:'2026-10-05',manual_start_date:true});f.calculateSubscription();assert.equal(f.historyForm.end_date,'2026-11-03');
 Object.assign(f.historyForm,{end_date:'2026-11-08',manual_end_date:true,paid_amount:100});f.calculateSubscription(true);
 assert.equal(f.historyForm.start_date,'2026-10-05');assert.equal(f.historyForm.end_date,'2026-11-08');assert.equal(f.historyForm.balance_amount,500);
 f.editingSubscriptionId=12;f.historyForm.amount=750;f.calculateSubscription(true);assert.equal(f.historyForm.amount,750);assert.equal(f.historyForm.balance_amount,650);
}
const backend=fs.readFileSync(new URL('../../backend/controller/internetCustomerController.js', import.meta.url),'utf8');
const dates=backend.slice(backend.indexOf("      for(const field of ['start_date','end_date'])"),backend.indexOf('      const paymentStatus='));
function save(p){const c=vm.createContext({p,prior:{start_date:'2026-10-01'},start:undefined,customer:{network_type:'RAILWIRE'},basis:'MONTH',value:1,freeUnit:'MONTH',freeValue:0,pkg:{package_price:600},money:Number,dateOnly:d=>d.toISOString().slice(0,10)});vm.runInContext(dates+';this.result={startValue,endValue,amount};',c);return c.result;}
assert.equal(save({}).startValue,'2026-10-01');
assert.equal(save({start_date:'2026-10-05',end_date:'2026-11-08'}).endValue,'2026-11-08');
assert.equal(save({start_date:'2026-10-05',end_date:'2026-11-08'}).amount,600);
for(const p of [{start_date:'2026-02-30'},{end_date:'bad'},{start_date:'2026-10-05',end_date:'2026-10-04'}])assert.throws(()=>save(p),{status:400});
console.log('Subscription custom dates, automatic defaults, payment edits and invalid date checks passed.');
