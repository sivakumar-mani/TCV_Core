const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOperationalEmailWorker, sources, notificationContent } = require('../services/operationalEmailNotifications');

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
    if (sql.startsWith('SELECT ')) { assert.equal(args[0], '2026-10-13 00:00:00'); return [[{ id: 7, reference_no: 'TEST-7', event_type: sql.includes('FROM cable_tv_complaints') ? 'NET' : 'APPROVAL', details: 'not working', event_time: '15-10-2026, 10:36 AM', customer_name: 'Test Caller', customer_code: 'C123', customer_mobile: '9876543210', registered_by_name: 'Test Employee' }]]; }
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
  const approvals = f.emails.filter(mail => !mail.subject.includes(' - NET - '));
  assert.equal(approvals.length, 3);
  assert(approvals.every(mail => mail.to === 'admin@example.com'));
  const complaints = f.emails.filter(mail => mail.subject.includes(' - NET - '));
  assert.deepEqual(complaints.map(mail => mail.to).sort(), ['admin@example.com', 'manager@example.com', 'senior_manager@example.com']);
  assert(complaints.every(mail => mail.text.includes('TEST-7')));
  assert(complaints.every(mail => mail.text.includes('Customer / Caller: Test Caller') && mail.text.includes('Registered By: Test Employee')));
  const complaintQuery = f.queries.find(q => q.sql.includes('FROM cable_tv_complaints'));
  for (const table of ['cable_tv_customers', 'internet_customers', 'customers', 'employees', 'users']) {
    assert(complaintQuery.sql.includes(`LEFT JOIN ${table} `));
  }
  assert.match(complaintQuery.sql, /COALESCE\(NULLIF\(TRIM\(c.reported_mobile\)/);
  assert.match(complaintQuery.sql, /c.anonymous_name/);
  assert.match(complaintQuery.sql, /c.anonymous_mobile/);
  assert.match(complaintQuery.sql, /registered_user.username/);
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

test('complaint email uses complaint number, type, nature and registered timestamp', () => {
  const content = notificationContent(sources.at(-1), { reference_no: 'CMP-000195', event_type: 'NET', details: 'not working', event_time: '15-10-2026, 10:36 AM' });
  assert.equal(content.subject, 'CMP-000195 - NET - not working');
  assert.match(content.text, /Complaint No: CMP-000195/);
  assert.match(content.text, /Registered Date & Time: 15-10-2026, 10:36 AM/);
  assert.match(content.text, /Nature of Complaint: not working/);
  assert.match(content.text, /https:\/\/timecablevision.in\/tcverp/);
});

test('approval email uses its own reference, module and remarks without subject line breaks', () => {
  const content = notificationContent(sources[0], { reference_no: 'WO-123', event_type: 'WORK_ORDER', details: 'Material approval\r\nrequired', event_time: '15-10-2026, 10:36 AM' });
  assert.equal(content.subject, 'WO-123 - WORK_ORDER - Material approval required');
  assert.match(content.text, /Approval Reference No: WO-123/);
  assert.match(content.text, /Requested Date & Time: 15-10-2026, 10:36 AM/);
  assert.match(content.text, /Approval Details: Material approval required/);
});

test('complaint email includes caller contact and registrar details without changing subject', () => {
  const content = notificationContent(sources.at(-1), {
    reference_no: 'CMP-1', event_type: 'ANONYMOUS', details: 'Signal issue',
    customer_name: 'Caller\r\nName', customer_mobile: '9876543210', registered_by_name: 'Staff One'
  });
  assert.equal(content.subject, 'CMP-1 - ANONYMOUS - Signal issue');
  assert.match(content.text, /Customer \/ Caller: Caller Name/);
  assert.match(content.text, /Customer Code: -/);
  assert.match(content.text, /Contact Number: 9876543210/);
  assert.match(content.text, /Registered By: Staff One/);
});

test('missing complaint details use placeholders and approval emails omit complaint fields', () => {
  const complaint = notificationContent(sources.at(-1), {});
  assert.match(complaint.text, /Customer \/ Caller: -/);
  assert.match(complaint.text, /Registered By: -/);
  const approval = notificationContent(sources[0], { customer_name: 'Ignored', registered_by_name: 'Ignored' });
  assert.doesNotMatch(approval.text, /Customer \/ Caller|Customer Code|Contact Number|Registered By/);
});

test('complaint email includes the customer address and separate reported mobile from the complaint screen', () => {
  const content = notificationContent(sources.at(-1), {
    customer_code: '5163', customer_name: 'Unimon Kshemendran',
    customer_address: '43 1st Floor, 4th Street, Ranga Nagar, Chromepet, Chennai, 600044',
    reported_mobile: '8508107352', customer_mobile: '8508107352'
  });
  assert.match(content.text, /Customer Code: 5163/);
  assert.match(content.text, /Customer \/ Caller: Unimon Kshemendran/);
  assert.match(content.text, /Address: 43 1st Floor, 4th Street, Ranga Nagar, Chromepet, Chennai, 600044/);
  assert.match(content.text, /Reported Mobile: 8508107352/);
  const missing = notificationContent(sources.at(-1), {});
  assert.match(missing.text, /Address: -/);
  assert.match(missing.text, /Reported Mobile: -/);
  assert.doesNotMatch(notificationContent(sources[0], {}).text, /Address:|Reported Mobile:/);
});
