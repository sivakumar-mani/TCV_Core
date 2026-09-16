const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../controller/internetCustomerController.js'),'utf8');
async function run({admin=false,row=true,body={}}={}) {
 const writes=[],events=[];
 const db={beginTransaction:async()=>{},commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),query:async(sql,params)=>{
   if(sql.startsWith('SELECT s.*')) {assert.match(sql,/payment_status='PAID'/);assert.match(sql,/collected_by_employee_id IS NULL OR s.collect_date IS NULL/);assert.match(sql,/FOR UPDATE/);return [row?[{internet_subscription_id:5,amount:600,period_count:1}]:[]];}
   if(sql.startsWith('SELECT employee_id')) return [[{employee_id:params[0]}]];
   writes.push({sql,params});return [{affectedRows:1}];
 }};
 const ctx=vm.createContext({syncNetEnrollmentAccount:async()=>{},connection:{promise:()=>db},ensureInternetSchema:async()=>{},resolveLoggedInEmployeeId:async()=>7,isAdmin:()=>admin,intOrNull:v=>Number(v)||null,textOrNull:v=>String(v||'').trim()||null,money:v=>Math.round(Number(v)||0),dateOnly:v=>v?new Date(v).toISOString().slice(0,10):null});
 vm.runInContext(source.slice(source.indexOf('const assignNetCollector ='),source.indexOf('const receiveInternetSubscriptionPayment ='))+';this.run=assignNetCollector;',ctx);
 const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await ctx.run({params:{id:5},body:{period_unit:'DAYS',period_value:30,period_count:1,free_period_value:0,free_period_unit:'MONTH',start_date:'2026-09-16',end_date:'2026-10-15',collect_date:'2026-09-20',collected_by_employee_id:99,payment_mapped_employee_id:98,paid_amount:600,...body}},res);
 return {writes,events,res};
}
test('staff can assign a paid row without receiving additional money; collector cannot be spoofed',async()=>{
 const {writes,events}=await run();assert.equal(writes.length,1);const p=writes[0].params;
 assert.equal(p[8],600);assert.equal(p[10],'PAID');assert.equal(p[12],7);assert.equal(p[13],7);assert.ok(events.includes('commit'));
 assert.doesNotMatch(writes[0].sql,/renewed_by=|payment_mode=|subscription_month=/);
});
test('staff can edit period/count, free period, start date and reduce paid amount',async()=>{
 const {writes}=await run({body:{period_value:60,period_count:2,free_period_value:3,free_period_unit:'DAYS',start_date:'2026-09-18',end_date:'2026-11-19',paid_amount:500}});
 const p=writes[0].params;assert.equal(p[1],60);assert.equal(p[2],2);assert.equal(p[3],3);assert.equal(p[5],'2026-09-18');assert.equal(p[7],1200);assert.equal(p[9],700);assert.equal(p[10],'PARTIAL');
});
test('admin selection maps both collector fields and preserves selected collection date',async()=>{
 const {writes}=await run({admin:true});assert.equal(writes[0].params[12],99);assert.equal(writes[0].params[13],99);assert.equal(writes[0].params[11],'2026-09-20');
});
test('already assigned or non-paid rows cannot be edited through assignment',async()=>{
 const {writes,res,events}=await run({row:false});assert.equal(res.code,409);assert.equal(writes.length,0);assert.ok(events.includes('rollback'));
});
test('invalid paid amount or count cannot be saved',async()=>{
 for(const body of [{paid_amount:601},{period_count:0},{paid_amount:-1}]){const {writes,res}=await run({body});assert.equal(res.code,400);assert.equal(writes.length,0);}
});

test('staff and admin can save or clear Payment Reference',async()=>{
 for(const admin of [false,true])for(const reference of ['  REF-123  ','']){
  const {writes}=await run({admin,body:{payment_reference:reference}});
  assert.match(writes[0].sql,/payment_reference=\?/);
  assert.equal(writes[0].params[14],reference.trim()||null);
 }
});
