const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../frontend/node_modules/typescript');
const controller = fs.readFileSync(path.join(__dirname, '../controller/cableTvController.js'), 'utf8');
const frontend = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/cable-tv/cable-tv-customer-history/cable-tv-customer-history.ts'), 'utf8');
const packages = [300,4,25,15].map(package_price => ({package_price, is_active:1, approval_status:'APPROVED'}));

test('form totals active approved packages; excludes inactive and pending', () => {
 const method = frontend.slice(frontend.indexOf('  activeSubscriptionPackageAmount()'), frontend.indexOf('  applySubscriptionPackage()'));
 const ctx = {}; vm.createContext(ctx);
 vm.runInContext(ts.transpile('class Form { details:any; '+method+' }\nthis.Form=Form;', {target:ts.ScriptTarget.ES2022}), ctx);
 const form = new ctx.Form();
 form.details = {customerPackages:[...packages,{package_price:500,is_active:0,approval_status:'APPROVED'},{package_price:600,is_active:1,approval_status:'PENDING'}]};
 assert.equal(form.activeSubscriptionPackageAmount(),344);
 form.details={customerPackages:[packages[0]]};assert.equal(form.activeSubscriptionPackageAmount(),300);
 form.details={customerPackages:[]};assert.equal(form.activeSubscriptionPackageAmount(),0);
});

async function add(total, body={}) {
 let inserted; const calls=[];
 const db={beginTransaction:async()=>{},commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),query:async(sql,values)=>{
  calls.push(sql);
  if(sql.includes('SELECT subscription_id')) return [[]];
  if(sql.includes('SELECT cp.package_price')) return [[{package_price:4}]];
  if(sql.includes('SUM(package_price)')) {assert.match(sql,/is_active = 1 AND approval_status = 'APPROVED'/);assert.equal(values[0],1);return [[{amount:total}]];}
  if(sql.includes('INSERT INTO cable_subscriptions')) inserted=Object.fromEntries(sql.match(/\(([^)]+)\)/)[1].split(',').map((k,i)=>[k.trim(),values[i]]));
  return [[]];
 }};
 const ctx={connection:{promise:()=>db},ensureCableTvExtendedTables:async()=>{},currentUserId:()=>1,money:v=>Number(v)||0,daysInMonth:()=>31,inclusiveDays:()=>31,subscriptionBillingDays:()=>20,resolveEmployeeId:async()=>1,isAdmin:()=>false,existingColumns:async()=>new Set(['received_count']),dateOnly:v=>new Date(v).toISOString().slice(0,10),nullable:v=>v||null};
 vm.createContext(ctx);vm.runInContext(controller.slice(controller.indexOf('const addCustomerSubscription ='),controller.indexOf('const updateCustomerSubscription ='))+';this.add=addCustomerSubscription;',ctx);
 const res={status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
 await ctx.add({params:{id:1},body:{customer_package_id:1,subscription_month:10,subscription_year:2026,start_date:'2026-10-01',expiry_date:'2026-10-31',billing_basis:'MONTH',number_of_days_or_months:1,received_count:1,amount:4,package_amount:4,paid_amount:0,...body}},res);
 return {inserted,res,calls};
}
test('new monthly subscription saves full package total rather than supplied single-channel amount',async()=>{
 const {inserted,res}=await add(344);assert.equal(res.code,201);assert.equal(inserted.amount,344);assert.equal(inserted.balance_amount,344);
});
test('single-package and multiple-period subscriptions still calculate correctly',async()=>{
 assert.equal((await add(300)).inserted.amount,300);
 assert.equal((await add(344,{received_count:2,number_of_days_or_months:2})).inserted.amount,688);
});
test('payment validation still rejects overpayment',async()=>{
 const {res,inserted,calls}=await add(344,{paid_amount:345});assert.equal(res.code,400);assert.equal(inserted,undefined);assert.ok(calls.includes('rollback'));
});
