import '@angular/compiler';
import { FormBuilder, FormArray, Validators } from '@angular/forms';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Run the actual component methods with real reactive forms, without a browser or API.
const source=fs.readFileSync(new URL('../src/app/internet/internet-customer-form/internet-customer-form.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source.slice(source.indexOf('export class InternetCustomerForm')).replace('export class','class'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const context=vm.createContext({FormArray,Validators});
vm.runInContext(js+';this.CustomerForm=InternetCustomerForm;',context);
function form(id=0){
  const errors=[];
  const f=new context.CustomerForm(new FormBuilder(),{}, {snapshot:{paramMap:{get:()=>id}}},{},{handleError:e=>errors.push(e)});
  f.lookups={is_admin:true,employees:[{employee_id:9}],routers:[{product_id:20,employee_id:9,router_type:'NEW',selling_price:1000},{product_id:21,employee_id:9,router_type:'SERVICED',selling_price:500},{product_id:22,employee_id:10,router_type:'NEW',selling_price:1100}],packages:[{package_id:10,provider_category:'KRISHI',price:500,gst_percent:12,total_price:560}],products:[{product_id:30,product_name:'Cable',selling_price:50,unit:'M'}]};
  f.form.patchValue({installed_by_employee_id:9,email:'test@example.com'},{emitEvent:false});
  f.form.get('subscription').patchValue({start_date:'2026-09-16',end_date:'2026-10-15',collect_date:'2026-09-20',collected_by_employee_id:9,payment_mapped_employee_id:9,payment_reference:'receipt'},{emitEvent:false});
  f.packages.at(0).patchValue({package_id:10});f.selectPackage(0);
  return f;
}
test('new package uses fixed GST and split taxes, while existing edit keeps master tax behavior',()=>{
  const f=form(),p=f.packages.at(0);assert.equal(p.get('base_price').value,500);assert.equal(p.get('gst_percent').value,18);assert.equal(p.get('gst_amount').value,90);assert.equal(p.get('sgst_amount').value,45);assert.equal(p.get('cgst_amount').value,45);assert.equal(p.get('package_price').value,590);
  const old=form(1);assert.equal(old.packages.at(0).get('package_price').value,560);
});
test('subscription free periods, manual dates and collection date survive unrelated recalculation',()=>{
  const f=form(),s=f.form.get('subscription');s.patchValue({free_period_value:1});f.calculateSubscription();assert.equal(s.get('end_date').value,'2026-11-15');assert.equal(s.get('subscription_amount').value,590);
  s.patchValue({end_date:'2026-11-20',collect_date:'2026-09-21'});f.form.get('connection.labour_service_charge').setValue(50);f.total();assert.equal(s.get('end_date').value,'2026-11-20');assert.equal(s.get('collect_date').value,'2026-09-21');assert.equal(f.form.get('account.grand_total').value,640);
});
test('staff router dropdown uses logged-in stock even if installer field differs',()=>{
  const f=form();f.lookups.is_admin=false;f.lookups.logged_in_employee_id=9;
  f.form.patchValue({installed_by_employee_id:10},{emitEvent:false});
  assert.deepEqual(Array.from(f.filteredRouters(0),x=>x.product_id),[20]);
  f.lookups.logged_in_employee_id=null;
  assert.equal(f.filteredRouters(0).length,0);
});

test('router type/employee filters, editable discount and free-use reset',()=>{
  const f=form(),r=f.routers.at(0);assert.deepEqual(Array.from(f.filteredRouters(0),x=>x.product_id),[20]);r.patchValue({product_id:20});f.selectRouter(0);r.patchValue({discount:100});f.calcRouter(0);assert.equal(r.get('amount').value,900);
  r.patchValue({usage_category:'FREE_USE'});f.changeRouterCategory(0);assert.equal(r.get('rate').value,0);assert.equal(r.get('discount').value,0);assert.equal(r.get('amount').value,0);
  r.patchValue({usage_category:'CUSTOMER_PAID'});f.changeRouterCategory(0);assert.equal(r.get('rate').value,1000);
  r.patchValue({router_type:'SERVICED'});f.changeRouterType(0);assert.equal(r.get('product_id').value,null);assert.deepEqual(Array.from(f.filteredRouters(0),x=>x.product_id),[21]);
});
test('materials, labor, discounts and subscription payment feed account once',()=>{
  const f=form(),r=f.materials.at(0),s=f.form.get('subscription'),a=f.form.get('account');r.patchValue({product_id:30,qty:2});f.selectMaterial(0);r.patchValue({discount:10});f.calcMaterial(0);f.form.get('connection').patchValue({connection_charge:200,connection_discount:20,labour_service_charge:50});a.patchValue({overall_discount:20});s.patchValue({paid_amount:100});f.total();
  assert.equal(r.get('amount').value,90);assert.equal(a.get('material_cost').value,100);assert.equal(a.get('material_discount').value,10);assert.equal(a.get('grand_total').value,890);assert.equal(a.get('customer_paid_amount').value,100);assert.equal(a.get('balance_amount').value,790);f.total();assert.equal(a.get('customer_paid_amount').value,100);
  a.patchValue({customer_paid_amount:200});f.total();s.patchValue({paid_amount:150});f.total();assert.equal(a.get('customer_paid_amount').value,250);assert.equal(a.get('account_status').value,'PENDING');
});
test('days and years match renewal calculations without billing free periods',()=>{
  const f=form(),s=f.form.get('subscription');s.patchValue({start_date:'2026-10-01',period_unit:'DAYS',period_value:15,free_period_value:2,free_period_unit:'DAYS'});f.calculateSubscription();assert.equal(s.get('subscription_amount').value,285);assert.equal(s.get('end_date').value,'2026-10-17');
  f.form.patchValue({network_type:'RAILWIRE'},{emitEvent:false});s.patchValue({start_date:'2026-09-16',period_unit:'YEAR',period_value:1,free_period_value:0});f.calculateSubscription();assert.equal(s.get('subscription_amount').value,7080);assert.equal(s.get('end_date').value,'2027-09-10');
});
test('email and all requested subscription input fields are required on enrollment only',()=>{
  const f=form();for(const name of ['email','subscription.start_date','subscription.end_date','subscription.collect_date','subscription.payment_reference','subscription.payment_mapped_employee_id']){const c=f.form.get(name),v=c.value;c.setValue('');assert.equal(c.valid,false,name);c.setValue(v);}
  const old=form(1);old.form.get('email').setValue('');assert.equal(old.form.get('email').valid,true);
});

 test('issued router selection carries its source and clears it when type changes',()=>{
 const f=form();f.lookups.routers.push({product_id:25,stock_key:'issue:77',material_movement_id:77,employee_id:9,router_type:'NEW',selling_price:2000});
 const r=f.routers.at(0);r.patchValue({router_stock_key:'issue:77'});f.selectRouter(0);
 assert.equal(r.get('product_id').value,25);assert.equal(r.get('material_movement_id').value,77);
 f.changeRouterType(0);assert.equal(r.get('material_movement_id').value,null);
 });
