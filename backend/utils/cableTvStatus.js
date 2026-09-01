const customerStatusForStbStatus = (value) => {
  const status = String(value || '').trim().toUpperCase();
  if (['FAULT', 'FAULTY', 'DAMAGED', 'BROKEN', 'BURNT'].includes(status)) return 'FAULT';
  if (['RETRIEVED', 'RETURNED'].includes(status)) return 'RETRIEVED';
  if (['DISCONNECTED', 'VACATED', 'STB_LOST', 'OUTSTATION'].includes(status)) return 'DISCONNECTED';
  if (status === 'UPGRADE') return 'UPGRADE';
  return 'ACTIVE';
};

const synchronizeLatestCustomerStbStatus = async (db, customerIds = []) => {
  const ids = [...new Set((customerIds || []).map(Number).filter(Boolean))];
  const where = ids.length ? 'AND c.cable_customer_id IN (?)' : '';
  await db.query(
    `UPDATE cable_tv_customers c
     INNER JOIN cable_customer_stbs stb ON stb.customer_stb_id = (
       SELECT MAX(latest.customer_stb_id) FROM cable_customer_stbs latest
       WHERE latest.cable_customer_id = c.cable_customer_id AND latest.approval_status = 'APPROVED'
     )
     SET c.status = CASE
       WHEN UPPER(COALESCE(c.customer_type, 'REGULAR')) = 'FREE' THEN 'FREE'
       WHEN UPPER(COALESCE(c.customer_type, 'REGULAR')) = 'LEASE_LINE' THEN 'LEASE_LINE'
       WHEN UPPER(stb.status) IN ('FAULT','FAULTY','DAMAGED','BROKEN','BURNT') THEN 'FAULT'
       WHEN UPPER(stb.status) IN ('RETRIEVED','RETURNED') THEN 'RETRIEVED'
       WHEN UPPER(stb.status) IN ('DISCONNECTED','VACATED','STB_LOST','OUTSTATION') THEN 'DISCONNECTED'
       WHEN UPPER(stb.status) = 'UPGRADE' THEN 'UPGRADE'
       ELSE 'ACTIVE'
     END
     WHERE 1 = 1 ${where}`,
    ids.length ? [ids] : []
  );
};

const applyApprovedLocationChange = async (db, approvalGroupId) => {
  if (!Number(approvalGroupId)) return;
  await db.query(
    `UPDATE cable_tv_customers c
     INNER JOIN cable_connections conn ON conn.cable_customer_id = c.cable_customer_id
     INNER JOIN cable_locations location ON location.location_id = conn.new_location_id
     LEFT JOIN cable_network_master network ON network.network_id = conn.new_network_id
     SET c.door_no = conn.new_door_no,
         c.network_id = COALESCE(conn.new_network_id, c.network_id),
         c.network_type = COALESCE(
           CASE WHEN network.network_code = 'PAMMAL' THEN 'Pammal' ELSE network.network_code END,
           c.network_type
         ),
         c.location_id = conn.new_location_id,
         c.area_id = conn.new_area_id,
         c.street_id = conn.new_street_id,
         c.city = COALESCE(location.city, 'Chennai'),
         c.pincode = location.pincode,
         c.updated_at = NOW()
     WHERE conn.approval_group_id = ? AND conn.approval_status = 'APPROVED'
       AND conn.connection_type = 'SHIFTED'`,
    [approvalGroupId]
  );
};

// Repairs location changes approved before connection approval was separated
// from account receipt. The operation is intentionally customer-scoped and idempotent.
const reconcileApprovedLocationChanges = async (db, customerId) => {
  const cableCustomerId = Number(customerId);
  if (!cableCustomerId) return;

  const [rows] = await db.query(
    `SELECT DISTINCT conn.approval_group_id
     FROM cable_connections conn
     INNER JOIN cable_approval_groups approval
       ON approval.approval_group_id = conn.approval_group_id
     WHERE conn.cable_customer_id = ?
       AND conn.connection_type = 'SHIFTED'
       AND conn.approval_status = 'PENDING'
       AND approval.approval_status = 'APPROVED'`,
    [cableCustomerId]
  );

  for (const row of rows) {
    await db.query(
      `UPDATE cable_connections
       SET approval_status = 'APPROVED', updated_at = NOW()
       WHERE approval_group_id = ?
         AND cable_customer_id = ?
         AND connection_type = 'SHIFTED'
         AND approval_status = 'PENDING'`,
      [row.approval_group_id, cableCustomerId]
    );
    await applyApprovedLocationChange(db, row.approval_group_id);
  }
};

module.exports = {
  customerStatusForStbStatus,
  synchronizeLatestCustomerStbStatus,
  applyApprovedLocationChange,
  reconcileApprovedLocationChanges
};
