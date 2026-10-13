const nodemailer = require('nodemailer');
const { internetCustomerNumberSql } = require('./internetCustomerNumber');
const { ensureReminderLog } = require('./internetExpiryReminderLog');

module.exports = (connection, mailer = nodemailer, env = process.env) => {
  const sending = new Set();
  return async (req, res) => {
    const id = Number(req.params.customerId);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid customer ID' });
    if (sending.has(id)) return res.status(409).json({ message: 'This reminder is already being sent' });
    sending.add(id);
    let transport;
    let logId;
    let accepted = false;
    const db = connection.promise();
    try {
      const [[row]] = await db.query(`SELECT c.full_name, c.email,
        ${internetCustomerNumberSql('c')} AS customer_code,
        DATE_FORMAT(MAX(s.end_date), '%Y-%m-%d') AS expiry_date,
        DATEDIFF(MAX(s.end_date), CURDATE()) AS days_remaining
        FROM internet_customers c JOIN internet_subscriptions s ON s.internet_customer_id = c.internet_customer_id
        WHERE c.internet_customer_id = ? AND c.status = 'ACTIVE' AND c.approval_status = 'APPROVED'
          AND s.approval_status = 'APPROVED'
        GROUP BY c.internet_customer_id, c.full_name, c.email, c.customer_code, c.legacy_customer_no
        HAVING days_remaining BETWEEN 1 AND 30`, [id]);
      if (!row) return res.status(409).json({ message: 'This customer no longer has an expiry in the next 1–30 days. Refresh the dashboard.' });
      const email = String(row.email || '').trim();
      if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
        return res.status(400).json({ message: 'Register a valid customer email before sending a reminder' });
      }
      const date = new Date(`${row.expiry_date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      const remaining = `${row.days_remaining} ${Number(row.days_remaining) === 1 ? 'day' : 'days'} remaining`;
      const text = `Dear ${row.full_name},\n\nThis is a friendly reminder that your internet subscription is due to expire on ${date} (${remaining}).\n\nKindly renew your subscription before the expiry date to ensure uninterrupted internet service.\n\nIf you have already renewed your subscription, please ignore this reminder. If you face any issues while renewing your subscription, please contact TIME CABLE VISION for assistance.\n\nFor any queries, service-related complaints, or assistance, please contact us through our official WhatsApp and call numbers:\n\nSIVAKUMAR M\n📱 99625 43540\n📱 98845 43540\nEMAIL ID : timecablevision@gmail.com\n\nThank you for choosing TIME CABLE VISION. We appreciate your continued support.\n\nRegards,\nTIME CABLE VISION`;
      const subject = 'Internet subscription expiry reminder';
      const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><p><strong>Dear ${escape(row.full_name)},</strong></p><p>This is a friendly reminder that your internet subscription is due to expire on <strong>${escape(date)} (${escape(remaining)})</strong>.</p><p>Kindly renew your subscription before the expiry date to ensure uninterrupted internet service.</p><p>If you have already renewed your subscription, please ignore this reminder. If you face any issues while renewing your subscription, please contact <strong>TIME CABLE VISION</strong> for assistance.</p><p>For any queries, service-related complaints, or assistance, please contact us through our official WhatsApp and call numbers:</p><p>SIVAKUMAR M<br>📱 <strong>99625 43540</strong><br>📱 <strong>98845 43540</strong><br>EMAIL ID : timecablevision@gmail.com</p><p>Thank you for choosing <strong>TIME CABLE VISION</strong>. We appreciate your continued support.</p><p><strong>Regards,</strong><br><strong>TIME CABLE VISION</strong></p></div>`;
      if (req.method === 'GET') return res.json({ email, expiry_date: row.expiry_date, subject, text, html });
      if (req.body?.preview_email !== email || req.body?.preview_expiry !== row.expiry_date || req.body?.preview_text !== text) {
        return res.status(409).json({ message: 'Customer email or expiry changed. Refresh the dashboard before sending.' });
      }
      const sender = 'tcvadmin@timecablevision.in';
      const user = String(env.INVOICE_EMAIL_USER || sender).trim().toLowerCase();
      const pass = env.INVOICE_EMAIL_PASSWORD;
      const host = String(env.INVOICE_SMTP_HOST || 'server.timecablevision.in').trim();
      const port = Number(env.INVOICE_SMTP_PORT || 587);
      if (user !== sender || !pass || !host || ![587, 465].includes(port)) {
        return res.status(503).json({ message: 'Reminder email is not configured. Check the existing invoice SMTP settings.' });
      }
      await ensureReminderLog(db);
      const [log] = await db.query('INSERT INTO internet_expiry_reminder_log (internet_customer_id, expiry_date, recipient) VALUES (?, ?, ?)', [id, row.expiry_date, email]);
      logId = log.insertId;
      transport = mailer.createTransport({ host, port, secure: port === 465, requireTLS: true,
        auth: { user, pass }, connectionTimeout: 15000, socketTimeout: 30000 });
      const result = await transport.sendMail({ from: { name: 'TIME CABLE VISION', address: sender }, to: email,
        subject, text, html });
      if (!(result.accepted || []).some(address => String(address).toLowerCase() === email.toLowerCase())) {
        throw new Error('Recipient not accepted');
      }
      accepted = true;
      await db.query("UPDATE internet_expiry_reminder_log SET status = 'SENT', sent_at = NOW() WHERE reminder_id = ?", [logId]);
      const [[count]] = await db.query("SELECT COUNT(*) AS sent_count FROM internet_expiry_reminder_log WHERE internet_customer_id = ? AND expiry_date = ? AND status = 'SENT'", [id, row.expiry_date]);
      return res.json({ message: `Reminder email sent to ${email}`, sent_count: Number(count.sent_count) });
    } catch (error) {
      if (logId && !accepted) await db.query("UPDATE internet_expiry_reminder_log SET status = 'FAILED' WHERE reminder_id = ?", [logId]).catch(() => {});
      return res.status(502).json({ message: accepted ? 'Email was accepted by the mail server, but its sent count could not be confirmed. Refresh and check logs before resending.' : 'Unable to confirm reminder email delivery. Check mail-server logs before retrying.' });
    } finally {
      transport?.close?.();
      sending.delete(id);
    }
  };
};
