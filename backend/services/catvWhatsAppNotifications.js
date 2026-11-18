const path = require('node:path');
const { internetCustomerNumberSql } = require('../controller/internetCustomerNumber');
const { completionConfig, ensureCompletionLinks, issueCompletionLink } = require('./catvComplaintCompletionLinks');
let manualWorker = null;
const deliveryError = (status, message) => Object.assign(new Error(message), { status });

async function sendComplaintManually(complaintId) {
  if (!Number.isSafeInteger(complaintId) || complaintId <= 0) throw deliveryError(400, 'Invalid complaint ID');
  if (!manualWorker) throw deliveryError(503, 'WhatsApp worker is unavailable. Check that notifications are enabled and restart the backend.');
  return manualWorker.tick(complaintId);
}

function config(env) {
  const enabled = env.CATV_WHATSAPP_ENABLED === 'true';
  const groupId = String(env.CATV_WHATSAPP_GROUP_ID || '').trim();
  if (enabled && !/^\d+(?:-\d+)?@g\.us$/.test(groupId)) {
    throw new Error('Set CATV_WHATSAPP_GROUP_ID to the group ID shown by npm run whatsapp:setup');
  }
  return { enabled, groupId };
}

function createWhatsAppClient(env = process.env, logger = console, { protocolTimeout } = {}) {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'catv-complaints',
      dataPath: env.CATV_WHATSAPP_AUTH_PATH || path.join(__dirname, '..', '.wwebjs_auth') }),
    puppeteer: { headless: true,
      ...(protocolTimeout ? { protocolTimeout } : {}),
      ...(env.CATV_WHATSAPP_CHROME_PATH ? { executablePath: env.CATV_WHATSAPP_CHROME_PATH } : {}) }
  });
  let ready = false;
  client.on('loading_screen', percent => {
    logger.log(`CATV WhatsApp loading: ${Number(percent) || 0}%.`);
  });
  client.on('authenticated', () => {
    logger.log('CATV WhatsApp authenticated; waiting for chats to finish loading.');
  });
  client.on('qr', qr => {
    logger.log('CATV WhatsApp: scan this QR in WhatsApp > Linked devices (keep this terminal private).');
    require('qrcode-terminal').generate(qr, { small: true });
  });
  client.on('ready', () => { ready = true; logger.log('CATV WhatsApp linked and ready.'); });
  client.on('disconnected', () => { ready = false; logger.error('CATV WhatsApp disconnected. Queued complaints will wait for reconnection.'); });
  client.on('auth_failure', () => { ready = false; logger.error('CATV WhatsApp authentication failed; relink using whatsapp:setup.'); });
  return { client, isReady: () => ready };
}

function complaintMessage(row, completionLink = '') {
  const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim() || '-';
  return `*NEW ${clean(row.complainant_type || 'CATV')} COMPLAINT*\nComplaint No: ${clean(row.complaint_no)}\nRegistered: ${clean(row.registered_time)}\nCustomer: ${clean(row.full_name)}\nCustomer ID: ${clean(row.customer_code)}\nContact: ${clean(row.mobile_no)}\nReported Mobile: ${clean(row.reported_mobile)}\nAddress: ${clean(row.customer_address)}\nSubject: ${clean(row.complaint_subject)}\nIssue: ${clean(row.nature_of_complaint)}\nDetails: ${clean(row.notes)}\nStatus: ${clean(row.status)}${completionLink ? `\n\n*MARK AS DONE*\n${completionLink}\nOpen the link and press Confirm Done. Valid for 72 hours.` : ''}`;
}

function createWorker(connection, transport, groupId, logger = console, env = process.env) {
  const db = connection.promise();
  const linkSettings = completionConfig(env);
  let running = false;
  async function setup() {
    if (linkSettings) await ensureCompletionLinks(db);
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
  async function tick(complaintId = null) {
    const manual = complaintId !== null;
    if (running) {
      if (manual) throw deliveryError(409, 'WhatsApp worker is busy. Please try again shortly.');
      return;
    }
    running = true;
    try {
      if (manual) {
        const [[complaint]] = await db.query('SELECT complainant_type FROM cable_tv_complaints WHERE complaint_id = ?', [complaintId]);
        if (!complaint) throw deliveryError(404, 'Complaint not found');
        await db.query('INSERT IGNORE INTO catv_whatsapp_delivery (group_id, complaint_id) VALUES (?, ?)', [groupId, complaintId]);
        const [[delivery]] = await db.query('SELECT status FROM catv_whatsapp_delivery WHERE group_id = ? AND complaint_id = ?', [groupId, complaintId]);
        if (delivery.status === 'SENT') return { message: 'This complaint was already sent to WhatsApp.' };
        if (delivery.status !== 'QUEUED') throw deliveryError(409, 'Delivery needs review. Check the WhatsApp group before retrying to avoid a duplicate.');
      } else await db.query(`INSERT IGNORE INTO catv_whatsapp_delivery (group_id, complaint_id)
        SELECT s.group_id, c.complaint_id FROM cable_tv_complaints c
        JOIN catv_whatsapp_state s ON s.group_id = ?
        WHERE c.complaint_id > s.start_after_id
          AND NOT EXISTS (SELECT 1 FROM catv_whatsapp_delivery d
            WHERE d.group_id = s.group_id AND d.complaint_id = c.complaint_id)`, [groupId]);
      if (!transport.isReady()) {
        if (manual) throw deliveryError(503, 'WhatsApp is connecting or reconnecting. The complaint remains queued and will send when connected. If a login QR is shown in backend logs, an administrator must link the device.');
        return;
      }
      const chat = await transport.client.getChatById(groupId);
      if (!chat.isGroup || chat.isReadOnly) throw new Error('Configured destination is not a writable group');
      const [rows] = await db.query(`SELECT c.*,
        COALESCE(customer.full_name, internet_customer.full_name,
          NULLIF(TRIM(CONCAT_WS(' ', service_customer.salutation, service_customer.customer_name)), ''), c.anonymous_name) AS full_name,
        COALESCE(CAST(customer.customer_code AS CHAR), ${internetCustomerNumberSql('internet_customer')}, CAST(service_customer.customer_id AS CHAR)) AS customer_code,
        COALESCE(customer.mobile_no, internet_customer.mobile_no, service_customer.phone, c.anonymous_mobile) AS mobile_no,
        DATE_FORMAT(c.registered_at, '%d-%m-%Y %h:%i %p') AS registered_time,
        CASE WHEN c.cable_customer_id IS NOT NULL
          THEN CONCAT_WS(', ', customer.door_no, street.street_name, area.area_name, location.location_name, customer.city, customer.pincode)
          WHEN c.internet_customer_id IS NOT NULL
          THEN CONCAT_WS(', ', internet_customer.door_no, internet_street.street_name, internet_area.area_name, internet_location.location_name, internet_customer.city, internet_customer.pincode)
          WHEN c.service_customer_id IS NOT NULL
          THEN CONCAT_WS(', ', service_customer.address, service_customer.city_district, service_customer.state, service_customer.pincode)
          ELSE c.anonymous_address END AS customer_address,
        (SELECT a.notes FROM cable_tv_complaint_attempts a WHERE a.complaint_id = c.complaint_id
          AND a.attempt_no = 1 ORDER BY a.complaint_attempt_id LIMIT 1) AS notes
        FROM catv_whatsapp_delivery d
        JOIN cable_tv_complaints c ON c.complaint_id = d.complaint_id
        LEFT JOIN cable_tv_customers customer ON customer.cable_customer_id = c.cable_customer_id
        LEFT JOIN cable_streets street ON street.street_id = customer.street_id
        LEFT JOIN cable_areas area ON area.area_id = customer.area_id
        LEFT JOIN cable_locations location ON location.location_id = customer.location_id
        LEFT JOIN internet_customers internet_customer ON internet_customer.internet_customer_id = c.internet_customer_id
        LEFT JOIN cable_streets internet_street ON internet_street.street_id = internet_customer.street_id
        LEFT JOIN cable_areas internet_area ON internet_area.area_id = internet_customer.area_id
        LEFT JOIN cable_locations internet_location ON internet_location.location_id = internet_customer.location_id
        LEFT JOIN customers service_customer ON service_customer.customer_id = c.service_customer_id
        WHERE d.group_id = ? AND d.status = 'QUEUED'
        ${manual ? 'AND c.complaint_id = ?' : ''}
        ORDER BY c.complaint_id LIMIT 10`, manual ? [groupId, complaintId] : [groupId]);
      for (const row of rows) {
        if (!transport.isReady()) {
          if (manual) throw deliveryError(503, 'WhatsApp disconnected. The complaint remains queued.');
          break;
        }
        const [claim] = await db.query(`UPDATE catv_whatsapp_delivery SET status = 'SENDING'
          WHERE group_id = ? AND complaint_id = ? AND status = 'QUEUED'`, [groupId, row.complaint_id]);
        if (claim.affectedRows !== 1) {
          if (manual) throw deliveryError(409, 'Another worker has claimed this notification. Please check the group.');
          continue;
        }
        let completionLink = '';
        if (linkSettings && row.status !== 'COMPLETED') {
          try { completionLink = await issueCompletionLink(db, row.complaint_id, groupId, linkSettings); }
          catch {
            await db.query("UPDATE catv_whatsapp_delivery SET status = 'QUEUED' WHERE group_id = ? AND complaint_id = ?", [groupId, row.complaint_id]);
            logger.error('CATV WhatsApp completion link could not be created; notification remains queued.');
            if (manual) throw deliveryError(503, 'Could not create the completion link. The complaint remains queued.');
            break;
          }
        }
        try {
          const sent = await chat.sendMessage(complaintMessage(row, completionLink));
          if (!sent?.id?._serialized) throw new Error('Message acceptance unconfirmed');
          await db.query(`UPDATE catv_whatsapp_delivery SET status = 'SENT', message_id = ?
            WHERE group_id = ? AND complaint_id = ?`, [sent.id._serialized, groupId, row.complaint_id]);
        } catch {
          // A failed call can still have delivered: do not automatically send a duplicate.
          await db.query(`UPDATE catv_whatsapp_delivery SET status = 'REVIEW'
            WHERE group_id = ? AND complaint_id = ?`, [groupId, row.complaint_id]);
          logger.error(`CATV WhatsApp: complaint ${row.complaint_id} needs delivery review; check the group before retrying.`);
          if (manual) throw deliveryError(409, 'Delivery could not be confirmed. Check the WhatsApp group before retrying.');
          break;
        }
      }
      if (manual) {
        if (!rows.length) throw deliveryError(409, 'The notification is no longer queued. Please check the group.');
        return { message: 'Complaint sent to the WhatsApp group.' };
      }
    } catch (error) {
      if (manual && !error.status) logger.error('CATV WhatsApp manual send unavailable:', error.code || error.name || 'UNKNOWN_ERROR');
      if (manual) throw error.status ? error : deliveryError(503, 'WhatsApp send failed. Check backend logs and the linked device before retrying.');
      logger.error('CATV WhatsApp worker unavailable; complaint registration is unaffected. Check database, group and linked-device status.');
    } finally { running = false; }
  }
  return { setup, tick };
}

function startCatvWhatsAppNotifications(connection, env = process.env, logger = console) {
  let settings;
  try { settings = config(env); } catch (error) { logger.error(error.message); return () => {}; }
  if (!settings.enabled) return () => {};
  let transport, timer, retryTimer, stopped = false, starting = false, disposing = false;
  let restartRequested = false, authRequired = false, retryDelay = 30000;
  function scheduleRestart() {
    if (stopped || authRequired) return;
    manualWorker = null;
    clearInterval(timer);
    if (starting) { restartRequested = true; return; }
    if (retryTimer) return;
    logger.log(`CATV WhatsApp reconnect scheduled in ${retryDelay / 1000} seconds.`);
    retryTimer = setTimeout(() => { retryTimer = null; void start(); }, retryDelay);
    retryTimer.unref?.();
    retryDelay = Math.min(retryDelay * 2, 300000);
  }
  async function dispose() {
    if (!transport) return;
    disposing = true;
    try { await transport.client.destroy(); transport = null; }
    finally { disposing = false; }
  }
  async function start() {
    if (stopped || starting) return;
    starting = true;
    restartRequested = false;
    let stage = 'browser cleanup';
    try {
      // Close the previous browser before opening another with the same profile.
      await dispose();
      if (stopped) return;
      stage = 'browser configuration';
      transport = createWhatsAppClient(env, logger);
      transport.client.on('disconnected', () => { if (!disposing) scheduleRestart(); });
      transport.client.on('auth_failure', () => {
        authRequired = true;
        clearTimeout(retryTimer); retryTimer = null;
        logger.error('CATV WhatsApp requires relinking; automatic reconnect is paused.');
      });
      transport.client.on('ready', () => { retryDelay = 30000; });
      stage = 'worker configuration';
      const worker = createWorker(connection, transport, settings.groupId, logger, env);
      stage = 'database setup';
      await worker.setup();
      if (stopped) return;
      manualWorker = worker;
      timer = setInterval(() => { void worker.tick(); }, 5000);
      timer.unref?.();
      void worker.tick();
      stage = 'browser initialization';
      logger.log('CATV WhatsApp starting browser; waiting for QR, authentication or ready.');
      await transport.client.initialize();
    } catch (error) {
      manualWorker = null;
      clearInterval(timer);
      logger.error('CATV WhatsApp startup failed; check Chrome installation, session path and database. Complaint registration is unaffected.');
      // Database messages can contain SQL or credentials; log only their error code.
      const detail = stage === 'database setup'
        ? error.code || error.name || 'UNKNOWN_ERROR'
        : String(error.message || error.code || error.name || 'UNKNOWN_ERROR').replace(/[\r\n]+/g, ' ');
      logger.error(`CATV WhatsApp startup failure (${stage}): ${detail}`);
      try { await dispose(); } catch { logger.error('CATV WhatsApp browser cleanup failed; will retry cleanup before reconnecting.'); }
      if (stage !== 'worker configuration') restartRequested = true;
    } finally {
      starting = false;
      if (stopped) { try { await dispose(); } catch {} }
      else if (restartRequested) scheduleRestart();
    }
  }
  void start();
  return () => {
    stopped = true; manualWorker = null;
    clearInterval(timer); clearTimeout(retryTimer);
    if (!starting) void dispose().catch(() => {});
  };
}

module.exports = { config, createWhatsAppClient, complaintMessage, createWorker, startCatvWhatsAppNotifications, sendComplaintManually };
