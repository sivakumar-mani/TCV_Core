const test = require('node:test');
const assert = require('node:assert/strict');
const { saveEnrollment, routerCharges, subscriptionPeriod, routerStockType } = require('../controller/internetEnrollment');

const payload = () => ({
  network_type:'KRISHI',full_name:'Test Customer',net_id:'test_net',email:'test@example.com',door_no:'1',mobile_no:'9876543210',
  location_id:1,area_id:2,street_id:3,installed_by_employee_id:9,installed_date:'2026-09-16',
  packages:[{package_id:10,package_price:1}],routers:[{product_id:20,router_type:'NEW',usage_category:'CUSTOMER_PAID',qty:1,rate:800,discount:100}],
  materials:[{product_id:30,item_name:'Cable',qty:2,unit_rate:50,discount:10}],
  connection:{connection_date:'2026-09-16',connection_charge:200,connection_discount:20,labour_service_charge:50},
  subscription:{month:9,year:2026,period_unit:'MONTH',period_value:1,free_period_value:1,free_period_unit:'MONTH',start_date:'2026-09-16',end_date:'2026-11-15',collect_date:'2026-09-20',paid_amount:100,payment_status:'PARTIAL',collected_by_employee_id:9,renewed_by_value:'ADMIN',payment_mode:'CASH',payment_reference:'receipt-test',payment_mapped_employee_id:9},
  account:{overall_discount:20,customer_paid_amount:100}
});
async function save(admin, p=payload(), options={}) {
  const calls=[];let committed=false,rolledBack=false;
  const db={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},query:async(sql,args=[])=>{
    calls.push({sql,args});
    if(sql.startsWith('INSERT')) assert.equal((sql.match(/\?/g)||[]).length,args.length,sql);
    if(sql.includes('FROM employees'))return [[{employee_id:args[0]}]];
    if(sql.includes('MAX(customer_code)'))return [[{next_code:2001}]];
    if(sql.includes('FROM internet_customers WHERE net_id'))return [[]];
    if(sql.includes('FROM internet_package_master'))return [[{price:500,provider_category:'KRISHI'}]];
    if(sql.includes('FROM technician_material_sale_adjustments'))return [[]];
    if(sql.includes('SELECT ri.qty'))return [[{qty:options.allocated||0}]];
    if(sql.includes('FROM technician_material_movements m'))return [options.noStock?[]:[{product_name:'General Optinet Router Single Band 2.4GHz',selling_price:2000,available_qty:1}]];
    if(sql.includes('FROM technician_material_stock'))return [options.noStock?[]:[{product_name:options.routerName||'Router',hsn_code:'1',unit:'PCS',selling_price:1000,available_qty:2}]];
    if(sql.includes('FROM products'))return [[{product_name:'Cable',unit:'M',selling_price:50}]];
    if(sql.startsWith('INSERT'))return [{insertId:sql.includes('internet_customer_packages')?12:sql.includes('internet_customer_accounts')?13:11}];
    return [{affectedRows:1}];
  }};
  const deps={db,ensureInternetSchema:async()=>{},isAdmin:()=>admin,resolveLoggedInEmployeeId:async()=>9,validateAddress:async()=>({city:'Chennai',pincode:'600001'}),userId:()=>1,subscriptionRenewal:(isAdmin,s)=>isAdmin?{renewedBy:s.renewed_by_value,paymentMode:s.payment_mode}:{renewedBy:'ADMIN',paymentMode:'CASH'}};
  const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await saveEnrollment({body:p},res,deps);
  const inserted=table=>calls.filter(x=>x.sql.startsWith(`INSERT INTO ${table}(`)).map(x=>Object.fromEntries(x.sql.match(/\(([^)]+)\)/)[1].split(',').map((col,i)=>[col,x.args[i]])));
  return {calls,res,committed,rolledBack,inserted};
}
test('staff enrollment recomputes prices, saves dates and payments, includes labor/discounts and remains pending office receipt',async()=>{
  const p=payload();p.installed_by_employee_id=999;p.routers[0].rate=1;p.materials[0].unit_rate=1;
  const r=await save(false,p);assert.equal(r.res.code,201);assert.ok(r.committed);
  const customer=r.inserted('internet_customers')[0];assert.equal(customer.email,'test@example.com');assert.equal(customer.installed_by_employee_id,9);assert.equal(customer.approval_status,'PENDING');
  const pkg=r.inserted('internet_customer_packages')[0];assert.equal(pkg.package_price,590);
  const sub=r.inserted('internet_subscriptions')[0];assert.equal(sub.amount,590);assert.equal(sub.paid_amount,100);assert.equal(sub.balance_amount,490);assert.equal(sub.end_date,'2026-11-15');assert.equal(sub.collect_date,'2026-09-20');assert.equal(sub.free_period_value,1);assert.equal(sub.approval_status,'PENDING');
  const router=r.inserted('internet_customer_routers')[0];assert.equal(router.rate,1000);assert.equal(router.amount,900);assert.equal(router.discount,100);
  const material=r.inserted('internet_connection_materials')[0];assert.equal(material.unit_rate,50);assert.equal(material.amount,90);
  const account=r.inserted('internet_customer_accounts')[0];assert.equal(account.grand_total,1790);assert.equal(account.balance_amount,1690);assert.equal(account.office_received_amount,0);assert.equal(account.office_balance_amount,1790);assert.equal(account.account_status,'PENDING');assert.equal(account.material_cost,100);assert.equal(account.material_discount,10);
  assert.equal(r.calls.filter(x=>x.sql.includes('INSERT INTO workflow_approvals')).length,1);
});
test('admin rate override is saved and approval is immediate, but account receipt remains pending',async()=>{
  const r=await save(true);assert.equal(r.res.code,201);assert.equal(r.inserted('internet_customer_routers')[0].rate,800);assert.equal(r.inserted('internet_customer_accounts')[0].grand_total,1590);assert.equal(r.res.body.approval_status,'APPROVED');assert.equal(r.res.body.account_status,'PENDING');assert.ok(!r.calls.some(x=>x.sql.includes('INSERT INTO workflow_approvals')));
});
test('free-use router zeros rate, discount and amount even with a forged payload',async()=>{
  const p=payload();p.routers[0].usage_category='FREE_USE';const r=await save(false,p);const router=r.inserted('internet_customer_routers')[0];assert.equal(router.rate,0);assert.equal(router.discount,0);assert.equal(router.amount,0);assert.equal(r.res.code,201);
});
test('missing required email or payment information, invalid dates, wrong stock type and unavailable stock roll back',async()=>{
  for(const change of [p=>p.email='',p=>p.subscription.payment_reference='',p=>p.subscription.end_date='2026-09-01',p=>p.subscription.collect_date='2026-02-30',p=>p.subscription.payment_mapped_employee_id=44,p=>p.routers[0].router_type='SERVICED',p=>p.subscription.paid_amount=900,p=>p.routers[0].qty=-1]){
    const p=payload();change(p);const r=await save(false,p);assert.equal(r.res.code,400,r.res.body.message);assert.ok(r.rolledBack);assert.ok(!r.committed);
  }
  const r=await save(false,payload(),{noStock:true});assert.equal(r.res.code,400);assert.ok(r.rolledBack);
});
test('day and year periods use the existing renewal count and manual dates are retained',()=>{
  const s=payload().subscription;s.period_unit='DAYS';s.period_value=15;s.start_date='2026-10-01';s.end_date='2026-10-25';assert.equal(subscriptionPeriod(s,'KRISHI').count,15/31);assert.equal(subscriptionPeriod(s,'KRISHI').end,'2026-10-25');s.period_unit='YEAR';s.period_value=2;assert.equal(subscriptionPeriod(s,'RAILWIRE').count,24);
});
test('stock types use explicit product names, and invalid discounts are rejected',()=>{
  assert.equal(routerStockType('TP-Link Serviced Router'),'SERVICED');assert.equal(routerStockType('Returned router'),'RETURNED');assert.equal(routerStockType('TP-Link router'),'NEW');assert.throws(()=>routerCharges({...payload().routers[0],discount:1001},1000,false),{status:400});
});

test('Pending Accounts exposes workflow separately, preserves paise and retains CATV rows',async()=>{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../controller/cableTvController.js'),'utf8');
  let internetQuery;
  const cable={account_id:1,grand_total:200,created_at:'2026-09-20'};
  const db={query:async(sql,args)=>{
    if(sql.includes('FROM internet_customer_accounts ia')){internetQuery={sql,args};return [[{account_id:-1000000013,grand_total:'1790.55',office_received_amount:0,balance_amount:'1790.55',account_status:'PENDING',enrollment_approval_status:'PENDING',created_at:'2026-09-23'}]];}
    return [sql.includes('FROM cable_customer_accounts ca')?[cable]:[]];
  }};
  const ctx=vm.createContext({connection:{promise:()=>db},ensureCableTvExtendedTables:async()=>{},reconcileMissingStbAmounts:async()=>{},ensureMaterialSalesTables:async()=>{},isAdmin:()=>true,intOrNull:v=>Number(v)||null,textOrNull:v=>v||null,money:v=>Number(v)||0,internetCustomerNumberSql:()=> 'ic.customer_code'});
  vm.runInContext(source.slice(source.indexOf('const getPendingAccounts ='),source.indexOf('const getLoAccounts ='))+';this.list=getPendingAccounts;',ctx);
  const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await ctx.list({query:{status:'PENDING'}},res);
  assert.equal(res.body[0].grand_total,1790.55);assert.equal(res.body[0].enrollment_approval_status,'PENDING');assert.equal(res.body[1],cable);
  assert.match(internetQuery.sql,/ia\.approval_status AS enrollment_approval_status/);assert.match(internetQuery.sql,/ia\.router_amount \+ ia\.router_discount AS stb_amount/);
  assert.match(internetQuery.sql,/GREATEST\(ia.grand_total-COALESCE\(ia.office_received_amount,0\),0\)>0/);
});

test('approving enrollment approves its components without marking office payments received',async()=>{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../controller/workflowController.js'),'utf8'),calls=[];
  const db={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT * FROM workflow_approvals'))return [[{workflow_id:1,module_name:'INTERNET_CUSTOMER',reference_id:11,workflow_status:'PENDING'}]];return [{affectedRows:1}];}};
  const ctx=vm.createContext({connection:{promise:()=>db},ensureWorkflowTable:async()=>{},ensureTransactionTable:async()=>{}});
  vm.runInContext(source.slice(source.indexOf('const approveWorkflow ='),source.indexOf('module.exports ='))+';this.approve=approveWorkflow;',ctx);
  const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await ctx.approve({params:{workflow_id:'1'},body:{approved_by_employee_id:9}},res);
  assert.equal(res.body.success,true);
  for(const table of ['internet_customer_packages','internet_customer_routers','internet_connections','internet_subscriptions'])assert.ok(calls.some(x=>x.sql.startsWith(`UPDATE ${table} SET approval_status='APPROVED'`)&&x.args[0]===11));
  assert.ok(!calls.some(x=>/office_received_amount=|account_status='PAID'/.test(x.sql)));
});

 test('issued sale router reserves the issue without deducting technician stock or changing sale money',async()=>{
   const p=payload();p.routers[0].material_movement_id=77;
   const r=await save(false,p);assert.equal(r.res.code,201);
   assert.equal(r.inserted('internet_router_material_issues')[0].material_movement_id,77);
   assert.ok(!r.calls.some(c=>c.sql.startsWith('UPDATE technician_material_stock')));
   assert.ok(!r.calls.some(c=>c.sql.startsWith('UPDATE technician_material_movements')));
   const query=r.calls.find(c=>c.sql.includes('FROM technician_material_movements m'));
   assert.deepEqual(query.args,[77,9,20]);
   const used=await save(false,p,{allocated:1});assert.equal(used.res.code,400);assert.ok(used.rolledBack);
 });
