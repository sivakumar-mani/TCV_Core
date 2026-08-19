require('dotenv').config();
const connection = require('../connection');
const apply = process.argv.includes('--apply');
const db = connection.promise();
const q = async (sql, values = []) => (await db.query(sql, values))[0];
const clean = value => String(value ?? '').trim();
const nullable = value => clean(value) || null;
const money = value => Math.max(Number(value) || 0, 0);
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : '2026-09-01';
const phone = value => clean(value).replace(/\D/g, '').slice(-10) || '0000000000';
const aadhaar = value => { const result = clean(value).replace(/\D/g, ''); return result.length === 12 ? result : null; };
const network = (value, remarks = '') => {
  const isp = clean(value).toUpperCase();
  const history = clean(remarks).toUpperCase();
  if (/LIMRAS\s+(?:TO|2)\s+KRI?SHI/.test(history)) return 'KRISHI';
  if (isp.includes('RAIL')) return 'RAILWIRE';
  if (isp.includes('KRISH')) return 'KRISHI';
  return 'DMNET';
};
const status = value => clean(value).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';

async function ensureLegacyColumn() {
  const [[column]] = await db.query(`SELECT COUNT(*) count FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='internet_customers' AND column_name='legacy_customer_no'`);
  if (!column.count) await q('ALTER TABLE internet_customers ADD COLUMN legacy_customer_no VARCHAR(100) NULL AFTER customer_code, ADD INDEX idx_internet_legacy_customer_no (legacy_customer_no)');
}

async function ensureAddress(row) {
  const locationName = 'Legacy Internet';
  const city = /pammal/i.test(clean(row.net_address)) ? 'Pammal' : 'Chennai';
  await q(`INSERT INTO cable_locations(location_name,post_short_code,city,pincode)
    VALUES(?,NULL,?,NULL) ON DUPLICATE KEY UPDATE location_id=LAST_INSERT_ID(location_id)`, [locationName, city]);
  const [location] = await q('SELECT location_id FROM cable_locations WHERE location_name=? AND city=? LIMIT 1', [locationName, city]);
  let networkRow = (await q("SELECT network_id FROM cable_network_master WHERE network_code='TCV' LIMIT 1"))[0];
  if (!networkRow) {
    const result = await q("INSERT INTO cable_network_master(network_code,network_name,is_active) VALUES('TCV','TCV',1)");
    networkRow = { network_id: result.insertId };
  }
  await q(`INSERT INTO cable_areas(network_id,location_id,area_name) VALUES(?,?,'Legacy Internet')
    ON DUPLICATE KEY UPDATE area_id=LAST_INSERT_ID(area_id)`, [networkRow.network_id, location.location_id]);
  const [area] = await q("SELECT area_id FROM cable_areas WHERE network_id=? AND location_id=? AND area_name='Legacy Internet' LIMIT 1", [networkRow.network_id, location.location_id]);
  await q(`INSERT INTO cable_streets(area_id,street_name) VALUES(?,'Legacy Internet Address')
    ON DUPLICATE KEY UPDATE street_id=LAST_INSERT_ID(street_id)`, [area.area_id]);
  const [street] = await q("SELECT street_id FROM cable_streets WHERE area_id=? AND street_name='Legacy Internet Address' LIMIT 1", [area.area_id]);
  return { locationId: location.location_id, areaId: area.area_id, streetId: street.street_id, city };
}

async function ensurePackage(name, price, networkType) {
  const packageName = clean(name) || 'Legacy Internet Package';
  let row = (await q("SELECT package_id FROM cable_package_master WHERE service_category='INTERNET' AND package_name=? LIMIT 1", [packageName]))[0];
  if (row) return row.package_id;
  const result = await q(`INSERT INTO cable_package_master
    (package_name,package_type,service_category,internet_network_type,price,gst_percent,price_including_gst,is_active)
    VALUES(?,'MSO_PACKAGE','INTERNET',?,?,0,?,1)`, [packageName, networkType === 'DMNET' ? null : networkType, money(price), money(price)]);
  return result.insertId;
}

async function main() {
  const required = ['net_customers', 'net_package_changes'];
  for (const table of required) {
    const [[found]] = await db.query('SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema=? AND table_name=?', ['tcv_legacy_analysis', table]);
    if (!found.count) throw new Error(`Legacy source table ${table} is missing`);
  }
  const [[target]] = await db.query('SELECT COUNT(*) count FROM internet_customers');
  if (Number(target.count)) throw new Error(`Target internet_customers is not empty (${target.count}); migration aborted`);
  const customers = await q('SELECT * FROM tcv_legacy_analysis.net_customers ORDER BY net_cust_id');
  const packages = await q(`SELECT pc.* FROM tcv_legacy_analysis.net_package_changes pc
    JOIN (SELECT net_cust_id,MAX(net_pc_id) max_id FROM tcv_legacy_analysis.net_package_changes GROUP BY net_cust_id) latest
      ON latest.max_id=pc.net_pc_id`);
  const packageMap = new Map(packages.map(row => [Number(row.net_cust_id), row]));
  const summary = {
    mode: apply ? 'APPLY' : 'DRY_RUN', source_customers: customers.length,
    active_customers: customers.filter(row => status(row.net_cust_status) === 'ACTIVE').length,
    inactive_customers: customers.filter(row => status(row.net_cust_status) !== 'ACTIVE').length,
    by_network: customers.reduce((out, row) => {
      const networkType = network(row.net_isp, row.net_remarks);
      return { ...out, [networkType]: (out[networkType] || 0) + 1 };
    }, {})
  };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));
  await ensureLegacyColumn();
  await db.beginTransaction();
  try {
    let code = 2001;
    let subscriptions = 0;
    const usedNetIds = new Set();
    for (const row of customers) {
      const networkType = network(row.net_isp, row.net_remarks);
      const address = await ensureAddress(row);
      const originalNetId = clean(row.net_user_id) || `legacy-net-${row.net_cust_id}`;
      const normalizedNetId = originalNetId.toLowerCase();
      const netId = usedNetIds.has(normalizedNetId) ? `${originalNetId}-${row.net_cust_id}`.slice(0, 150) : originalNetId.slice(0, 150);
      usedNetIds.add(netId.toLowerCase());
      const result = await q(`INSERT INTO internet_customers
        (customer_code,legacy_customer_no,network_type,full_name,net_id,door_no,location_id,area_id,street_id,state,city,pincode,mobile_no,alternate_mobile_no,aadhaar_no,source_name,installed_date,status,approval_status,created_by_user_id)
        VALUES(?,?,?,?,?,?,?,?,?, 'Tamil Nadu',?,NULL,?,?,?,'Direct',?,?,'APPROVED',1)`,
        [code++, clean(row.net_cust_id), networkType, clean(row.net_name) || `Legacy Internet ${row.net_cust_id}`,
          netId, clean(row.net_address).slice(0, 50) || 'NA',
          address.locationId, address.areaId, address.streetId, address.city, phone(row.net_registered_mobile),
          nullable(row.net_alternate_mobile), aadhaar(row.net_aadhar), date(row.net_install_date), status(row.net_cust_status)]);
      const packageRow = packageMap.get(Number(row.net_cust_id));
      const packagePrice = money(packageRow?.net_package_price);
      const packageId = await ensurePackage(packageRow?.net_package_details, packagePrice, networkType);
      const customerPackage = await q(`INSERT INTO internet_customer_packages
        (internet_customer_id,package_id,package_price,start_date,end_date,is_active,approval_status)
        VALUES(?,?,?,'2026-09-01','2026-09-30',1,'APPROVED')`, [result.insertId, packageId, packagePrice]);
      if (status(row.net_cust_status) === 'ACTIVE') {
        await q(`INSERT INTO internet_subscriptions
          (internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,billing_basis,period_value,period_count,additional_months,additional_days,additional_years,free_period_value,free_period_unit,start_date,end_date,amount,paid_amount,balance_amount,payment_status,approval_status,payment_mode)
          VALUES(?,?,9,2026,'MONTH',1,1,0,0,0,0,'MONTH','2026-09-01','2026-09-30',?,0,?,'PENDING','APPROVED','DASHBOARD')`,
          [result.insertId, customerPackage.insertId, packagePrice, packagePrice]);
        subscriptions++;
      }
    }
    const [[inserted]] = await db.query('SELECT COUNT(*) count FROM internet_customers');
    if (Number(inserted.count) !== customers.length) throw new Error(`Count mismatch: source ${customers.length}, target ${inserted.count}`);
    await db.commit();
    console.log(JSON.stringify({ ...summary, inserted_customers: Number(inserted.count), inserted_subscriptions: subscriptions, customer_code_range: `2001-${2000 + customers.length}` }, null, 2));
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

main().then(() => db.end()).catch(async error => { console.error(error.stack || error); try { await db.rollback(); } catch (_) {} process.exit(1); });
