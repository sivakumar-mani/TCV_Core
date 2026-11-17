async function diagnose(connection, env = process.env, logger = console) {
  const groupId = String(env.CATV_WHATSAPP_GROUP_ID || '').trim();
  logger.log('WhatsApp notifications enabled:', env.CATV_WHATSAPP_ENABLED === 'true');
  logger.log('Configured group:', groupId || '(not configured)');
  logger.log('Done links enabled:', env.CATV_WHATSAPP_DONE_ENABLED === 'true');
  if (!groupId) return;
  const db = connection.promise();
  const [states] = await db.query(`SELECT group_id, start_after_id,
    DATE_FORMAT(activated_at, '%d-%m-%Y %H:%i:%s') AS activated_at
    FROM catv_whatsapp_state WHERE group_id = ?`, [groupId]);
  logger.log('Worker activation:');
  logger.table(states);
  const [deliveries] = await db.query(`SELECT status, COUNT(*) AS count,
    DATE_FORMAT(MAX(updated_at), '%d-%m-%Y %H:%i:%s') AS last_update
    FROM catv_whatsapp_delivery WHERE group_id = ? GROUP BY status`, [groupId]);
  logger.log('Delivery totals:');
  logger.table(deliveries);
  const [complaints] = await db.query(`SELECT c.complaint_id, c.complaint_no, c.complainant_type,
    DATE_FORMAT(c.registered_at, '%d-%m-%Y %H:%i:%s') AS registered_at,
    CASE WHEN s.group_id IS NULL THEN 'NOT_ACTIVATED'
      WHEN c.complaint_id <= s.start_after_id THEN 'BEFORE_ACTIVATION'
      ELSE COALESCE(d.status, 'NOT_QUEUED') END AS delivery_state,
    DATE_FORMAT(d.updated_at, '%d-%m-%Y %H:%i:%s') AS delivery_update
    FROM cable_tv_complaints c
    LEFT JOIN catv_whatsapp_state s ON s.group_id = ?
    LEFT JOIN catv_whatsapp_delivery d ON d.complaint_id = c.complaint_id AND d.group_id = ?
    ORDER BY c.complaint_id DESC LIMIT 10`, [groupId, groupId]);
  logger.log('Most recent complaints (no customer contact details):');
  logger.table(complaints);
  logger.log('Read-only check complete. This does not test the live browser connection or send any messages.');
}

module.exports = { diagnose };
if (require.main === module) {
  const connection = require('../connection');
  diagnose(connection).catch(error => {
    console.error('WhatsApp diagnostics failed:', error.code || 'UNKNOWN_ERROR');
    console.error('If a WhatsApp table is missing, check whether the worker started successfully.');
    process.exitCode = 1;
  }).finally(() => connection.end(() => {}));
}
