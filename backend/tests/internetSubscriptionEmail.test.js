const { test } = require('node:test');
const assert = require('node:assert/strict');
const factory = require('../controller/internetSubscriptionEmail');
const sender = 'tcvadmin@timecablevision.in';
const row = { full_name: 'magnum customer', email: 'customer@example.com', start_date: '2026-10-01', end_date: '2026-10-31' };
function setup(record = row, env = { INVOICE_EMAIL_USER: sender, INVOICE_EMAIL_PASSWORD: 'test-only' }, failure = false, accepted = [record?.email]) {
  const sent = [], queries = [], transports = [];
  const handler = factory({ promise: () => ({ query: async (sql, params) => { queries.push({ sql, params }); return [record ? [record] : []]; } }) }, async () => {},
    { createTransport: options => { transports.push(options); return { sendMail: async mail => { sent.push(mail); if (failure) throw failure === true ? new Error('SMTP failure') : failure; return { accepted }; } }; } }, env);
  const req = { params: { id: 480, subscriptionId: 12 }, body: { preview_to: row.email, preview_period: '01-10-2026 to 31-10-2026', to: 'attacker@example.com' }, file: { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\npreview content') } };
  const res = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  return { handler, sent, queries, transports, req, res };
}
test('preview resolves customer email and actual period without sending', async () => {
  const s = setup(), res = s.res(); await s.handler.preview(s.req, res);
  assert.equal(res.code, 200); assert.equal(res.body.to, row.email); assert.equal(res.body.from, sender);
  assert.match(res.body.text, /period 01-10-2026 to 31-10-2026/);
  assert.match(res.body.text, /9962543540 \/ 9884543540/); assert.match(res.body.text, /Sivakumar M/);
  assert.equal(s.sent.length, 0); assert.deepEqual(s.queries[0].params, [12, 480]);
});
test('send uses registered recipient and attaches exact preview bytes', async () => {
  const s = setup(), res = s.res(); await s.handler.send(s.req, res);
  assert.equal(res.code, 200); assert.match(res.body.message, /sent successfully/);
  assert.equal(s.sent[0].to, row.email); assert.equal(s.sent[0].from.address, sender);
  assert.equal(s.sent[0].attachments[0].content, s.req.file.buffer);
  assert.equal(s.sent[0].attachments[0].filename, 'magnum_Invoice_Oct2026.pdf');
  assert.equal(s.queries.some(q => /UPDATE|INSERT|DELETE/.test(q.sql)), false);
});
test('missing customer, invalid email, stale preview, invalid PDF, wrong sender fail without sending', async () => {
  for (const [record, env, mutate, expected] of [
    [null, undefined, () => {}, 404], [{ ...row, email: '' }, undefined, () => {}, 400],
    [row, undefined, req => { req.body.preview_to = 'old@example.com'; }, 409],
    [row, undefined, req => { req.file.buffer = Buffer.from('not PDF'); }, 400],
    [row, { EMAIL: 'other@example.com', PASSWORD: 'test' }, () => {}, 503]
  ]) {
    const s = setup(record, env), res = s.res(); mutate(s.req); await s.handler.send(s.req, res);
    assert.equal(res.code, expected); assert.equal(s.sent.length, 0);
  }
});
test('SMTP failure produces error, never a success alert', async () => {
  const s = setup(row, undefined, true), res = s.res(); await s.handler.send(s.req, res);
  assert.equal(res.code, 502); assert.match(res.body.message, /delivery logs/);
});
test('concurrent duplicate send is rejected', async () => {
  const s = setup(), one = s.res(), two = s.res();
  await Promise.all([s.handler.send(s.req, one), s.handler.send(s.req, two)]);
  assert.equal(one.code, 200); assert.equal(two.code, 409); assert.equal(s.sent.length, 1);
});

test('MilesWeb uses STARTTLS on 587 and implicit TLS on 465 with dedicated credentials', async () => {
  for (const port of [587, 465]) {
    const s = setup(row, { INVOICE_EMAIL_PASSWORD: 'mailbox-test', INVOICE_SMTP_PORT: String(port), EMAIL: 'old@gmail.com', PASSWORD: 'old-test' });
    const res = s.res(); await s.handler.send(s.req, res);
    assert.equal(res.code, 200);
    const options = s.transports[0];
    assert.equal(options.host, 'server.timecablevision.in');
    assert.equal(options.port, port); assert.equal(options.secure, port === 465);
    assert.equal(options.requireTLS, true);
    assert.deepEqual(options.auth, { user: sender, pass: 'mailbox-test' });
    assert.equal(options.service, undefined);
  }
});

test('missing mailbox password and unsupported SMTP port do not create transport', async () => {
  for (const env of [{ EMAIL: sender, PASSWORD: 'unrelated-password' }, { INVOICE_EMAIL_PASSWORD: 'test', INVOICE_SMTP_PORT: '25' }]) {
    const s = setup(row, env), res = s.res(); await s.handler.send(s.req, res);
    assert.equal(res.code, 503); assert.equal(s.transports.length, 0);
  }
});

test('SMTP failures identify safe corrective action without exposing server responses', async () => {
  for (const [code, message, expected] of [
    ['ESOCKET', 'self-signed certificate secret-test', /certificate verification failed/],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'secret-test', /certified SMTP hostname/],
    ['EAUTH', 'secret-test', /SMTP login failed/],
    ['EDNS', 'secret-test', /Cannot connect/],
    ['EENVELOPE', 'secret-test', /rejected the sender/],
    ['ETIMEDOUT', 'secret-test', /delivery logs/]
  ]) {
    const s = setup(row, undefined, Object.assign(new Error(message), { code })), res = s.res();
    await s.handler.send(s.req, res);
    assert.equal(res.code, 502); assert.match(res.body.message, expected);
    assert.doesNotMatch(res.body.message, /secret-test/);
    assert.equal(s.transports[0].tls?.rejectUnauthorized, undefined);
  }
});

test('multiple saved recipients are previewed, deduplicated and all must be accepted', async () => {
  const record = { ...row, additional_emails: 'billing@example.com; CUSTOMER@example.com' };
  for (const [accepted, expected] of [[[row.email, 'billing@example.com'], 200], [[row.email], 502]]) {
    const s = setup(record, undefined, false, accepted), preview = s.res();
    await s.handler.preview(s.req, preview);
    assert.equal(preview.body.to, 'CUSTOMER@example.com, billing@example.com');
    s.req.body.preview_to = preview.body.to;
    const res = s.res(); await s.handler.send(s.req, res);
    assert.equal(res.code, expected);
    assert.equal(s.sent[0].to, preview.body.to);
  }
});

test('changed or invalid additional emails cannot be sent using an old preview', async () => {
  for (const [additional_emails, expected] of [['billing@example.com', 409], ['bad', 400], ['billing@example.com\r\nBcc: other@example.com', 400]]) {
    const s = setup({ ...row, additional_emails }), res = s.res();
    await s.handler.send(s.req, res);
    assert.equal(res.code, expected); assert.equal(s.sent.length, 0);
  }
});
