const { test } = require('node:test');
const assert = require('node:assert/strict');
const { config, createWorker, complaintMessage, startCatvWhatsAppNotifications } = require('../services/catvWhatsAppNotifications');

const groupId = '123456789@g.us';
function fixture({ ready = true, failSend = false, failDb = false, claim = 1, isGroup = true } = {}) {
  const queries = [], messages = [], errors = [];
  let status = 'QUEUED';
  const row = { complaint_id: 42, complaint_no: 'CMP-000042', full_name: 'Customer', customer_code: 'C123',
    mobile_no: '9999999999', customer_address: '1, Main Street', nature_of_complaint: 'No signal',
    complaint_subject: 'TV signal', reported_mobile: '8888888888', notes: 'Since morning', status: 'OPEN' };
  const db = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (failDb) throw new Error('DB unavailable');
    if (sql.startsWith('SELECT c.')) return [status === 'QUEUED' ? [row] : []];
    if (sql.includes("SET status = 'SENDING'")) { if (claim) status = 'SENDING'; return [{ affectedRows: claim }]; }
    if (sql.includes("SET status = 'SENT'")) status = 'SENT';
    if (sql.includes("SET status = 'REVIEW'")) status = 'REVIEW';
    return [{}];
  } };
  const transport = { isReady: () => ready, client: { getChatById: async id => {
    assert.equal(id, groupId);
    return { isGroup, isReadOnly: false, sendMessage: async message => {
      messages.push(message);
      if (failSend) throw new Error('Disconnected during send');
      return { id: { _serialized: 'message-42' } };
    } };
  } } };
  return { worker: createWorker({ promise: () => db }, transport, groupId, { error: error => errors.push(error) }),
    queries, messages, errors, status: () => status };
}

test('disabled by default and invalid destinations fail closed', () => {
  assert.equal(config({}).enabled, false);
  assert.throws(() => config({ CATV_WHATSAPP_ENABLED: 'true', CATV_WHATSAPP_GROUP_ID: 'TCV Support' }));
  assert.equal(config({ CATV_WHATSAPP_ENABLED: 'true', CATV_WHATSAPP_GROUP_ID: groupId }).groupId, groupId);
  assert.equal(typeof startCatvWhatsAppNotifications(null, {}), 'function');
});

test('activation persists a boundary instead of broadcasting old complaints', async () => {
  const f = fixture();
  await f.worker.setup();
  const boundary = f.queries.find(q => q.sql.includes('INSERT IGNORE INTO catv_whatsapp_state'));
  assert.match(boundary.sql, /MAX\(complaint_id\)/);
  assert.deepEqual(boundary.args, [groupId]);
  assert.equal(f.messages.length, 0);
});

test('queues only new CATV complaints, sends details and never resends completed delivery', async () => {
  const f = fixture();
  await f.worker.tick();
  await f.worker.tick();
  assert.equal(f.messages.length, 1);
  assert.match(f.queries[0].sql, /c.complainant_type = 'CATV' AND c.complaint_id > s.start_after_id/);
  assert.match(f.messages[0], /CMP-000042/);
  assert.match(f.messages[0], /Customer ID: C123/);
  assert.match(f.messages[0], /Address: 1, Main Street/);
  assert.match(f.messages[0], /Details: Since morning/);
  assert.equal(f.status(), 'SENT');
});

test('disconnected sessions retain queued complaints without claiming or sending', async () => {
  const f = fixture({ ready: false });
  await f.worker.tick();
  assert.equal(f.status(), 'QUEUED');
  assert.equal(f.messages.length, 0);
  assert(!f.queries.some(q => q.sql.includes("SET status = 'SENDING'")));
});

test('uncertain sends require review and are not automatically duplicated', async () => {
  const f = fixture({ failSend: true });
  await f.worker.tick();
  await f.worker.tick();
  assert.equal(f.status(), 'REVIEW');
  assert.equal(f.messages.length, 1);
  assert.equal(f.errors.length, 1);
});

test('another worker claiming the complaint prevents duplicate send', async () => {
  const f = fixture({ claim: 0 });
  await f.worker.tick();
  assert.equal(f.messages.length, 0);
});

test('database and group errors are contained without sending customer data', async () => {
  for (const options of [{ failDb: true }, { isGroup: false }]) {
    const f = fixture(options);
    await f.worker.tick();
    assert.equal(f.messages.length, 0);
    assert.equal(f.errors.length, 1);
  }
});

test('message formatting keeps customer fields on separate labelled lines', () => {
  assert.match(complaintMessage({ full_name: 'Name\nInjected line' }), /Customer: Name Injected line\nCustomer ID: -/);
});
