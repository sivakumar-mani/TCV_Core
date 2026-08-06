// STB condition/history is independent from the customer-level status.
const customerStatusForStbStatus = () => 'ACTIVE';

const synchronizeLatestCustomerStbStatus = async (db, customerIds = []) => {
  const ids = [...new Set((customerIds || []).map(Number).filter(Boolean))];
  const where = ids.length ? 'WHERE c.cable_customer_id IN (?)' : '';
  await db.query(
    `UPDATE cable_tv_customers c SET c.status = 'ACTIVE' ${where}`,
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

module.exports = { customerStatusForStbStatus, synchronizeLatestCustomerStbStatus, applyApprovedLocationChange };
