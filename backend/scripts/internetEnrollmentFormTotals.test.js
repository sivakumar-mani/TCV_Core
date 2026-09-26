const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/src/app/internet/internet-customer-form/internet-customer-form.ts'),'utf8');
const method=source.slice(source.indexOf('  total(){'),source.indexOf('  date(v:any)'));
const total=vm.runInNewContext(require('node:module').stripTypeScriptTypes('({' + method + '}).total'));
const group=value=>({value,get(k){return {value:this.value[k]};},patchValue(p){Object.assign(this.value,p);}});
test('form excludes online paid charge, preserves other receipts, and restores cash totals without drift',()=>{
 const subscription=group({start_date:'2026-09-16',end_date:'2026-10-15',period_unit:'MONTH',period_value:1,paid_amount:590,renewed_by_value:'ADMIN',payment_mode:'CASH'});
 const account=group({customer_paid_amount:690,overall_discount:0});
 const groups={subscription,account,connection:group({connection_charge:1000})};
 const instance={id:0,previousSubscriptionPaid:590,round:v=>Math.round(v*100)/100,form:{get:k=>groups[k]},packages:{controls:[group({package_price:590})]},routers:{controls:[]},materials:{controls:[]}};
 total.call(instance);assert.equal(account.value.grand_total,1590);assert.equal(account.value.balance_amount,900);
 subscription.patchValue({renewed_by_value:'CUSTOMER',payment_mode:'DASHBOARD'});
 total.call(instance);assert.equal(account.value.grand_total,1000);assert.equal(account.value.subscription_amount,0);assert.equal(account.value.customer_paid_amount,100);assert.equal(account.value.balance_amount,900);assert.equal(subscription.value.paid_amount,590);
 total.call(instance);assert.equal(account.value.customer_paid_amount,100);
 subscription.patchValue({renewed_by_value:'ADMIN',payment_mode:'CASH'});
 total.call(instance);assert.equal(account.value.grand_total,1590);assert.equal(account.value.customer_paid_amount,690);assert.equal(account.value.balance_amount,900);
});
