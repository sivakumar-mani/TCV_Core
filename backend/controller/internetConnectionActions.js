const {connectionDetails,applyInternetConnection,validateConnectionNetwork}=require('./internetConnectionDetails');
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
module.exports = function connectionActions(connection,ensureSchema){
 const action=remove=>async(req,res)=>{
  if(String(res.locals?.role||'').toUpperCase()!=='ADMIN')return res.status(403).json({message:'Administrator permission is required'});
  const db=connection.promise();
  try{
   await ensureSchema(db);await db.beginTransaction();
   const id=Number(req.params.id),rowId=Number(req.params.connectionId),p=req.body||{};
   const [[customer]]=await db.query('SELECT * FROM internet_customers WHERE internet_customer_id=? FOR UPDATE',[id]);
   if(!customer)fail('Internet customer not found',404);
   const [[row]]=await db.query('SELECT * FROM internet_connections WHERE internet_connection_id=? AND internet_customer_id=? FOR UPDATE',[rowId,id]);
   if(!row)fail('Connection detail not found',404);
   if(row.approval_status!=='APPROVED')fail('Only approved connection details can be changed here');
   const [[pending]]=await db.query("SELECT workflow_id FROM workflow_approvals WHERE reference_id=? AND module_name IN ('INTERNET_CUSTOMER','INTERNET_CUSTOMER_UPDATE') AND workflow_status='PENDING' LIMIT 1",[id]);
   if(pending)fail('Resolve the pending customer approval before editing or deleting connection details');
   const [[latest]]=await db.query("SELECT internet_connection_id FROM internet_connections WHERE internet_customer_id=? ORDER BY internet_connection_id DESC LIMIT 1",[id]);
   if(Number(latest?.internet_connection_id)!==rowId)fail('Only the latest connection can be changed; newer history depends on this entry');
   let account=null,materials=[];
   if(row.initial_account_id){
    [[account]]=await db.query('SELECT * FROM internet_customer_accounts WHERE internet_account_id=? AND internet_customer_id=? FOR UPDATE',[row.initial_account_id,id]);
    [materials]=await db.query('SELECT * FROM internet_connection_materials WHERE initial_account_id=? AND internet_customer_id=?',[row.initial_account_id,id]);
   }
   const original={connection_type:row.connection_type,connection_charge:row.connection_charge,labour_service_charge:row.labour_service_charge,overall_discount:account?.overall_discount||row.connection_discount||0,customer_paid_amount:account?.customer_paid_amount||0,materials};
   let shared=false;
   if(account){
    const [[refs]]=await db.query(`SELECT
     (SELECT COUNT(*) FROM internet_customer_routers WHERE initial_account_id=?) +
     (SELECT COUNT(*) FROM internet_subscriptions WHERE initial_account_id=?) +
     (SELECT COUNT(*) FROM internet_connections WHERE initial_account_id=? AND internet_connection_id<>?) AS linked`,[row.initial_account_id,row.initial_account_id,row.initial_account_id,rowId]);
    shared=Number(refs?.linked)>0 || Number(account.router_amount)>0 || Number(account.subscription_amount)>0;
   }
   if(shared){original.overall_discount=Number(row.connection_discount)||0;original.customer_paid_amount=0;materials=[];}
   if(remove){
    if(account&&(shared||Number(account.customer_paid_amount)>0||Number(account.office_received_amount)>0))fail('This connection has shared enrollment charges or recorded payments and cannot be deleted');
    if(account){const [[receipt]]=await db.query('SELECT internet_payment_id FROM internet_customer_account_payments WHERE internet_account_id=? LIMIT 1',[account.internet_account_id]);if(receipt)fail('This connection has payment receipts and cannot be deleted');}
    if(row.approval_status==='APPROVED' && row.connection_type!=='NEW' && !row.previous_customer_state)fail('This historical connection has no original address/status snapshot. Correct it using Update instead');
    if(row.approval_status==='APPROVED' && row.previous_customer_state){
     const before=JSON.parse(row.previous_customer_state);
     await validateConnectionNetwork(db,id,before.network_type);
     if(row.connection_type==='LOCATION_CHANGE'){
      if(Number(customer.location_id)!==Number(row.new_location_id)||Number(customer.area_id)!==Number(row.new_area_id)||Number(customer.street_id)!==Number(row.new_street_id)||String(customer.door_no)!==String(row.new_door_no))fail('Customer address changed after this connection; review it before deleting');
      await db.query('UPDATE internet_customers SET status=?,network_type=?,door_no=?,location_id=?,area_id=?,street_id=?,city=?,pincode=?,updated_at=NOW() WHERE internet_customer_id=?',[before.status,before.network_type,before.door_no,before.location_id,before.area_id,before.street_id,before.city,before.pincode,id]);
     }else await db.query('UPDATE internet_customers SET status=?,network_type=?,updated_at=NOW() WHERE internet_customer_id=?',[before.status,before.network_type,id]);
    }
    await db.query('DELETE FROM internet_connections WHERE internet_connection_id=? AND internet_customer_id=?',[rowId,id]);
    if(account){await db.query('DELETE FROM internet_connection_materials WHERE initial_account_id=? AND internet_customer_id=?',[account.internet_account_id,id]);await db.query('DELETE FROM internet_customer_accounts WHERE internet_account_id=? AND internet_customer_id=?',[account.internet_account_id,id]);}
   }else{
    const d=connectionDetails(p,row.connection_type==='NEW');
    if(row.connection_type==='LOCATION_CHANGE'&&d.type!=='LOCATION_CHANGE')fail('Keep Location change for this address history entry');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.connection_date||'')||Number.isNaN(Date.parse(p.connection_date)))fail('Select a valid connection date',400);
    const network=String(p.network_type||row.network_type||customer.network_type).toUpperCase();
    if(network!==customer.network_type)await validateConnectionNetwork(db,id,network);
    const [[employee]]=await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1',[Number(p.installed_by_employee_id)]);
    if(!employee)fail('Select an active installed-by employee',400);
    let newAddress=row.new_address;
    if(d.type==='LOCATION_CHANGE'){
     const [[address]]=await db.query('SELECT l.location_name,l.city,l.pincode,a.area_name,s.street_name FROM cable_locations l JOIN cable_areas a ON a.location_id=l.location_id JOIN cable_streets s ON s.area_id=a.area_id WHERE l.location_id=? AND a.area_id=? AND s.street_id=? AND l.is_active=1 AND a.is_active=1 AND s.is_active=1',[p.new_location_id,p.new_area_id,p.new_street_id]);
     if(!address||!String(p.new_door_no||'').trim())fail('Enter Door No and select a valid Postal Area, Location and Street',400);
     newAddress=[p.new_door_no,address.street_name,address.area_name,address.location_name,address.city,address.pincode].filter(Boolean).join(', ');
    }
    const normalize=rows=>rows.map(x=>[Number(x.product_id)||null,x.item_name,Number(x.qty),x.unit,Number(x.unit_rate??x.rate)]);
    const financialChanged=d.charge!==Number(row.connection_charge)||d.labor!==Number(row.labour_service_charge)||d.discount!==Number(original.overall_discount)||d.paid!==Number(original.customer_paid_amount)||JSON.stringify(normalize(d.materials))!==JSON.stringify(normalize(materials));
    if(financialChanged&&account){
     const [[receipt]]=await db.query('SELECT internet_payment_id FROM internet_customer_account_payments WHERE internet_account_id=? LIMIT 1',[account.internet_account_id]);
     if(shared||receipt||Number(account.customer_paid_amount)>0||Number(account.office_received_amount)>0)fail('Charges and materials are locked by shared enrollment or recorded payments. Other connection fields can still be updated');
    }
    await db.query('UPDATE internet_connections SET connection_date=?,connection_type=?,connection_status=?,network_type=?,installed_by_employee_id=?,connection_charge=?,labour_service_charge=?,connection_discount=?,remarks=?,new_door_no=?,new_location_id=?,new_area_id=?,new_street_id=?,new_address=? WHERE internet_connection_id=? AND internet_customer_id=?',[p.connection_date,d.type,d.type==='DISCONNECT'?'DISCONNECTED':'ACTIVE',network,employee.employee_id,d.charge,d.labor,financialChanged?d.discount:row.connection_discount,p.remarks||null,p.new_door_no||null,p.new_location_id||null,p.new_area_id||null,p.new_street_id||null,newAddress,rowId,id]);
    if(financialChanged){
     const values=[d.charge,d.labor,d.material,d.discount,d.total,d.paid,d.paid,d.total-d.paid,d.total-d.paid,d.total===d.paid?'PAID':d.paid>0?'PARTIAL':'PENDING'];
     if(account)await db.query('UPDATE internet_customer_accounts SET connection_amount=?,labor_amount=?,material_cost=?,overall_discount=?,grand_total=?,customer_paid_amount=?,office_received_amount=?,office_balance_amount=?,balance_amount=?,account_status=? WHERE internet_account_id=?',[...values,account.internet_account_id]);
     else {const [created]=await db.query("INSERT INTO internet_customer_accounts(connection_amount,labor_amount,material_cost,overall_discount,grand_total,customer_paid_amount,office_received_amount,office_balance_amount,balance_amount,account_status,internet_customer_id,account_source,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'CONNECTION','APPROVED')",[...values,id]);account={internet_account_id:created.insertId};await db.query('UPDATE internet_connections SET initial_account_id=? WHERE internet_connection_id=?',[created.insertId,rowId]);}
     await db.query('DELETE FROM internet_connection_materials WHERE initial_account_id=? AND internet_customer_id=?',[account.internet_account_id,id]);
     for(const m of d.materials)await db.query('INSERT INTO internet_connection_materials(internet_customer_id,initial_account_id,product_id,item_name,qty,unit,unit_rate,amount) VALUES(?,?,?,?,?,?,?,?)',[id,account.internet_account_id,m.product_id,m.item_name,m.qty,m.unit,m.rate,m.amount]);
    }
    if(row.approval_status==='APPROVED')await applyInternetConnection(db,id,{...p,connection_type:d.type,network_type:network});
   }
   await db.commit();return res.json({message:remove?'Internet connection detail deleted':'Internet connection detail updated'});
  }catch(e){await db.rollback();return res.status(e.status||500).json({message:e.message});}
 };
 const get=async(req,res)=>{
  try{
   const db=connection.promise();await ensureSchema(db);
   const [[row]]=await db.query('SELECT * FROM internet_connections WHERE internet_connection_id=? AND internet_customer_id=?',[Number(req.params.connectionId),Number(req.params.id)]);
   if(!row)return res.status(404).json({message:'Connection detail not found'});
   let account=null,materials=[],shared=false;
   if(row.initial_account_id){
    [[account]]=await db.query('SELECT * FROM internet_customer_accounts WHERE internet_account_id=? AND internet_customer_id=?',[row.initial_account_id,Number(req.params.id)]);
    const [[refs]]=await db.query(`SELECT (SELECT COUNT(*) FROM internet_customer_routers WHERE initial_account_id=?) + (SELECT COUNT(*) FROM internet_subscriptions WHERE initial_account_id=?) + (SELECT COUNT(*) FROM internet_connections WHERE initial_account_id=? AND internet_connection_id<>?) AS linked`,[row.initial_account_id,row.initial_account_id,row.initial_account_id,row.internet_connection_id]);
    shared=Number(refs?.linked)>0||Number(account?.router_amount)>0||Number(account?.subscription_amount)>0;
    if(!shared)[materials]=await db.query('SELECT * FROM internet_connection_materials WHERE initial_account_id=? AND internet_customer_id=?',[row.initial_account_id,Number(req.params.id)]);
   }
   return res.json({...row,materials,overall_discount:shared?Number(row.connection_discount)||0:Number(account?.overall_discount||row.connection_discount)||0,customer_paid_amount:shared?0:Number(account?.customer_paid_amount)||0});
  }catch(e){return res.status(500).json({message:e.message});}
 };
 return {get,update:action(false),remove:action(true)};
};
