const invalid = message => Object.assign(new Error(message), { status: 400 });
function connectionDetails(payload, allowNew = false) {
  const type = String(payload.connection_type || '').toUpperCase();
  if (!(allowNew && type === 'NEW') && !['RECONNECTION', 'DISCONNECT', 'LOCATION_CHANGE'].includes(type)) throw invalid('Select Reactive, Disconnect or Location change');
  const value = (raw, name) => {
    const n = Number(raw ?? 0);
    if (!Number.isFinite(n) || n < 0) throw invalid(`${name} must be a non-negative number`);
    return Math.round(n * 100) / 100;
  };
  if (type === 'DISCONNECT') return { type, charge: 0, labor: 0, discount: 0, paid: 0, materials: [], material: 0, total: 0 };
  const materials = (Array.isArray(payload.materials) ? payload.materials : []).filter(x => x.product_id || String(x.item_name || '').trim()).map(x => {
    const qty = value(x.qty, 'Quantity'), rate = value(x.unit_rate, 'Rate');
    if (!qty || !String(x.item_name || '').trim()) throw invalid('Material item name and positive quantity are required');
    return { product_id: Number(x.product_id) || null, item_name: String(x.item_name).trim(), qty, unit: String(x.unit || 'PCS'), rate, amount: Math.round(qty * rate * 100) / 100 };
  });
  const charge = value(payload.connection_charge, 'Connection charge'), labor = value(payload.labour_service_charge, 'Labor charge');
  const discount = value(payload.overall_discount ?? payload.connection_discount, 'Discount');
  const material = Math.round(materials.reduce((n, x) => n + x.amount, 0) * 100) / 100;
  if (discount > charge + labor + material) throw invalid('Discount exceeds total charges');
  const total = Math.round((charge + labor + material - discount) * 100) / 100, paid = value(payload.customer_paid_amount, 'Customer paid');
  if (paid > total) throw invalid('Customer paid exceeds total');
  return { type, charge, labor, discount, material, materials, total, paid };
}
async function applyInternetConnection(db, customerId, row) {
  if(row.network_type)await db.query('UPDATE internet_customers SET network_type=? WHERE internet_customer_id=?',[row.network_type,customerId]);
  if (row.connection_type === 'LOCATION_CHANGE') {
    await db.query(`UPDATE internet_customers c JOIN cable_locations l ON l.location_id=?
      SET c.status='ACTIVE',c.door_no=?,c.location_id=l.location_id,c.area_id=?,c.street_id=?,
          c.city=l.city,c.pincode=l.pincode,c.updated_at=NOW() WHERE c.internet_customer_id=?`,
    [row.new_location_id,row.new_door_no,row.new_area_id,row.new_street_id,customerId]);
  } else if (['DISCONNECT','RECONNECTION'].includes(row.connection_type)) {
    await db.query('UPDATE internet_customers SET status=?,updated_at=NOW() WHERE internet_customer_id=?',
      [row.connection_type === 'DISCONNECT' ? 'INACTIVE' : 'ACTIVE', customerId]);
  }
}
async function validateConnectionNetwork(db, customerId, network) {
  if(!['KRISHI','RAILWIRE','DMNET'].includes(network))throw invalid('Select a valid Internet network');
  const [[conflict]]=await db.query(`SELECT cp.internet_customer_package_id FROM internet_customer_packages cp JOIN internet_package_master p ON p.package_id=cp.package_id WHERE cp.internet_customer_id=? AND cp.is_active=1 AND cp.approval_status<>'REJECTED' AND p.provider_category<>? LIMIT 1`,[customerId,network]);
  if(conflict)throw invalid('The selected network does not match the active package. Correct the package before changing network');
}
module.exports = { connectionDetails, applyInternetConnection, validateConnectionNetwork };
