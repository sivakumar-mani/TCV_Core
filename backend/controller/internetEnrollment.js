// New enrollment only. Existing customer edits and renewals retain their own workflows.
const { routerProductSql, ensureRouterIssues } = require('./internetRouterStock');
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const text = value => String(value ?? '').trim();
// Stock is keyed by employee/product, with no condition dimension. Condition-specific
// products must include Serviced or Returned in their name; unmarked products are New.
const routerStockType = name => /\breturned\b/i.test(name) ? 'RETURNED' : /\bserviced\b/i.test(name) ? 'SERVICED' : 'NEW';
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const nonnegative = (value, label) => {
  const n = Number(value);
  if (value === null || value === '' || !Number.isFinite(n) || n < 0) fail(`${label} must be zero or more`);
  return money(n);
};
const date = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value)) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) fail(`Select a valid ${label}`);
  return value;
};
const integer = (value, min, max, label) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(`Select a valid ${label}`);
  return n;
};
const subscriptionPeriod = (s, network) => {
  const start = date(s.start_date, 'start date');
  const end = date(s.end_date, 'end date');
  if (end < start) fail('End date cannot be before start date');
  const unit = s.period_unit, freeUnit = s.free_period_unit;
  if (!['MONTH','YEAR','DAYS'].includes(unit) || !['MONTH','YEAR','DAYS'].includes(freeUnit)) fail('Select valid period units');
  const value = integer(s.period_value, 1, unit === 'DAYS' ? 31 : 12, 'period');
  const free = integer(s.free_period_value, 0, freeUnit === 'DAYS' ? 31 : 12, 'free period');
  const d = new Date(`${start}T00:00:00Z`);
  const count = unit === 'YEAR' ? value * 12 : unit === 'DAYS' ? value / new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate() : value;
  return { start, end, unit, value, free, freeUnit, count,
    month: integer(s.month, 1, 12, 'subscription month'), year: integer(s.year, 2000, 2100, 'subscription year'),
    collectDate: date(s.collect_date, 'collected date') };
};
const routerCharges = (item, sellingPrice, admin) => {
  const qty = nonnegative(item.qty, 'Router quantity');
  if (!Number.isInteger(qty) || qty < 1) fail('Router quantity must be a positive whole number');
  if (!['CUSTOMER_PAID','FREE_USE'].includes(item.usage_category)) fail('Select a router category');
  if (item.usage_category === 'FREE_USE') return { qty, rate: 0, discount: 0, amount: 0 };
  const rate = nonnegative(admin ? item.rate : sellingPrice, 'Router rate');
  const gross = money(qty * rate), discount = nonnegative(item.discount ?? 0, 'Router discount');
  if (discount > gross) fail('Router discount cannot exceed its amount');
  return { qty, rate, discount, amount: money(gross - discount) };
};

async function saveEnrollment(req, res, deps) {
  const { db, ensureInternetSchema, isAdmin, resolveLoggedInEmployeeId, validateAddress, userId, subscriptionRenewal } = deps;
  try {
    await ensureInternetSchema(db);
    await ensureRouterIssues(db);
    await db.beginTransaction();
    const p = req.body || {}, admin = isAdmin(req), network = text(p.network_type).toUpperCase();
    const email = text(p.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('A valid email ID is required');
    if (!['KRISHI','RAILWIRE','DMNET'].includes(network) || !text(p.full_name) || !text(p.net_id) || !text(p.door_no) || !/^\d{10}$/.test(text(p.mobile_no))) fail('Network, name, Net ID, address and a valid mobile number are required');
    const loggedEmployee = await resolveLoggedInEmployeeId(db, req);
    const employee = admin ? Number(p.installed_by_employee_id) : loggedEmployee;
    if (!employee) fail('Select an installer mapped to an employee');
    const [[installer]] = await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1', [employee]);
    if (!installer) fail('Select an active installer');
    const installedDate = date(admin ? p.installed_date : new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10), 'installed date');
    const address = await validateAddress(db, p);
    if (!address) fail('Select a valid Postal Area, Location and Street mapping');
    const packages = (p.packages || []).filter(x => x.package_id), routers = (p.routers || []).filter(x => x.product_id), materials = (p.materials || []).filter(x => x.product_id || text(x.item_name));
    if (!packages.length) fail('Select at least one package');
    for (const [rows, key, label] of [[packages,'package_id','packages'],[routers,'product_id','routers'],[materials,'product_id','materials']]) {
      const ids = rows.map(x => x[key] ? Number(x[key]) : text(x.item_name).toLowerCase());
      if (new Set(ids).size !== ids.length) fail(`Duplicate ${label} are not allowed`);
    }
    const s = p.subscription || {}, period = subscriptionPeriod(s, network);
    const renewal = subscriptionRenewal(admin, s);
    const collector = admin ? Number(s.collected_by_employee_id) : loggedEmployee;
    if (!collector) fail('Collected By is required');
    const [[collectorRow]] = await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1', [collector]);
    if (!collectorRow) fail('Select an active collector');
    const reference = text(s.payment_reference), mappedEmployee = Number(s.payment_mapped_employee_id) || null;
    if (!reference || !mappedEmployee) fail('Payment reference and payment mapped employee are required');
    if (!admin && mappedEmployee !== loggedEmployee) fail('Payment mapped employee must be the logged-in employee');
    const [[mapped]] = await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1', [mappedEmployee]);
    if (!mapped) fail('Select an active payment mapped employee');
    const [[duplicate]] = await db.query('SELECT internet_customer_id FROM internet_customers WHERE net_id=? LIMIT 1', [text(p.net_id)]);
    if (duplicate) throw Object.assign(new Error('Net ID already exists'), { status: 409 });
    const approval = admin ? 'APPROVED' : 'PENDING';
    const [[next]] = await db.query('SELECT COALESCE(MAX(customer_code),2000)+1 next_code FROM internet_customers');
    const [created] = await db.query(`INSERT INTO internet_customers(customer_code,network_type,full_name,net_id,network_password,door_no,location_id,area_id,street_id,state,city,pincode,mobile_no,alternate_mobile_no,aadhaar_no,source_name,installed_by_employee_id,installed_date,status,created_by_user_id,email,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [next.next_code,network,text(p.full_name),text(p.net_id),text(p.network_password)||null,p.door_no,p.location_id,p.area_id,p.street_id,p.state||'Tamil Nadu',p.city||address.city,p.pincode||address.pincode,p.mobile_no,text(p.alternate_mobile_no)||null,text(p.aadhaar_no)||null,p.source_name||'Direct',employee,installedDate,'ACTIVE',userId(req),email,approval]);
    const customerId = created.insertId;
    let subscriptionTotal = 0;
    const selectedPackages = [];
    for (const item of packages) {
      const [[master]] = await db.query('SELECT price,provider_category FROM internet_package_master WHERE package_id=? AND is_active=1', [item.package_id]);
      if (!master || master.provider_category !== network) fail(`Select an active ${network} package`);
      const price = money(nonnegative(master.price, 'Package amount') * 1.18);
      const amount = Math.round(price * period.count);
      const [pkg] = await db.query('INSERT INTO internet_customer_packages(internet_customer_id,package_id,package_price,start_date,end_date,approval_status) VALUES(?,?,?,?,?,?)', [customerId,item.package_id,price,period.start,period.end,approval]);
      selectedPackages.push({ id: pkg.insertId, amount });
      subscriptionTotal += amount;
    }
    const subscriptionPaid = nonnegative(s.paid_amount, 'Subscription paid amount');
    if (subscriptionPaid > subscriptionTotal) fail('Subscription paid amount cannot exceed subscription amount');
    const status = subscriptionPaid >= subscriptionTotal ? 'PAID' : subscriptionPaid > 0 ? 'PARTIAL' : 'PENDING';
    if (String(s.payment_status).replace('UNPAID','PENDING') !== status) fail('Subscription payment status must match the paid amount');
    let remainingPaid = subscriptionPaid;
    for (const pkg of selectedPackages) {
      const paid = Math.min(remainingPaid, pkg.amount); remainingPaid -= paid;
      await db.query(`INSERT INTO internet_subscriptions(internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,billing_basis,period_value,period_count,free_period_value,free_period_unit,start_date,end_date,collect_date,collected_by_employee_id,renewed_by,payment_mode,payment_reference,payment_mapped_employee_id,amount,paid_amount,balance_amount,payment_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [customerId,pkg.id,period.month,period.year,period.unit,period.value,period.count,period.free,period.freeUnit,period.start,period.end,period.collectDate,collector,renewal.renewedBy,renewal.paymentMode,reference,mappedEmployee,pkg.amount,paid,money(pkg.amount-paid),paid>=pkg.amount?'PAID':paid>0?'PARTIAL':'PENDING',approval]);
    }
    let routerTotal = 0, routerDiscount = 0;
    for (const item of routers) {
      if (!['NEW','SERVICED','RETURNED'].includes(item.router_type)) fail('Select a router type');
      const issueId = Number(item.material_movement_id)||null;
      const [[stock]] = issueId ? await db.query(`SELECT p.product_name,p.hsn_code,p.unit,p.selling_price,
        m.qty AS available_qty FROM technician_material_movements m
        JOIN products p ON p.product_id=m.product_id JOIN categories c ON c.category_id=p.category_id
        WHERE m.material_movement_id=? AND m.employee_id=? AND m.product_id=?
        AND m.movement_type='SALE' AND m.sale_status='ISSUED' AND p.status='ACTIVE'
        AND ${routerProductSql} FOR UPDATE`,[issueId,employee,item.product_id]) : await db.query(`SELECT p.product_name,p.hsn_code,p.unit,p.selling_price,ts.available_qty FROM technician_material_stock ts JOIN products p ON p.product_id=ts.product_id JOIN categories c ON c.category_id=p.category_id WHERE ts.employee_id=? AND ts.product_id=? AND ts.available_qty>0 AND p.status='ACTIVE' AND ${routerProductSql} FOR UPDATE`, [employee,item.product_id]);
      if (!stock) fail('Select an issued router assigned to the installer');
      if(issueId) {
        const [adjustments]=await db.query('SELECT qty FROM technician_material_sale_adjustments WHERE material_movement_id=? FOR UPDATE',[issueId]);
        const [allocations]=await db.query(`SELECT ri.qty FROM internet_router_material_issues ri JOIN internet_customer_routers ir ON ir.internet_router_id=ri.internet_router_id WHERE ri.material_movement_id=? FOR UPDATE`,[issueId]);
        stock.available_qty=Number(stock.available_qty)-[...adjustments,...allocations].reduce((sum,r)=>sum+Number(r.qty),0);
      }
      if (routerStockType(stock.product_name) !== item.router_type) fail('Select an issued router matching the selected type');
      const charge = routerCharges(item, stock.selling_price, admin);
      if (charge.qty > Number(stock.available_qty)) fail('Router quantity exceeds issued stock');
      routerTotal = money(routerTotal + charge.amount); routerDiscount = money(routerDiscount + charge.discount);
      const [routerResult] = await db.query(`INSERT INTO internet_customer_routers(internet_customer_id,router_type,usage_category,product_id,hsn_code,qty,unit,rate,discount,amount,approval_status,stock_processed,updated_by_employee_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, [customerId,item.router_type,item.usage_category,item.product_id,stock.hsn_code,charge.qty,stock.unit||'PCS',charge.rate,charge.discount,charge.amount,approval,1,employee]);
      // Reserve issued inventory once at submission, as in the existing enrollment path.
      if(issueId) await db.query('INSERT INTO internet_router_material_issues(internet_router_id,material_movement_id,qty) VALUES(?,?,?)',[routerResult.insertId,issueId,charge.qty]);
      else await db.query('UPDATE technician_material_stock SET available_qty=available_qty-? WHERE employee_id=? AND product_id=?', [charge.qty,employee,item.product_id]);
    }
    const conn = p.connection || {};
    const connectionCharge = nonnegative(conn.connection_charge ?? 0, 'Connection charge'), connectionDiscount = nonnegative(conn.connection_discount ?? 0, 'Connection discount'), labor = nonnegative(conn.labour_service_charge ?? 0, 'Labor charge');
    if (connectionDiscount > connectionCharge) fail('Connection discount cannot exceed connection charge');
    await db.query(`INSERT INTO internet_connections(internet_customer_id,connection_date,connection_type,connection_charge,connection_discount,labour_service_charge,remarks,installed_by_employee_id,approval_status) VALUES(?,?,?,?,?,?,?,?,?)`, [customerId,date(conn.connection_date,'connection date'),conn.connection_type||'NEW',connectionCharge,connectionDiscount,labor,text(conn.remarks)||null,employee,approval]);
    let materialGross = 0, materialDiscount = 0;
    for (const item of materials) {
      let product;
      if (item.product_id) {
        [[product]] = await db.query("SELECT product_name,unit,selling_price FROM products WHERE product_id=? AND status='ACTIVE'", [item.product_id]);
        if (!product) fail('Select an active material');
      }
      const qty = nonnegative(item.qty,'Material quantity'); if (!qty) fail('Material quantity must be greater than zero');
      const rate = nonnegative(product && !admin ? product.selling_price : item.unit_rate, 'Material rate');
      const gross = money(qty*rate), discount = nonnegative(item.discount ?? 0, 'Material discount');
      if (discount > gross) fail('Material discount cannot exceed its amount');
      materialGross = money(materialGross+gross); materialDiscount = money(materialDiscount+discount);
      await db.query(`INSERT INTO internet_connection_materials(internet_customer_id,product_id,item_name,qty,unit,unit_rate,discount,amount) VALUES(?,?,?,?,?,?,?,?)`, [customerId,Number(item.product_id)||null,text(item.item_name)||product?.product_name||'Material',qty,product?.unit||item.unit||'PCS',rate,discount,money(gross-discount)]);
    }
    const overallDiscount = nonnegative(p.account?.overall_discount ?? 0, 'Overall discount');
    const subtotal = money(routerTotal+connectionCharge-connectionDiscount+labor+materialGross-materialDiscount+subscriptionTotal);
    if (overallDiscount > subtotal) fail('Overall discount cannot exceed the total');
    const grand = money(subtotal-overallDiscount), paid = nonnegative(p.account?.customer_paid_amount ?? subscriptionPaid, 'Customer paid amount');
    if (paid < subscriptionPaid || paid > grand) fail('Customer paid amount must include subscription payment and cannot exceed the total');
    const [account] = await db.query(`INSERT INTO internet_customer_accounts(internet_customer_id,account_source,router_amount,router_discount,connection_amount,labor_amount,material_cost,material_discount,subscription_amount,overall_discount,grand_total,customer_paid_amount,office_received_amount,office_balance_amount,balance_amount,account_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [customerId,'CONNECTION',routerTotal,routerDiscount,connectionCharge,labor,materialGross,materialDiscount,subscriptionTotal,overallDiscount,grand,paid,0,grand,money(grand-paid),'PENDING',approval]);
    for (const table of ['internet_subscriptions','internet_customer_routers','internet_connections','internet_connection_materials']) await db.query(`UPDATE ${table} SET initial_account_id=? WHERE internet_customer_id=? AND initial_account_id IS NULL`, [account.insertId,customerId]);
    if (!admin) await db.query(`INSERT INTO workflow_approvals(module_name,reference_id,reference_no,workflow_status,requested_by_employee_id,remarks) VALUES('INTERNET_CUSTOMER',?,?,'PENDING',?,'Internet customer approval')`, [customerId,String(customerId),loggedEmployee]);
    await db.commit();
    return res.status(201).json({ message: admin ? 'Internet customer saved successfully' : 'Internet customer sent for admin approval', internet_customer_id:customerId,approval_status:approval,account_status:'PENDING' });
  } catch (error) {
    try { await db.rollback(); } catch (_) {}
    return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : error.status || 500).json({ message:error.code === 'ER_DUP_ENTRY' ? 'Customer code or Net ID already exists; please retry' : error.message || 'Internet customer save failed' });
  }
}
module.exports = { saveEnrollment, subscriptionPeriod, routerCharges, routerStockType };
