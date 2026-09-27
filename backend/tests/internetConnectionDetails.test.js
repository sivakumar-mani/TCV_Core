const {test}=require('node:test');
const assert=require('node:assert/strict');
const {connectionDetails,applyInternetConnection}=require('../controller/internetConnectionDetails');
const fs=require('node:fs'),vm=require('node:vm');
test('material totals and discount are calculated rather than trusting submitted amounts',()=>{
 const d=connectionDetails({connection_type:'LOCATION_CHANGE',connection_charge:100,labour_service_charge:50,overall_discount:20,customer_paid_amount:190,materials:[{item_name:'Cable',qty:3,unit_rate:20,amount:999}]});
 assert.equal(d.total,190);assert.equal(d.material,60);assert.equal(d.paid,190);
});
test('disconnect clears charges and invalid totals/types fail',()=>{
 assert.equal(connectionDetails({connection_type:'DISCONNECT',connection_charge:500,materials:[{}]}).total,0);
 for(const patch of [{connection_type:'NEW'},{connection_charge:-1},{overall_discount:101},{customer_paid_amount:101}])assert.throws(()=>connectionDetails({connection_type:'RECONNECTION',connection_charge:100,...patch}));
});
async function run(type,admin=true,pending=false,extra={}){
 const calls=[];let committed=false,rolled=false;
 const db={beginTransaction:async()=>{},commit:async()=>{committed=true},rollback:async()=>{rolled=true},query:async(sql,args)=>{
 calls.push({sql,args});
 if(sql.startsWith('SELECT * FROM internet_customers'))return [[{internet_customer_id:865,customer_code:2765,status:'INACTIVE',network_type:'RAILWIRE'}]];
 if(sql.startsWith('SELECT account_status'))return [[{account_status:'PAID'}]];
 if(sql.startsWith('SELECT connection_status'))return [[{connection_status:'DISCONNECTED',approval_status:pending?'PENDING':'APPROVED'}]];
 if(sql.startsWith('SELECT employee_id'))return [[{employee_id:2}]];
 if(sql.startsWith('SELECT l.location_name'))return [[{city:'Chennai',pincode:'600044'}]];
 return [{insertId:42}];}};
 const source=fs.readFileSync(require.resolve('../controller/internetCustomerController'),'utf8');
 const start=source.indexOf('const addInternetCustomerHistory ='),end=source.indexOf('const getPendingInternetSubscriptions',start);
 const context={connection:{promise:()=>db},ensureInternetSchema:async()=>{},connectionDetails,applyInternetConnection,isAdmin:()=>admin,intOrNull:v=>Number(v)||null,resolveLoggedInEmployeeId:async()=>2,money:v=>Math.round(Number(v)||0),dateOnly:v=>v,textOrNull:v=>v||null,userId:()=>1};
 vm.runInNewContext(source.slice(start,end)+'\nthis.handler=addInternetCustomerHistory;',context);
 const res={code:200,status(n){this.code=n;return this},json(v){this.body=v;return this}};
 await context.handler({params:{id:865,section:'connections'},body:{connection_type:type,connection_date:'2026-09-27',new_door_no:'1',new_location_id:3,new_area_id:4,new_street_id:5,connection_charge:100,customer_paid_amount:100,...extra}},res);
 return {calls,res,committed,rolled};
}
test('admin reactive and disconnect update only Internet customer status',async()=>{
 for(const [type,status] of [['RECONNECTION','ACTIVE'],['DISCONNECT','INACTIVE']]){
 const r=await run(type);assert.equal(r.res.code,201);assert.ok(r.committed);
 const update=r.calls.find(x=>x.sql.startsWith('UPDATE internet_customers SET status'));assert.equal(update.args[0],status);
 assert.ok(!r.calls.some(x=>/UPDATE cable_|INSERT INTO cable_/.test(x.sql)));
 }
});
test('location change activates disconnected customer and updates postal fields',async()=>{
 const r=await run('LOCATION_CHANGE');assert.equal(r.res.code,201);
 const update=r.calls.find(x=>x.sql.startsWith('UPDATE internet_customers c'));assert.match(update.sql,/status='ACTIVE'/);assert.match(update.sql,/c.city=l.city,c.pincode=l.pincode/);
});
test('staff request preserves approval routing and pending history blocks duplicate',async()=>{
 const r=await run('RECONNECTION',false);assert.equal(r.res.code,201);assert.ok(!r.calls.some(x=>x.sql.startsWith('UPDATE internet_customers')));assert.ok(r.calls.some(x=>x.sql.includes('INSERT INTO workflow_approvals')));
 const blocked=await run('RECONNECTION',true,true);assert.equal(blocked.res.code,409);assert.ok(blocked.rolled);assert.ok(!blocked.committed);
});

test('connection materials persist with one matching account and server totals',async()=>{
 const r=await run('RECONNECTION',true,false,{labour_service_charge:50,overall_discount:20,customer_paid_amount:190,materials:[{item_name:'Cable',qty:3,unit_rate:20,amount:999}]});
 assert.equal(r.res.code,201);
 const accounts=r.calls.filter(x=>x.sql.startsWith('INSERT INTO internet_customer_accounts'));
 assert.equal(accounts.length,1);assert.equal(accounts[0].args[5],190);
 const material=r.calls.find(x=>x.sql.startsWith('INSERT INTO internet_connection_materials'));assert.equal(material.args[6],60);assert.equal(material.args[7],42);
});
