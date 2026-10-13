const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOperationalEmailWorker, sources } = require('../services/operationalEmailNotifications');

function fixture(failSend = false, configured = true) {
  const logs = new Map(), emails = [], queries = [];
  const db = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (sql.startsWith('SELECT activated_at')) return [[{ activated_at: '2026-10-13 00:00:00' }]];
    if (sql.startsWith('SELECT DISTINCT')) {
      assert.match(sql, /JOIN employees e ON e.employee_id = u.employee_id/);
      assert.match(sql, /u.is_active = 1 AND e.is_active = 1/);
      return [args[0].map(role => ({ email: `${role.toLowerCase()}@example.com` })).concat([{ email: 'invalid' }, { email: 'admin@example.com' }])];
    }
    if (sql.startsWith('SELECT ')) { assert.equal(args[0], '2026-10-13 00:00:00'); return [[{ id: 7, reference_no: 'TEST-7' }]]; }
    if (sql.startsWith('INSERT IGNORE INTO operational_email_log')) { if (!logs.has(args[0])) logs.set(args[0], 'QUEUED'); return [{}]; }
    if (sql.includes("SET status = 'SENDING'")) {
      const eligible = logs.get(args[0]) === 'QUEUED';
      if (eligible) logs.set(args[0], 'SENDING');
      return [{ affectedRows: eligible ? 1 : 0 }];
    }
    if (sql.includes("SET status = 'SENT'")) logs.set(args[0], 'SENT');
    if (sql.includes("SET status = 'UNCERTAIN'")) logs.set(args[0], 'UNCERTAIN');
    return [{}];
  } };
  const mailer = { createTransport: () => ({ sendMail: async mail => {
    emails.push(mail);
    if (failSend) throw new Error('Sensitive SMTP details');
    return { accepted: [mail.to] };
  }, close() {} }) };
  const errors = [];
  const worker = createOperationalEmailWorker({ promise: () => db }, mailer,
    { INVOICE_EMAIL_PASSWORD: configured ? 'test-only' : '' }, { error: value => errors.push(value) });
  return { worker, emails, logs, queries, errors };
}

test('new approval emails target admins; open complaints target admins, managers and senior managers', async () => {
  const f = fixture();
  await f.worker.tick();
  const approvals = f.emails.filter(mail => mail.subject !== 'New open complaint');
  assert.equal(approvals.length, 3);
  assert(approvals.every(mail => mail.to === 'admin@example.com'));
  const complaints = f.emails.filter(mail => mail.subject === 'New open complaint');
  assert.deepEqual(complaints.map(mail => mail.to).sort(), ['admin@example.com', 'manager@example.com', 'senior_manager@example.com']);
  assert(complaints.every(mail => mail.text.includes('TEST-7')));
  await f.worker.tick();
  assert.equal(f.emails.length, 6, 'Repeat scan must not send the same event again');
});

test('uncertain delivery is recorded and not automatically resent', async () => {
  const f = fixture(true);
  await f.worker.tick();
  assert([...f.logs.values()].every(status => status === 'UNCERTAIN'));
  await f.worker.tick();
  assert.equal(f.emails.length, 6);
  assert(!f.errors.some(message => message.includes('Sensitive')));
});

test('missing mail configuration sends nothing and keeps the worker available', async () => {
  const f = fixture(false, false);
  await f.worker.tick();
  await f.worker.tick();
  assert.equal(f.emails.length, 0);
  assert.equal(f.errors.length, 2);
  assert.deepEqual(sources.at(-1).roles, ['ADMIN', 'MANAGER', 'SENIOR_MANAGER']);
});
