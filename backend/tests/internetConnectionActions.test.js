const {test}=require('node:test');
const assert=require('node:assert/strict');
const create=require('../controller/internetConnectionActions');
async function run(method='update',options={}){
 const calls=[];let committed=false,rolled=false;
 const row={internet_connection_id:10,internet_customer_id:887,connection_type:'NEW',connection_charge:0,labour_service_charge:0,connection_discount:0,approval_status:'APPROVED',...options.row};
 const db={beginTransaction:async()=>{},commit:async()=>{committed=true},rollback:async()=>{rolled=true},query:async(sql,args)=>{
 calls.push({sql,args});
 if(sql.startsWith('SELECT * FROM internet_customers'))return [[{internet_customer_id:887,network_type:'RAILWIRE',status:'ACTIVE'}]];
 if(sql.startsWith('SELECT * FROM internet_connections'))return [options.missing?[]:[row]];
 if(sql.startsWith('SELECT workflow_id'))return [options.pending?[{workflow_id:1}]:[]];
 if(sql.startsWith('SELECT internet_connection_id'))return [[{internet_connection_id:options.older?11:10}]];
 if(sql.startsWith('SELECT employee_id'))return [[{employee_id:2}]];
 if(sql.startsWith('SELECT cp.'))return [options.conflict?[{internet_customer_package_id:7}]:[]];
 if(sql.startsWith('SELECT * FROM internet_customer_accounts'))return [[{internet_account_id:5,customer_paid_amount:options.paid?100:0,office_received_amount:0,router_amount:0,subscription_amount:0}]];
 if(sql.includes('AS linked'))return [[{linked:options.shared?1:0}]];
 if(sql.startsWith('SELECT'))return [[]];
 return [{insertId:5,affectedRows:1}];
 }};
 const actions=create({promise:()=>db},async()=>{});
 const res={locals:{role:options.staff?'EMPLOYEE':'ADMIN'},code:200,status(n){this.code=n;return this},json(body){this.body=body;return this}};
 await actions[method]({params:{id:887,connectionId:10},body:{connection_type:'NEW',connection_date:'2026-09-27',installed_by_employee_id:2,network_type:'RAILWIRE',connection_charge:0,labour_service_charge:0,overall_discount:0,customer_paid_amount:0,materials:[],...options.body}},res);
 return {calls,res,committed,rolled};
}
test('Update edits selected NEW row without full customer replacement',async()=>{
 const r=await run();assert.equal(r.res.code,200,r.res.body.message);assert.ok(r.committed);
 const update=r.calls.find(x=>x.sql.startsWith('UPDATE internet_connections SET connection_date'));assert.deepEqual(update.args.slice(-2),[10,887]);
 assert.ok(!r.calls.some(x=>x.sql.startsWith('DELETE')));
});
test('Network selection persists and package conflicts roll back',async()=>{
 const r=await run('update',{body:{network_type:'DMNET'}});assert.equal(r.res.code,200,r.res.body.message);
 assert.ok(r.calls.some(x=>x.sql.startsWith('UPDATE internet_customers SET network_type')&&x.args[0]==='DMNET'));
 const bad=await run('update',{body:{network_type:'DMNET'},conflict:true});assert.equal(bad.res.code,400);assert.ok(bad.rolled);assert.ok(!bad.committed);
});
test('Delete removes an unlinked initial row only',async()=>{
 const r=await run('remove');assert.equal(r.res.code,200);assert.ok(r.committed);
 const deletes=r.calls.filter(x=>x.sql.startsWith('DELETE'));assert.equal(deletes.length,1);assert.deepEqual(deletes[0].args,[10,887]);
});
test('Authorization, ownership, pending workflow, and newer history block changes',async()=>{
 for(const [options,status] of [[{staff:true},403],[{missing:true},404],[{pending:true},409],[{older:true},409]]){
 const r=await run('update',options);assert.equal(r.res.code,status);assert.ok(!r.committed);assert.ok(!r.calls.some(x=>/^(UPDATE|DELETE|INSERT)/.test(x.sql)));
 }
});
test('Paid and shared accounts cannot be deleted or repriced',async()=>{
 for(const guard of [{paid:true},{shared:true}]){
 const options={...guard,row:{initial_account_id:5}};
 const deleted=await run('remove',options);assert.equal(deleted.res.code,409);assert.ok(deleted.rolled);
 const edited=await run('update',{...options,body:{connection_charge:200}});assert.equal(edited.res.code,409);assert.ok(edited.rolled);
 }
});
