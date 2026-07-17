const customerStatusForStbStatus = (status) => ({
  ACTIVE: 'ACTIVE', RETRIEVED: 'RETRIEVED', FAULT: 'FAULT', DISCONNECTED: 'DISCONNECTED',
  UPGRADE: 'UPGRADE', RETURNED: 'RETRIEVED', FAULTY: 'FAULT', REPLACED: 'ACTIVE'
}[String(status || '').toUpperCase()] || 'DISCONNECTED');

const synchronizeLatestCustomerStbStatus = async (db, customerIds = []) => {
  const ids = [...new Set((customerIds || []).map(Number).filter(Boolean))];
  const where = ids.length ? 'WHERE c.cable_customer_id IN (?)' : '';
  await db.query(
    `UPDATE cable_tv_customers c
     INNER JOIN (
       SELECT cable_customer_id, status
       FROM (
         SELECT stb.cable_customer_id, stb.status,
                ROW_NUMBER() OVER (
                  PARTITION BY stb.cable_customer_id
                  ORDER BY stb.customer_stb_id DESC,
                           COALESCE(stb.updated_date, stb.installed_date) DESC, stb.updated_at DESC
                ) AS row_no
         FROM cable_customer_stbs stb
         WHERE stb.approval_status = 'APPROVED'
       ) ranked_stb
       WHERE row_no = 1
     ) latest_stb ON latest_stb.cable_customer_id = c.cable_customer_id
     SET c.status = CASE UPPER(latest_stb.status)
       WHEN 'ACTIVE' THEN 'ACTIVE' WHEN 'RETRIEVED' THEN 'RETRIEVED'
       WHEN 'RETURNED' THEN 'RETRIEVED' WHEN 'FAULT' THEN 'FAULT'
       WHEN 'FAULTY' THEN 'FAULT' WHEN 'UPGRADE' THEN 'UPGRADE'
       WHEN 'REPLACED' THEN 'ACTIVE' ELSE 'DISCONNECTED' END
     ${where}`,
    ids.length ? [ids] : []
  );
};

const applyApprovedLocationChange = async (db, approvalGroupId) => {
  if (!Number(approvalGroupId)) return;
  await db.query(
    `UPDATE cable_tv_customers c
     INNER JOIN cable_connections conn ON conn.cable_customer_id = c.cable_customer_id
     INNER JOIN cable_locations location ON location.location_id = conn.new_location_id
     SET c.door_no = conn.new_door_no,
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

module.exports = { customerStatusForStbStatus, synchronizeLatestCustomerStbStatus, applyApprovedLocationChange };
