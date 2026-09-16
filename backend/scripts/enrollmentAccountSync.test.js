const test=require('node:test'),assert=require('node:assert/strict');
const {findCatvEnrollmentGroup,findNetEnrollmentAccount,syncNetEnrollmentAccount}=require('../controller/enrollmentAccountSync');
test('CATV first-subscription link requires onboarding group, open account, matching enrolment month and no other subscription',async()=>{
 let captured;const db={query:async(sql,params)=>{captured={sql,params};return [[{approval_group_id:81}]];}};
 assert.equal(await findCatvEnrollmentGroup(db,9494,9,2026,15),81);
 assert.match(captured.sql,/NEW_CUSTOMER_ONBOARDING/);assert.match(captured.sql,/account_status IN \('PENDING','PARTIAL','NA'\)/);assert.match(captured.sql,/NOT EXISTS/);assert.match(captured.sql,/MIN\(x.connection_date\)/);assert.deepEqual(captured.params,[9494,9,2026,15,15]);
 assert.equal(await findCatvEnrollmentGroup({query:async()=>[[]]},9494,10,2026),null);
});
test('Net matching excludes imported customers, settled accounts and renewals',async()=>{
 let sql;const db={query:async(q)=>{sql=q;return [[]];}};
 assert.equal(await findNetEnrollmentAccount(db,1,9,2026,5),null);
 assert.match(sql,/legacy_customer_no/);assert.match(sql,/account_source='CONNECTION'/);assert.match(sql,/MIN\(x.internet_account_id\)/);assert.match(sql,/NOT EXISTS/);assert.match(sql,/MONTH\(c.installed_date\)=\?/);
});
async function sync(totals,removed=null,exists=true){const calls=[];let reads=0;const db={query:async(sql,params)=>{calls.push({sql,params});if(++reads===1){assert.match(sql,/account_status IN \('PENDING','PARTIAL'\)/);return [exists?[{internet_account_id:1,subscription_amount:0,router_amount:500,connection_amount:200,labor_amount:50,material_cost:100,material_discount:10,overall_discount:20,grand_total:800,customer_paid_amount:200,office_received_amount:100}]:[]];}if(reads===2)return [[totals]];return [{affectedRows:1}];}};await syncNetEnrollmentAccount(db,1,removed);return calls;}
test('missing first Net subscription adds its charge without changing other components or recorded receipts',async()=>{
 const calls=await sync({subscriptions:300,routers:null,connections:null,connection_amount:null,labor_amount:null,materials:null});
 assert.deepEqual(calls[2].params,[300,500,200,50,100,1100,900,1000,'PARTIAL',1]);
 assert.doesNotMatch(calls[2].sql,/customer_paid_amount=|office_received_amount=|approval_status=/);
});
test('linked router, connection, labour, material and subscription totals include discounts once',async()=>{
 const calls=await sync({subscriptions:300,routers:600,connections:225,connection_amount:200,labor_amount:50,materials:100});
 assert.deepEqual(calls[2].params,[300,600,200,50,100,1195,995,1095,'PARTIAL',1]);
});
test('deleting the last linked router clears its component instead of retaining stale amount',async()=>{
 const calls=await sync({subscriptions:null,routers:null,connections:null,connection_amount:null,labor_amount:null,materials:null},'routers');assert.equal(calls[2].params[1],0);assert.equal(calls[2].params[5],300);
});
test('settled or missing accounts are not recalculated',async()=>{assert.equal((await sync({},null,false)).length,1);});

test('SQL eligibility includes only the first enrolment month and excludes renewals and closed/imported accounts',async()=>{
 const {DatabaseSync}=require('node:sqlite');const database=new DatabaseSync(':memory:');
 database.function('MONTH',v=>Number(String(v).slice(5,7)));database.function('YEAR',v=>Number(String(v).slice(0,4)));
 database.exec(`CREATE TABLE cable_tv_customers(cable_customer_id INT,approval_group_id INT,created_at TEXT);
 CREATE TABLE cable_approval_groups(approval_group_id INT,group_type TEXT,approval_status TEXT);
 CREATE TABLE cable_customer_accounts(account_id INT,cable_customer_id INT,approval_group_id INT,account_status TEXT,approval_status TEXT);
 CREATE TABLE cable_connections(approval_group_id INT,connection_date TEXT);
 CREATE TABLE cable_subscriptions(subscription_id INT,cable_customer_id INT);
 INSERT INTO cable_tv_customers VALUES(9494,81,'2026-09-15');
 INSERT INTO cable_approval_groups VALUES(81,'NEW_CUSTOMER_ONBOARDING','APPROVED');
 INSERT INTO cable_customer_accounts VALUES(1,9494,81,'PENDING','APPROVED');
 INSERT INTO cable_connections VALUES(81,'2026-09-01');
 INSERT INTO cable_subscriptions VALUES(15,9494);`);
 const db={query:async(sql,params)=>[database.prepare(sql.replace(' FOR UPDATE','')).all(...params)]};
 assert.equal(await findCatvEnrollmentGroup(db,9494,9,2026,15),81);
 assert.equal(await findCatvEnrollmentGroup(db,9494,10,2026,15),null);
 database.exec('INSERT INTO cable_subscriptions VALUES(16,9494)');assert.equal(await findCatvEnrollmentGroup(db,9494,9,2026,15),null);
 database.exec("DELETE FROM cable_subscriptions WHERE subscription_id=16;UPDATE cable_customer_accounts SET account_status='PAID'");assert.equal(await findCatvEnrollmentGroup(db,9494,9,2026,15),null);
 database.exec(`CREATE TABLE internet_customers(internet_customer_id INT,legacy_customer_no TEXT,installed_date TEXT);
 CREATE TABLE internet_customer_accounts(internet_account_id INT,internet_customer_id INT,account_source TEXT,account_status TEXT,approval_status TEXT);
 CREATE TABLE internet_subscriptions(internet_subscription_id INT,internet_customer_id INT);
 INSERT INTO internet_customers VALUES(1,NULL,'2026-09-15');
 INSERT INTO internet_customer_accounts VALUES(1,1,'CONNECTION','PENDING','APPROVED');`);
 assert.equal(await findNetEnrollmentAccount(db,1,9,2026),1);
 assert.equal(await findNetEnrollmentAccount(db,1,10,2026),null);
 database.exec("UPDATE internet_customers SET legacy_customer_no='123'");assert.equal(await findNetEnrollmentAccount(db,1,9,2026),null);
 database.close();
});

test('CATV linked account recalculation includes subscription, STB and connection changes while retaining receipts',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../controller/cableTvController.js'),'utf8');let saved;
 const db={query:async(sql,params)=>{
 if(sql.startsWith('SELECT'))return [[{account_id:1,stb_amount:500,stb_discount:20,stb_labor:0,connection_amount:200,connection_discount:10,connection_labor:0,material_cost:0,material_discount:0,overall_discount:0,subscription_amount:300,customer_paid_amount:200,office_received_amount:100}]];
 saved={sql,params};return [{affectedRows:1}];}};
 const ctx=vm.createContext({money:v=>Number(v)||0});
 vm.runInContext(source.slice(source.indexOf('const recalculateLinkedPendingAccount ='),source.indexOf('const reconcileMissingStbAmounts ='))+';this.recalculate=recalculateLinkedPendingAccount;',ctx);
 await ctx.recalculate(db,81);
 assert.deepEqual(Array.from(saved.params),[500,200,0,0,300,1000,30,970,770,870,'PARTIAL',1]);
 assert.doesNotMatch(saved.sql,/customer_paid_amount =|office_received_amount =/);
});
