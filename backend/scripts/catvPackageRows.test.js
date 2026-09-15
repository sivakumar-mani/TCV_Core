const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../controller/cableTvController.js'),'utf8');
async function save(rows,status='APPROVED',duplicate=false) {
 const calls=[];const db={beginTransaction:async()=>{},commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),query:async(sql,v)=>{
  calls.push(sql);
  if(sql.includes('SELECT package_id, package_name'))return [[{package_id:v[0],package_name:'P'+v[0],package_type:rows.find(r=>r.package_id===v[0]).package_type,price:100}]];
  if(sql.includes('SELECT cp.customer_package_id'))return [duplicate?[{}]:[]];return [[]];
 }};
 const ctx={connection:{promise:()=>db},ensureCableTvExtendedTables:async()=>{},createApprovalGroup:async()=>({approvalGroupId:1,approvalStatus:status,createdBy:1}),resolveEmployeeId:async()=>1,money:Number,nullable:v=>v||null};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const normalizePackageType ='),source.indexOf('const subscriptionBillingDays ='))+source.slice(source.indexOf('const addCustomerPackage ='),source.indexOf('const updateCustomerPackage ='))+';this.run=addCustomerPackage;',ctx);
 const res={status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
 await ctx.run({params:{id:1},body:{packages:rows}},res);return {calls,res};
}
for(const type of ['ALACARTE','BROADCASTER'])for(const status of ['APPROVED','PENDING'])test(type+' '+status+' supports multiple without removing existing',async()=>{
 const {calls,res}=await save([{package_id:1,package_type:type},{package_id:2,package_type:type}],status);
 assert.equal(res.code,201);assert.equal(calls.filter(x=>x.includes('INSERT INTO cable_customer_packages')).length,2);assert.ok(!calls.some(x=>x.includes('SET is_active = 0')));assert.ok(calls.includes('commit'));
});
test('multiple addons rejected',async()=>{const {res,calls}=await save([{package_id:1,package_type:'ADDON'},{package_id:2,package_type:'ADDON'}]);assert.equal(res.code,400);assert.ok(calls.includes('rollback'));});
test('single approved addon retains replacement behavior',async()=>{const {res,calls}=await save([{package_id:1,package_type:'ADDON'}]);assert.equal(res.code,201);assert.ok(calls.some(x=>x.includes('SET is_active = 0')));});
test('duplicate existing or pending package rolls back',async()=>{const {res,calls}=await save([{package_id:1,package_type:'ALACARTE'}],'PENDING',true);assert.equal(res.code,400);assert.ok(calls.includes('rollback'));assert.ok(!calls.includes('commit'));});

test('mixed Addon, Alacarte and Broadcaster save together',async()=>{
 const {res,calls}=await save([{package_id:1,package_type:'ADDON'},{package_id:2,package_type:'ALACARTE'},{package_id:3,package_type:'BROADCASTER'}]);
 assert.equal(res.code,201);assert.equal(calls.filter(x=>x.includes('INSERT INTO cable_customer_packages')).length,3);
 assert.equal(calls.filter(x=>x.includes('SET is_active = 0')).length,1);
});
test('inactive addon does not replace existing active addon',async()=>{
 const {res,calls}=await save([{package_id:1,package_type:'ADDON',is_active:0}]);
 assert.equal(res.code,201);assert.ok(!calls.some(x=>x.includes('SET is_active = 0')));
});
