const path = require('node:path');

function config(env) {
  const enabled = env.CATV_WHATSAPP_ENABLED === 'true';
  const groupId = String(env.CATV_WHATSAPP_GROUP_ID || '').trim();
  if (enabled && !/^\d+(?:-\d+)?@g\.us$/.test(groupId)) {
    throw new Error('Set CATV_WHATSAPP_GROUP_ID to the group ID shown by npm run whatsapp:setup');
  }
  return { enabled, groupId };
}

function createWhatsAppClient(env = process.env, logger = console) {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'catv-complaints',
      dataPath: env.CATV_WHATSAPP_AUTH_PATH || path.join(__dirname, '..', '.wwebjs_auth') }),
    puppeteer: { headless: true,
      ...(env.CATV_WHATSAPP_CHROME_PATH ? { executablePath: env.CATV_WHATSAPP_CHROME_PATH } : {}) }
  });
  let ready = false;
  client.on('qr', qr => {
    logger.log('CATV WhatsApp: scan this QR in WhatsApp > Linked devices (keep this terminal private).');
    require('qrcode-terminal').generate(qr, { small: true });
  });
  client.on('ready', () => { ready = true; logger.log('CATV WhatsApp linked and ready.'); });
  client.on('disconnected', () => { ready = false; logger.error('CATV WhatsApp disconnected; restart the worker to reconnect.'); });
  client.on('auth_failure', () => { ready = false; logger.error('CATV WhatsApp authentication failed; relink using whatsapp:setup.'); });
  return { client, isReady: () => ready };
}

function complaintMessage(row) {
  const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim() || '-';
  return `*NEW CATV COMPLAINT*\nComplaint No: ${clean(row.complaint_no)}\nRegistered: ${clean(row.registered_time)}\nCustomer: ${clean(row.full_name)}\nCustomer ID: ${clean(row.customer_code)}\nContact: ${clean(row.mobile_no)}\nReported Mobile: ${clean(row.reported_mobile)}\nAddress: ${clean(row.customer_address)}\nSubject: ${clean(row.complaint_subject)}\nIssue: ${clean(row.nature_of_complaint)}\nDetails: ${clean(row.notes)}\nStatus: ${clean(row.status)}\n\nTIME CABLE VISION\nhttps://timecablevision.in/tcverp`;
}

function createWorker(connection, transport, groupId, logger = console) {
  const db = connection.promise();
  let running = false;
  async function setup() {
    await db.query(`CREATE TABLE IF NOT EXISTS catv_whatsapp_state (
      group_id VARCHAR(80) PRIMARY KEY, start_after_id BIGINT NOT NULL,
      activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS catv_whatsapp_delivery (
      group_id VARCHAR(80) NOT NULL, complaint_id BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', message_id VARCHAR(255) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, complaint_id), INDEX idx_catv_whatsapp_status (group_id, status))`);
    // First activation starts at the current complaint; never broadcast historical complaints.
    // The saved boundary is retained across restarts, including WhatsApp outages.
    await db.query(`INSERT IGNORE INTO catv_whatsapp_state (group_id, start_after_id)
      SELECT ?, COALESCE(MAX(complaint_id), 0) FROM cable_tv_complaints`, [groupId]);
  }
  async function tick() {
    if (running) return;
    running = true;
    try {
      await db.query(`INSERT IGNORE INTO catv_whatsapp_delivery (group_id, complaint_id)
        SELECT s.group_id, c.complaint_id FROM cable_tv_complaints c
        JOIN catv_whatsapp_state s ON s.group_id = ?
        WHERE c.complainant_type = 'CATV' AND c.complaint_id > s.start_after_id
          AND NOT EXISTS (SELECT 1 FROM catv_whatsapp_delivery d
            WHERE d.group_id = s.group_id AND d.complaint_id = c.complaint_id)`, [groupId]);
      if (!transport.isReady()) return;
      const chat = await transport.client.getChatById(groupId);
      if (!chat.isGroup || chat.isReadOnly) throw new Error('Configured destination is not a writable group');
      const [rows] = await db.query(`SELECT c.*, customer.full_name, customer.customer_code, customer.mobile_no,
        DATE_FORMAT(c.registered_at, '%d-%m-%Y %h:%i %p') AS registered_time,
        CONCAT_WS(', ', customer.door_no, street.street_name, area.area_name,
          location.location_name, customer.city, customer.pincode) AS customer_address,
        (SELECT a.notes FROM cable_tv_complaint_attempts a WHERE a.complaint_id = c.complaint_id
          AND a.attempt_no = 1 ORDER BY a.complaint_attempt_id LIMIT 1) AS notes
        FROM catv_whatsapp_delivery d
        JOIN cable_tv_complaints c ON c.complaint_id = d.complaint_id
        LEFT JOIN cable_tv_customers customer ON customer.cable_customer_id = c.cable_customer_id
        LEFT JOIN cable_streets street ON street.street_id = customer.street_id
        LEFT JOIN cable_areas area ON area.area_id = customer.area_id
        LEFT JOIN cable_locations location ON location.location_id = customer.location_id
        WHERE d.group_id = ? AND d.status = 'QUEUED' AND c.complainant_type = 'CATV'
        ORDER BY c.complaint_id LIMIT 10`, [groupId]);
      for (const row of rows) {
        if (!transport.isReady()) break;
        const [claim] = await db.query(`UPDATE catv_whatsapp_delivery SET status = 'SENDING'
          WHERE group_id = ? AND complaint_id = ? AND status = 'QUEUED'`, [groupId, row.complaint_id]);
        if (claim.affectedRows !== 1) continue;
        try {
          const sent = await chat.sendMessage(complaintMessage(row));
          if (!sent?.id?._serialized) throw new Error('Message acceptance unconfirmed');
          await db.query(`UPDATE catv_whatsapp_delivery SET status = 'SENT', message_id = ?
            WHERE group_id = ? AND complaint_id = ?`, [sent.id._serialized, groupId, row.complaint_id]);
        } catch {
          // A failed call can still have delivered: do not automatically send a duplicate.
          await db.query(`UPDATE catv_whatsapp_delivery SET status = 'REVIEW'
            WHERE group_id = ? AND complaint_id = ?`, [groupId, row.complaint_id]);
          logger.error(`CATV WhatsApp: complaint ${row.complaint_id} needs delivery review; check the group before retrying.`);
          break;
        }
      }
    } catch {
      logger.error('CATV WhatsApp worker unavailable; complaint registration is unaffected. Check database, group and linked-device status.');
    } finally { running = false; }
  }
  return { setup, tick };
}

function startCatvWhatsAppNotifications(connection, env = process.env, logger = console) {
  let settings;
  try { settings = config(env); } catch (error) { logger.error(error.message); return () => {}; }
  if (!settings.enabled) return () => {};
  let transport, timer, stopped = false;
  (async () => {
    try {
      transport = createWhatsAppClient(env, logger);
      const worker = createWorker(connection, transport, settings.groupId, logger);
      await worker.setup();
      if (stopped) return;
      timer = setInterval(() => { void worker.tick(); }, 5000);
      timer.unref?.();
      void worker.tick();
      await transport.client.initialize();
    } catch {
      clearInterval(timer);
      logger.error('CATV WhatsApp startup failed; check Chrome installation, session path and database. Complaint registration is unaffected.');
      await transport?.client.destroy().catch(() => {});
    }
  })();
  return () => { stopped = true; clearInterval(timer); void transport?.client.destroy().catch(() => {}); };
}

module.exports = { config, createWhatsAppClient, complaintMessage, createWorker, startCatvWhatsAppNotifications };
