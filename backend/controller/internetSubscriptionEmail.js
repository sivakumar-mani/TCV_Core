const nodemailer = require('nodemailer');
const sender = 'tcvadmin@timecablevision.in';
const smtpErrorMessage = error => {
  const code = String(error.code || '');
  // Return fixed messages only: SMTP responses can include account details.
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code) || /self.signed|certificate|unable to verify/i.test(error.message || '')) {
    return 'SMTP certificate verification failed. Ask MilesWeb to install a valid mail-server SSL certificate or provide its certified SMTP hostname, then update INVOICE_SMTP_HOST. The invoice was not sent.';
  }
  if (code === 'EAUTH') return 'SMTP login failed. Check INVOICE_EMAIL_USER and the MilesWeb mailbox password in INVOICE_EMAIL_PASSWORD, then restart the backend.';
  if (['EDNS', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(code)) return 'Cannot connect to the SMTP server. Check INVOICE_SMTP_HOST, INVOICE_SMTP_PORT and outbound SMTP access.';
  if (code === 'EENVELOPE') return 'The mail server rejected the sender or customer email address. Check the registered customer email and MilesWeb sending permissions.';
  return 'Unable to confirm invoice email delivery. Check the mail server delivery logs before retrying.';
};
const dateLabel = value => {
  if (value instanceof Date) return `${String(value.getDate()).padStart(2, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${value.getFullYear()}`;
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

module.exports = (connection, ensureSchema, mailer = nodemailer, env = process.env) => {
  const sending = new Set();
  async function details(req) {
    const db = connection.promise();
    await ensureSchema(db);
    const [[row]] = await db.query(`SELECT c.email, c.additional_emails, s.start_date, s.end_date
      FROM internet_subscriptions s JOIN internet_customers c ON c.internet_customer_id=s.internet_customer_id
      WHERE s.internet_subscription_id=? AND s.internet_customer_id=?`, [Number(req.params.subscriptionId), Number(req.params.id)]);
    if (!row) throw Object.assign(new Error('Internet subscription not found'), { status: 404 });
    const addresses = [String(row.email || '').trim(), ...String(row.additional_emails || '').split(/[,;]/).map(value => value.trim())].filter(Boolean);
    if (!addresses.length || addresses.length > 21 || addresses.some(value => value.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value))) throw Object.assign(new Error('Please register valid customer email addresses before sending the invoice'), { status: 400 });
    const to = [...new Map(addresses.map(value => [value.toLowerCase(), value])).values()].join(', ');
    const start = dateLabel(row.start_date), end = dateLabel(row.end_date);
    if (!start || !end) throw Object.assign(new Error('Subscription billing dates are required'), { status: 400 });
    const period = `${start} to ${end}`;
    return { from: sender, to, period, subject: `TIME CABLE VISION - Internet Invoice - ${period}`,
      text: `Dear Sir/Madam,\n\nGreetings from TIME CABLE VISION\n\nPlease find attached the invoice for the period ${period}.\n\nKindly review the attached invoice and let us know any queries.\n\nPlease feel free to contact us if you require any Complaints, clarification or additional information.\nCall us : 9962543540 / 9884543540\n\nThank you for your continued support and business.\n\nBest Regards,\nSivakumar M` };
  }
  return {
    preview: async (req, res) => {
      try { return res.json(await details(req)); }
      catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to prepare invoice email' }); }
    },
    send: async (req, res) => {
      const key = `${req.params.id}:${req.params.subscriptionId}`;
      if (sending.has(key)) return res.status(409).json({ message: 'This invoice email is already being sent' });
      sending.add(key);
      try {
        const email = await details(req);
        if (req.body?.preview_to !== email.to || req.body?.preview_period !== email.period) return res.status(409).json({ message: 'Customer email or billing period changed. Close and reopen the preview before sending.' });
        if (!req.file || req.file.mimetype !== 'application/pdf' || req.file.buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ message: 'A PDF invoice attachment is required' });
        const user = String(env.INVOICE_EMAIL_USER || sender).trim().toLowerCase();
        const pass = env.INVOICE_EMAIL_PASSWORD;
        const host = String(env.INVOICE_SMTP_HOST || 'server.timecablevision.in').trim();
        const port = Number(env.INVOICE_SMTP_PORT || 587);
        if (user !== sender || !pass) return res.status(503).json({ message: 'Invoice email is not configured. Set INVOICE_EMAIL_PASSWORD to the MilesWeb mailbox password for tcvadmin@timecablevision.in on the server.' });
        if (!host || ![587, 465].includes(port)) return res.status(503).json({ message: 'Configure INVOICE_SMTP_HOST and INVOICE_SMTP_PORT (587 for STARTTLS or 465 for SSL/TLS).' });
        const transport = mailer.createTransport({ host, port, secure: port === 465, requireTLS: true,
          auth: { user, pass }, connectionTimeout: 15000, socketTimeout: 30000 });
        const result = await transport.sendMail({ from: { name: 'TIME CABLE VISION', address: sender }, to: email.to,
          subject: email.subject, text: email.text,
          attachments: [{ filename: `Internet_Invoice_${Number(req.params.subscriptionId)}.pdf`, content: req.file.buffer, contentType: 'application/pdf' }] });
        const accepted = new Set((result.accepted || []).map(address => String(address).toLowerCase()));
        if (!email.to.split(', ').every(address => accepted.has(address.toLowerCase()))) throw new Error('Not all recipients accepted');
        return res.json({ message: `Invoice email sent successfully to ${email.to}` });
      } catch (error) {
        return res.status(error.status || 502).json({ message: error.status ? error.message : smtpErrorMessage(error) });
      } finally { sending.delete(key); }
    }
  };
};
