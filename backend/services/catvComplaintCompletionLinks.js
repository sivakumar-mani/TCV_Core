const crypto = require('node:crypto');

function completionConfig(env = process.env) {
  if (env.CATV_WHATSAPP_DONE_ENABLED !== 'true') return null;
  const url = new URL(env.CATV_WHATSAPP_PUBLIC_URL || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('CATV_WHATSAPP_PUBLIC_URL must be an HTTPS API origin without a path');
  }
  return { origin: url.origin, hours: 72 };
}

async function ensureCompletionLinks(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS catv_whatsapp_completion_links (
    token_hash CHAR(64) PRIMARY KEY, complaint_id BIGINT NOT NULL, group_id VARCHAR(80) NOT NULL,
    expires_at DATETIME NOT NULL, used_at DATETIME NULL,
    UNIQUE KEY uk_catv_completion_group (complaint_id, group_id))`);
}

const tokenHash = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
  ? crypto.createHash('sha256').update(token).digest('hex') : null;

async function issueCompletionLink(db, complaintId, groupId, settings) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(`INSERT INTO catv_whatsapp_completion_links (token_hash, complaint_id, group_id, expires_at)
    VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))
    ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), used_at = NULL`,
  [tokenHash(token), complaintId, groupId, settings.hours]);
  // Fragments are not sent in HTTP requests or normal access logs/link previews.
  return `${settings.origin}/api/public/catv-complaints/done#${token}`;
}

function completionHandlers(connection, env = process.env) {
  const unavailable = res => res.status(410).json({ message: 'This link is expired, already used or no longer available. Please use the portal or contact your administrator.' });
  const enabled = () => !!completionConfig(env);
  const preview = async (req, res) => {
    try {
      if (!enabled()) return res.status(404).json({ message: 'Completion links are not enabled' });
      const hash = tokenHash(req.body?.token);
      if (!hash) return unavailable(res);
      const [[row]] = await connection.promise().query(`SELECT c.complaint_no, c.status
        FROM catv_whatsapp_completion_links l JOIN cable_tv_complaints c ON c.complaint_id = l.complaint_id
        WHERE l.token_hash = ? AND l.used_at IS NULL AND l.expires_at > UTC_TIMESTAMP()`, [hash]);
      if (!row) return unavailable(res);
      return res.json({ complaint_no: row.complaint_no, completed: row.status === 'COMPLETED' });
    } catch { return res.status(503).json({ message: 'Complaint confirmation is temporarily unavailable' }); }
  };
  const confirm = async (req, res) => {
    let db, started = false;
    try {
      if (!enabled()) return res.status(404).json({ message: 'Completion links are not enabled' });
      const hash = tokenHash(req.body?.token);
      if (!hash || req.body?.confirm !== true) return unavailable(res);
      db = connection.promise();
      await db.beginTransaction(); started = true;
      const [[link]] = await db.query(`SELECT complaint_id, group_id FROM catv_whatsapp_completion_links
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE`, [hash]);
      if (!link) { await db.rollback(); started = false; return unavailable(res); }
      const [[complaint]] = await db.query('SELECT complaint_id, complaint_no, status, complainant_type, assigned_employee_id FROM cable_tv_complaints WHERE complaint_id = ? FOR UPDATE', [link.complaint_id]);
      if (!complaint) {
        await db.rollback(); started = false; return unavailable(res);
      }
      if (complaint.status === 'COMPLETED') {
        await db.rollback(); started = false;
        return res.status(409).json({ message: 'This complaint is already complete. No changes were made.' });
      }
      const [[next]] = await db.query('SELECT COALESCE(MAX(attempt_no), 0) + 1 AS attempt_no FROM cable_tv_complaint_attempts WHERE complaint_id = ?', [link.complaint_id]);
      await db.query(`INSERT INTO cable_tv_complaint_attempts
        (complaint_id, attempt_no, status, assigned_employee_id, notes, entered_by_user_id, entered_by_employee_id)
        VALUES (?, ?, 'COMPLETED', ?, ?, NULL, NULL)`,
      [link.complaint_id, next.attempt_no, complaint.assigned_employee_id,
        `Completed via WhatsApp confirmation link; group ${link.group_id}. Employee identity was not verified.`]);
      await db.query("UPDATE cable_tv_complaints SET status = 'COMPLETED', completed_at = NOW() WHERE complaint_id = ?", [link.complaint_id]);
      await db.query('UPDATE catv_whatsapp_completion_links SET used_at = UTC_TIMESTAMP() WHERE token_hash = ?', [hash]);
      await db.commit(); started = false;
      return res.json({ message: `Complaint ${complaint.complaint_no} is now complete.` });
    } catch {
      if (started) await db.rollback().catch(() => {});
      return res.status(503).json({ message: 'Unable to confirm completion. Reload this link to check the status before retrying.' });
    }
  };
  return { preview, confirm };
}

module.exports = { completionConfig, ensureCompletionLinks, issueCompletionLink, tokenHash, completionHandlers };
