const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { internetCustomerNumberSql } = require('../controller/internetCustomerNumber');

const sources = [
  { table: 'workflow_approvals', id: 'workflow_id', time: 'created_at', filter: "workflow_status = 'PENDING'", reference: 'reference_no', title: 'New workflow approval pending', roles: ['ADMIN'], path: '/workflow-approval' },
  { table: 'cable_approval_groups', id: 'approval_group_id', time: 'requested_at', filter: "approval_status = 'PENDING' AND group_type <> 'SUBSCRIPTION_UPDATE'", reference: 'approval_group_no', title: 'New CATV workflow approval pending', roles: ['ADMIN'], path: '/workflow-approval' },
  { table: 'purchase_master', id: 'purchase_id', time: 'created_at', filter: "approval_status = 'PENDING' AND purchase_status <> 'CANCELLED'", reference: 'purchase_no', title: 'New purchase approval pending', roles: ['ADMIN'], path: '/workflow-approval' },
  { table: 'cable_tv_complaints', id: 'complaint_id', time: 'created_at', filter: "status = 'OPEN'", reference: 'complaint_no', title: 'New open complaint', roles: ['ADMIN', 'MANAGER', 'SENIOR_MANAGER'], path: '/cable-tv/complaints' }
];

function notificationContent(source, event) {
  const complaint = source.table === 'cable_tv_complaints';
  const clean = value => String(value || '-').replace(/[\r\n]+/g, ' ').trim();
  const reference = clean(event.reference_no);
  const type = clean(event.event_type);
  const details = clean(event.details);
  const complaintDetails = complaint
    ? `\nCustomer / Caller: ${clean(event.customer_name)}\nCustomer Code: ${clean(event.customer_code)}\nAddress: ${clean(event.customer_address)}\nReported Mobile: ${clean(event.reported_mobile)}\nContact Number: ${clean(event.customer_mobile)}\nRegistered By: ${clean(event.registered_by_name)}`
    : '';
  return {
    subject: `${reference} - ${type} - ${details}`,
    text: `${complaint ? 'Complaint No' : 'Approval Reference No'}: ${reference}\nType: ${type}\n${complaint ? 'Registered Date & Time' : 'Requested Date & Time'}: ${clean(event.event_time)}\n${complaint ? 'Nature of Complaint' : 'Approval Details'}: ${details}${complaintDetails}\n\nPlease log in to the portal to review:\nhttps://timecablevision.in/tcverp\n\nTIME CABLE VISION`
  };
}

function createOperationalEmailWorker(connection, mailer = nodemailer, env = process.env, logger = console) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    let transport;
    try {
      const db = connection.promise();
      await db.query(`CREATE TABLE IF NOT EXISTS operational_email_state (
        state_id INT PRIMARY KEY, activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      await db.query('INSERT IGNORE INTO operational_email_state (state_id) VALUES (1)');
      await db.query(`CREATE TABLE IF NOT EXISTS operational_email_log (
        delivery_key CHAR(64) PRIMARY KEY, source_type VARCHAR(80) NOT NULL, source_id BIGINT NOT NULL,
        recipient VARCHAR(254) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
        attempts INT NOT NULL DEFAULT 0, sent_at DATETIME NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_operational_email_status (status, updated_at))`);
      const [[state]] = await db.query('SELECT activated_at FROM operational_email_state WHERE state_id = 1');
      const sender = 'tcvadmin@timecablevision.in';
      const user = String(env.INVOICE_EMAIL_USER || sender).trim().toLowerCase();
      const pass = env.INVOICE_EMAIL_PASSWORD;
      const host = String(env.INVOICE_SMTP_HOST || 'server.timecablevision.in').trim();
      const port = Number(env.INVOICE_SMTP_PORT || 587);
      if (user !== sender || !pass || !host || ![465, 587].includes(port)) {
        logger.error('Operational notification email is not configured; check invoice SMTP settings.');
        return;
      }
      transport = mailer.createTransport({ host, port, secure: port === 465, requireTLS: true,
        auth: { user, pass }, connectionTimeout: 15000, socketTimeout: 30000 });
      let sentThisTick = 0;
      for (const source of sources) {
        let events;
        try {
          const fields = {
            workflow_approvals: ['module_name', 'remarks', 'requested_at'],
            cable_approval_groups: ['group_type', 'remarks', 'requested_at'],
            purchase_master: ["'PURCHASE'", "'Purchase approval pending'", 'created_at'],
            cable_tv_complaints: ['complainant_type', 'nature_of_complaint', 'registered_at']
          };
          const [typeColumn, detailsColumn, timeColumn] = fields[source.table];
          if (source.table === 'cable_tv_complaints') {
            [events] = await db.query(`SELECT c.complaint_id AS id, c.complaint_no AS reference_no,
              c.complainant_type AS event_type, c.nature_of_complaint AS details,
              DATE_FORMAT(c.registered_at, '%d-%m-%Y, %h:%i %p') AS event_time,
              COALESCE(customer.full_name, internet_customer.full_name,
                NULLIF(TRIM(CONCAT_WS(' ', service_customer.salutation, service_customer.customer_name)), ''),
                NULLIF(TRIM(c.anonymous_name), ''), 'Anonymous') AS customer_name,
              COALESCE(CAST(customer.customer_code AS CHAR), ${internetCustomerNumberSql('internet_customer')},
                CAST(service_customer.customer_id AS CHAR)) AS customer_code,
              CASE WHEN c.cable_customer_id IS NOT NULL
                THEN CONCAT_WS(', ', customer.door_no, street.street_name, area.area_name, location.location_name, customer.city, customer.pincode)
                WHEN c.internet_customer_id IS NOT NULL
                THEN CONCAT_WS(', ', internet_customer.door_no, internet_street.street_name, internet_area.area_name, internet_location.location_name, internet_customer.city, internet_customer.pincode)
                WHEN c.service_customer_id IS NOT NULL
                THEN CONCAT_WS(', ', service_customer.address, service_customer.city_district, service_customer.state, service_customer.pincode)
                ELSE c.anonymous_address END AS customer_address,
              c.reported_mobile,
              COALESCE(NULLIF(TRIM(c.reported_mobile), ''), customer.mobile_no, internet_customer.mobile_no,
                service_customer.phone, c.anonymous_mobile) AS customer_mobile,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', registered.first_name, registered.last_name)), ''),
                registered.employee_code, registered_user.username) AS registered_by_name
              FROM cable_tv_complaints c
              LEFT JOIN cable_tv_customers customer ON customer.cable_customer_id = c.cable_customer_id
              LEFT JOIN cable_streets street ON street.street_id = customer.street_id
              LEFT JOIN cable_areas area ON area.area_id = customer.area_id
              LEFT JOIN cable_locations location ON location.location_id = customer.location_id
              LEFT JOIN internet_customers internet_customer ON internet_customer.internet_customer_id = c.internet_customer_id
              LEFT JOIN cable_streets internet_street ON internet_street.street_id = internet_customer.street_id
              LEFT JOIN cable_areas internet_area ON internet_area.area_id = internet_customer.area_id
              LEFT JOIN cable_locations internet_location ON internet_location.location_id = internet_customer.location_id
              LEFT JOIN customers service_customer ON service_customer.customer_id = c.service_customer_id
              LEFT JOIN employees registered ON registered.employee_id = c.registered_by_employee_id
              LEFT JOIN users registered_user ON registered_user.user_id = c.registered_by_user_id
              WHERE c.status = 'OPEN' AND c.created_at >= ? ORDER BY c.complaint_id`, [state.activated_at]);
          } else [events] = await db.query(`SELECT ${source.id} AS id, ${source.reference} AS reference_no,
            ${typeColumn} AS event_type, ${detailsColumn} AS details,
            DATE_FORMAT(${timeColumn}, '%d-%m-%Y, %h:%i %p') AS event_time FROM ${source.table}
            WHERE ${source.filter} AND ${source.time} >= ? ORDER BY ${source.id}`, [state.activated_at]);
        } catch (error) {
          if (error.code === 'ER_NO_SUCH_TABLE') continue;
          throw error;
        }
        const [users] = await db.query(`SELECT DISTINCT LOWER(TRIM(e.email)) AS email FROM users u
          JOIN employees e ON e.employee_id = u.employee_id
          WHERE u.is_active = 1 AND e.is_active = 1 AND UPPER(u.role) IN (?)`, [source.roles]);
        const recipients = [...new Set(users.map(row => row.email).filter(email =>
          email && email.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)))];
        for (const event of events) for (const email of recipients) {
          if (sentThisTick >= 50) return;
          const key = crypto.createHash('sha256').update(`${source.table}:${event.id}:${email}`).digest('hex');
          await db.query(`INSERT IGNORE INTO operational_email_log (delivery_key, source_type, source_id, recipient)
            VALUES (?, ?, ?, ?)`, [key, source.table, event.id, email]);
          const [claim] = await db.query(`UPDATE operational_email_log SET status = 'SENDING', attempts = attempts + 1
            WHERE delivery_key = ? AND (status = 'QUEUED' OR (status = 'FAILED' AND updated_at < NOW() - INTERVAL 5 MINUTE)) AND attempts < 3`, [key]);
          if (!claim.affectedRows) continue;
          sentThisTick++;
          try {
            const result = await transport.sendMail({ from: { name: 'TIME CABLE VISION', address: sender }, to: email,
              ...notificationContent(source, event) });
            if (!(result.accepted || []).some(value => String(value).toLowerCase() === email)) {
              await db.query("UPDATE operational_email_log SET status = 'FAILED' WHERE delivery_key = ?", [key]);
              continue;
            }
            await db.query("UPDATE operational_email_log SET status = 'SENT', sent_at = NOW() WHERE delivery_key = ?", [key]);
          } catch (_) {
            // Delivery may have happened before a connection failed. Do not auto-resend an ambiguous attempt.
            await db.query("UPDATE operational_email_log SET status = 'UNCERTAIN' WHERE delivery_key = ?", [key]);
            logger.error('Operational email delivery is uncertain; review mail-server logs before retrying.');
          }
        }
      }
    } catch (_) {
      logger.error('Operational email notification scan failed; application saves are unaffected.');
    } finally {
      transport?.close?.();
      running = false;
    }
  };
  return { tick };
}

function startOperationalEmailNotifications(connection) {
  const worker = createOperationalEmailWorker(connection);
  const timer = setInterval(() => worker.tick(), 30000);
  timer.unref();
  worker.tick();
  return () => clearInterval(timer);
}
module.exports = { createOperationalEmailWorker, startOperationalEmailNotifications, sources, notificationContent };
