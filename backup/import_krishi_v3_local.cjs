const fs=require('fs'),mysql=require('../backend/node_modules/mysql2/promise'),crypto=require('crypto');
const e=require('../backend/node_modules/dotenv').parse(fs.readFileSync('backend/.env copy'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
(async()=>{
 const c=await mysql.createConnection({host:'127.0.0.1',port:3308,user:e.DB_USERNAME,password:e.DB_PASSWORD,database:e.DB_NAME,dateStrings:true});
 try{
 const source=JSON.parse(fs.readFileSync('backup/krishi_v3_source.json'));
 const customers=(await c.query('SELECT internet_customer_id,net_id FROM internet_customers'))[0];
 const before=(await c.query('SELECT * FROM internet_subscriptions ORDER BY internet_subscription_id'))[0];
 const packages=(await c.query('SELECT * FROM internet_customer_packages ORDER BY internet_customer_package_id'))[0];
 const matches=source.map(r=>({net_id:r[0],customers:customers.filter(x=>(x.net_id||'').trim().toLowerCase()===r[0].toLowerCase())}));
 const missing=matches.filter(x=>!x.customers.length).map(x=>x.net_id);
 for(const x of matches.filter(x=>x.customers.length)){if(x.customers.length!==1)throw Error('Duplicate customer '+x.net_id);const cid=x.customers[0].internet_customer_id;const subs=before.filter(s=>s.internet_customer_id===cid);if(!subs.length&&packages.filter(p=>p.internet_customer_id===cid&&p.is_active===1&&p.approval_status==='APPROVED').length!==1)throw Error('Invalid package '+x.net_id);}
 fs.writeFileSync('backup/krishi_v3_local_matches.json',JSON.stringify({database:e.DB_NAME,missing,available:matches.filter(x=>x.customers.length).map(x=>({net_id:x.net_id,customer_id:x.customers[0].internet_customer_id})),before_count:before.length},null,2));
 console.log(JSON.stringify({database:e.DB_NAME,subscriptions_before:before.length,available:176-missing.length,missing:missing.length}));
 if(!process.argv.includes('--apply'))return;
 fs.writeFileSync('backup/internet_subscriptions_before_krishi_v3.json',JSON.stringify(before,null,2));
 const adjacent={};for(const t of ['internet_customers','internet_customer_packages','internet_customer_accounts','cable_subscriptions']){const exists=(await c.query('SHOW TABLES LIKE ?',[t]))[0];if(exists.length)adjacent[t]=hash((await c.query('SELECT * FROM '+t))[0]);}
 const sql=fs.readFileSync('insert_krishi_active_gst_v3_vps.sql','utf8');
 const routine=sql.slice(sql.indexOf('CREATE PROCEDURE'),sql.indexOf('END$$')+3).replace(' COMMIT;',' -- Commit only after independent verification by local runner.');
 await c.query('DROP PROCEDURE IF EXISTS import_krishi_gst_v3');await c.query(routine);
 await c.query('CALL import_krishi_gst_v3()');
 const after=(await c.query('SELECT * FROM internet_subscriptions ORDER BY internet_subscription_id'))[0];
 const collector=(await c.query("SELECT employee_id FROM employees WHERE LOWER(TRIM(first_name))='murugan' AND LOWER(TRIM(last_name))='k'"))[0][0].employee_id;
 const affected=new Set();
 for(const x of matches.filter(x=>x.customers.length)){
 const r=source.find(r=>r[0]===x.net_id),cid=x.customers[0].internet_customer_id;
 const a=after.filter(s=>s.internet_customer_id===cid&&s.start_date===r[5]&&s.end_date===r[6]);if(a.length!==1)throw Error('Verify unique subscription '+x.net_id);
 const s=a[0];affected.add(s.internet_subscription_id);
 const expected={subscription_month:r[1],subscription_year:r[2],collect_date:r[3],period_value:r[4],period_count:r[4],amount:r[7],paid_amount:r[9]==='PAID'?r[7]:0,balance_amount:r[9]==='PAID'?0:r[7],payment_status:r[9],collected_by_employee_id:collector,billing_basis:'DAYS'};
 for(const [k,v] of Object.entries(expected))if(String(s[k])!==String(v)&&!(typeof v==='number'&&Number(s[k])===v))throw Error('Verification mismatch '+x.net_id+' '+k);
 }
 for(const s of before.filter(s=>!affected.has(s.internet_subscription_id)))if(hash(s)!==hash(after.find(x=>x.internet_subscription_id===s.internet_subscription_id)))throw Error('Unrelated subscription changed');
 for(const [t,h] of Object.entries(adjacent))if(hash((await c.query('SELECT * FROM '+t))[0])!==h)throw Error('Adjacent table changed '+t);
 if(after.length!==before.length+after.filter(s=>!before.some(b=>b.internet_subscription_id===s.internet_subscription_id)).length)throw Error('Unexpected deletion');
 await c.commit();
 fs.writeFileSync('backup/krishi_v3_local_result.json',JSON.stringify({verified:affected.size,before:before.length,after:after.length,inserted:after.length-before.length,skipped:missing.length,adjacent_tables_verified:Object.keys(adjacent)},null,2));
 await c.query('DROP PROCEDURE IF EXISTS import_krishi_gst_v3');
 console.log(fs.readFileSync('backup/krishi_v3_local_result.json','utf8'));
 }catch(err){await c.rollback();throw err;}finally{await c.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
