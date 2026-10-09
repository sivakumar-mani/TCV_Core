// Read-only report: no application schema helpers or database mutations.
const fs = require('fs');
const path = require('path');
const envFile=process.argv[3]||'.env';
if(!['.env','.env copy'].includes(envFile)) throw new Error('Unsupported configuration file');
require('../backend/node_modules/dotenv').config({path:path.join(__dirname,'../backend',envFile),quiet:true});
const mysql = require('../backend/node_modules/mysql2/promise');
const reportTag=process.argv[4]||'stb_check_20261008';
if(!/^stb_check_\d{8}(?:_batch\d+)?$/.test(reportTag)) throw new Error('Invalid report name');
const input=JSON.parse(fs.readFileSync(path.join(__dirname,reportTag+'_input.json'),'utf8'));
(async()=>{
 const port=Number(process.argv[2]||process.env.DB_PORT||3306);
 const db=await mysql.createConnection({host:process.env.DB_HOST,port,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME,connectTimeout:15000});
 try {
  await db.query('START TRANSACTION READ ONLY');
  const [identity]=await db.query('SELECT DATABASE() database_name, NOW() database_time');
  const values=input.filter(s=>!/[Ee]\+/.test(s)).map(s=>s.toUpperCase());
  const [rows]=await db.query(`SELECT s.customer_stb_id,s.stb_no,s.status stb_status,s.approval_status stb_approval,s.stb_type,s.installed_date,c.cable_customer_id,c.customer_code,c.legacy_customer_no,c.network_customer_no,c.full_name,c.status customer_status,c.approval_status customer_approval,c.network_type,n.network_code,n.network_name,
   (SELECT MAX(h.customer_stb_id) FROM cable_customer_stbs h WHERE h.cable_customer_id=s.cable_customer_id AND h.approval_status='APPROVED') latest_approved_stb_id
   FROM cable_customer_stbs s JOIN cable_tv_customers c ON c.cable_customer_id=s.cable_customer_id LEFT JOIN cable_network_master n ON n.network_id=c.network_id WHERE UPPER(TRIM(s.stb_no)) IN (?) ORDER BY s.customer_stb_id DESC`,[values]);
  const [masters]=await db.query('SELECT stb_master_id,stb_number FROM cable_stb_master WHERE UPPER(TRIM(stb_number)) IN (?)',[values]);
  const output={checked_at:new Date().toISOString(),database:identity[0].database_name,port,connection_type:['localhost','127.0.0.1','::1'].includes(process.env.DB_HOST)?'Local configured database':'Remote configured database',input,rows,masters};
  fs.writeFileSync(path.join(__dirname,reportTag+'_results.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify({inputs:input.length,customer_stb_matches:rows.length,master_matches:masters.length,database:output.database,connection_type:output.connection_type}));
 } finally { await db.end(); }
})().catch(e=>{console.error('Read-only STB check failed:',e.code||'ERROR',e.message.replace(/password[^ ]*/gi,'[redacted]'));process.exitCode=1;});
