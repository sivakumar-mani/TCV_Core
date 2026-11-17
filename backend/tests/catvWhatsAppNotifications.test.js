const { test } = require('node:test');
const assert = require('node:assert/strict');
const { config, createWorker, complaintMessage, startCatvWhatsAppNotifications } = require('../services/catvWhatsAppNotifications');

const groupId = '123456789@g.us';
function fixture({ ready = true, failSend = false, failDb = false, claim = 1, isGroup = true, env = {}, rowStatus = 'OPEN', failLink = false, complaintType = 'CATV', missing = false } = {}) {
  const queries = [], messages = [], errors = [];
  let status = 'QUEUED';
  const row = { complaint_id: 42, complaint_no: 'CMP-000042', full_name: 'Customer', customer_code: 'C123',
    mobile_no: '9999999999', customer_address: '1, Main Street', nature_of_complaint: 'No signal',
    complaint_subject: 'TV signal', reported_mobile: '8888888888', notes: 'Since morning', status: rowStatus };
  const db = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (failDb) throw new Error('DB unavailable');
    if (sql.startsWith('SELECT complainant_type')) return [missing ? [] : [{ complainant_type: complaintType }]];
    if (sql.startsWith('SELECT status')) return [[{ status }]];
    if (failLink && sql.startsWith('INSERT INTO catv_whatsapp_completion_links')) throw new Error('Link insert failed');
    if (sql.startsWith('SELECT c.')) return [status === 'QUEUED' ? [row] : []];
    if (sql.includes("SET status = 'SENDING'")) { if (claim) status = 'SENDING'; return [{ affectedRows: claim }]; }
    if (sql.includes("SET status = 'SENT'")) status = 'SENT';
    if (sql.includes("SET status = 'REVIEW'")) status = 'REVIEW';
    if (sql.includes("SET status = 'QUEUED'")) status = 'QUEUED';
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
  return { worker: createWorker({ promise: () => db }, transport, groupId, { error: error => errors.push(error) }, env),
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

const completionEnv = { CATV_WHATSAPP_DONE_ENABLED: 'true', CATV_WHATSAPP_PUBLIC_URL: 'https://api.example.com' };
test('enabled worker includes a complaint-specific completion link after saving its hash', async () => {
  const f = fixture({ env: completionEnv });
  await f.worker.setup();
  await f.worker.tick();
  assert.equal(f.messages.length, 1);
  assert.match(f.messages[0], /\*MARK AS DONE\*/);
  assert.match(f.messages[0], /https:\/\/api\.example\.com\/api\/public\/catv-complaints\/done#[a-f0-9]{64}/);
  const insert = f.queries.find(q => q.sql.startsWith('INSERT INTO catv_whatsapp_completion_links'));
  assert.equal(insert.args[1], 42);
  assert.equal(insert.args[2], groupId);
  assert.equal(f.status(), 'SENT');
});
test('already completed queued complaints have no new completion link', async () => {
  const f = fixture({ env: completionEnv, rowStatus: 'COMPLETED' });
  await f.worker.tick();
  assert.equal(f.messages.length, 1);
  assert.doesNotMatch(f.messages[0], /MARK AS DONE/);
  assert(!f.queries.some(q => q.sql.startsWith('INSERT INTO catv_whatsapp_completion_links')));
});
test('link creation failure retains a queued notification without sending or marking it delivered', async () => {
  const f = fixture({ env: completionEnv, failLink: true });
  await f.worker.tick();
  assert.equal(f.messages.length, 0);
  assert.equal(f.status(), 'QUEUED');
  assert.equal(f.errors.length, 1);
});

test('manual send targets one complaint and does not resend a sent notification', async () => {
  const f = fixture();
  assert.match((await f.worker.tick(42)).message, /sent/);
  assert.match((await f.worker.tick(42)).message, /already sent/);
  assert.equal(f.messages.length, 1);
  const select = f.queries.find(q => q.sql.startsWith('SELECT c.'));
  assert.match(select.sql, /AND c.complaint_id = \?/);
  assert.deepEqual(select.args, [groupId, 42]);
});

test('manual disconnected send reports failure and preserves the queue', async () => {
  const f = fixture({ ready: false });
  await assert.rejects(f.worker.tick(42), { status: 503 });
  assert.equal(f.status(), 'QUEUED');
  assert.equal(f.messages.length, 0);
});

test('manual send rejects missing and non-CATV complaints before queuing', async () => {
  for (const [options, status] of [[{ missing: true }, 404], [{ complaintType: 'NET' }, 400]]) {
    const f = fixture(options);
    await assert.rejects(f.worker.tick(42), { status });
    assert(!f.queries.some(q => q.sql.startsWith('INSERT')));
    assert.equal(f.messages.length, 0);
  }
});

test('manual uncertain delivery remains in review and cannot be retried', async () => {
  const f = fixture({ failSend: true });
  await assert.rejects(f.worker.tick(42), { status: 409 });
  await assert.rejects(f.worker.tick(42), { status: 409 });
  assert.equal(f.status(), 'REVIEW');
  assert.equal(f.messages.length, 1);
});

test('manual link failure stays queued and competing claim never sends', async () => {
  const f = fixture({ env: completionEnv, failLink: true });
  await assert.rejects(f.worker.tick(42), { status: 503 });
  assert.equal(f.status(), 'QUEUED');
  assert.equal(f.messages.length, 0);
  const competing = fixture({ claim: 0 });
  await assert.rejects(competing.worker.tick(42), { status: 409 });
  assert.equal(competing.messages.length, 0);
});
