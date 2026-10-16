const { test } = require('node:test');
const assert = require('node:assert/strict');
const createHandler = require('../controller/internetExpiryReminder');

function fixture(failMail = false) {
  const queries = [], messages = [];
  const row = { full_name: 'Customer <Name>', customer_code: '123', email: 'saved@example.com', expiry_date: '2026-10-14', days_remaining: 1 };
  const db = { query: async sql => {
    queries.push(sql);
    if (sql.startsWith('SELECT c.')) return [[row]];
    if (sql.startsWith('INSERT')) return [{ insertId: 9 }];
    if (sql.startsWith('SELECT COUNT')) return [[{ sent_count: 2 }]];
    return [{}];
  } };
  const handler = createHandler({ promise: () => db }, { createTransport: () => ({
    sendMail: async message => { messages.push(message); if (failMail) throw new Error('SMTP failed'); return { accepted: [row.email] }; }, close() {}
  }) }, { INVOICE_EMAIL_PASSWORD: 'test-only' });
  const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  return { handler, queries, messages, response };
}

test('reminder preview personalizes saved customer details and never sends', async () => {
  const f = fixture(), res = f.response();
  await f.handler({ method: 'GET', params: { customerId: '7' } }, res);
  assert.equal(f.messages.length, 0);
  assert.equal(res.body.email, 'saved@example.com');
  assert.equal(res.body.subject, 'Internet subscription expiry reminder');
  assert.match(res.body.text, /14 October 2026 \(1 day remaining\)/);
  assert.match(res.body.text, /official WhatsApp and call numbers/);
  assert.match(res.body.text, /Dear CUSTOMER <NAME>,/);
  assert.match(res.body.html, /Dear CUSTOMER &lt;NAME&gt;,/);
});

for (const fail of [false, true]) test(`reminder ${fail ? 'failure does not increment' : 'success persists'} sent count`, async () => {
  const f = fixture(fail), preview = f.response();
  await f.handler({ method: 'GET', params: { customerId: '7' } }, preview);
  const res = f.response();
  await f.handler({ method: 'POST', params: { customerId: '7' }, body: {
    preview_email: preview.body.email, preview_expiry: preview.body.expiry_date, preview_text: preview.body.text
  } }, res);
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].to, 'saved@example.com');
  assert.equal(f.queries.some(sql => sql.includes("status = 'SENT',")), !fail);
  if (fail) assert.equal(res.code, 502);
  else assert.equal(res.body.sent_count, 2);
});
