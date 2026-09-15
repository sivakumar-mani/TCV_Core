const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../controller/internetCustomerController.js'), 'utf8');
const helpers = source.slice(source.indexOf('const subscriptionRenewal ='), source.indexOf('const userId ='));
function context(extra = {}) { const ctx = vm.createContext(extra); vm.runInContext(helpers + ';this.renewal=subscriptionRenewal;this.selection=correctionSelection;', ctx); return ctx; }
test('admin renewal combinations and invalid modes', () => {
 const ctx=context();
 for(const [renewed_by_value,payment_mode] of [['CUSTOMER','DASHBOARD'],['ADMIN','CASH'],['ADMIN','ACCOUNT']]) assert.equal(ctx.renewal(true,{renewed_by_value,payment_mode}).paymentMode,payment_mode);
 for(const [renewed_by_value,payment_mode] of [['ADMIN','DASHBOARD'],['CUSTOMER','CASH'],['EMPLOYEE:1','CASH']]) assert.throws(()=>ctx.renewal(true,{renewed_by_value,payment_mode}),{status:400});
});
test('non-admin payload cannot override Admin/Cash', () => {
 const result=context().renewal(false,{renewed_by_value:'CUSTOMER',payment_mode:'ACCOUNT'});
 assert.equal(result.renewedBy,'ADMIN');assert.equal(result.paymentMode,'CASH');
});
async function correction(admin, status='PAID') {
 const calls=[]; const db={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},query:async(sql,params)=>{calls.push({sql,params});return [{affectedRows:1}];}};
 const ctx=context({connection:{promise:()=>db},isAdmin:()=>admin,ensureInternetSchema:async()=>{},parseNetIds:()=>['net1'],cashAdminCorrectionRows:async()=>({customers:[{internet_customer_id:7,subscription_count:1}],month:9,year:2026,unmatched_net_ids:[]})});
 vm.runInContext(source.slice(source.indexOf('const applyCashAdminCorrection='),source.indexOf('const getInternetSubscriptionReport ='))+';this.apply=applyCashAdminCorrection;',ctx);
 const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await ctx.apply({body:{renewed_by_value:'ADMIN',payment_mode:'ACCOUNT',payment_status:status}},res);
 return {calls,res};
}
test('bulk correction updates only matched existing subscriptions in selected period and preserves collector',async()=>{
 for(const status of ['PAID','PENDING']) {
 const {calls,res}=await correction(true,status);assert.equal(res.body.updated_subscriptions,1);assert.equal(calls.length,1);
 const {sql,params}=calls[0];assert.match(sql,/WHERE internet_customer_id IN \(\?\) AND subscription_month=\? AND subscription_year=\? AND approval_status<>'REJECTED'/);
 assert.doesNotMatch(sql,/collected_by_employee_id=|INSERT|DELETE/);
 assert.match(sql,/paid_amount=CASE WHEN \?='PAID' THEN amount ELSE 0 END/);assert.match(sql,/balance_amount=CASE WHEN \?='PAID' THEN 0 ELSE amount END/);
 assert.deepEqual(Array.from(params),['ACCOUNT','ADMIN',status,status,status,7,9,2026]);
 }
});
test('bulk correction rejects non-admin and missing status without writes',async()=>{
 const denied=await correction(false);assert.equal(denied.res.code,403);assert.equal(denied.calls.length,0);
 const invalid=await correction(true,'');assert.equal(invalid.res.code,400);assert.equal(invalid.calls.length,0);
});
