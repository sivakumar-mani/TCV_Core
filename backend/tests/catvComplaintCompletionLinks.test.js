const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { completionConfig, issueCompletionLink, tokenHash, completionHandlers } = require('../services/catvComplaintCompletionLinks');
const { createCompletionRouter } = require('../routes/catvComplaintCompletionRouter');
const env = { CATV_WHATSAPP_DONE_ENABLED: 'true', CATV_WHATSAPP_PUBLIC_URL: 'https://api.example.com' };
const token = 'a'.repeat(64);

function fixture({ expired = false, status = 'OPEN', type = 'CATV', fail = false } = {}) {
  const queries = [];
  let used = false, committed = 0, rolledBack = 0, history = 0;
  const db = {
    beginTransaction: async () => {}, commit: async () => { committed++; }, rollback: async () => { rolledBack++; },
    query: async (sql, args) => {
      queries.push({ sql, args });
      if (sql.includes('FROM catv_whatsapp_completion_links')) {
        assert.equal(args[0], tokenHash(token));
        if (expired || used) return [[]];
        return [[sql.includes('JOIN cable_tv_complaints') ? { complaint_no: 'CMP-42', status } : { complaint_id: 42, group_id: '123@g.us' }]];
      }
      if (sql.includes('FROM cable_tv_complaints')) return [[{ complaint_id: 42, complaint_no: 'CMP-42', status, complainant_type: type, assigned_employee_id: 9 }]];
      if (sql.includes('AS attempt_no')) return [[{ attempt_no: 2 }]];
      if (sql.startsWith('INSERT')) history++;
      if (sql.startsWith('UPDATE catv_whatsapp_completion_links')) {
        if (fail) throw new Error('DB failure');
        used = true;
      }
      return [{}];
    }
  };
  const handlers = completionHandlers({ promise: () => db }, env);
  const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  return { handlers, queries, response, state: () => ({ used, committed, rolledBack, history }) };
}

test('completion links are opt-in and only accept an explicit HTTPS origin', () => {
  assert.equal(completionConfig({}), null);
  for (const url of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com/?x=1']) {
    assert.throws(() => completionConfig({ ...env, CATV_WHATSAPP_PUBLIC_URL: url }));
  }
  assert.equal(completionConfig(env).hours, 72);
});

test('link issuance stores only a hash and sends the random secret in the fragment', async () => {
  let values;
  const link = await issueCompletionLink({ query: async (_sql, args) => { values = args; } }, 42, '123@g.us', completionConfig(env));
  const url = new URL(link), secret = url.hash.slice(1);
  assert.equal(url.origin, 'https://api.example.com');
  assert.equal(url.pathname, '/api/public/catv-complaints/done');
  assert.equal(secret.length, 64);
  assert.equal(values[0], tokenHash(secret));
  assert.notEqual(values[0], secret);
  assert.deepEqual(values.slice(1), [42, '123@g.us', 72]);
});

test('preview reveals only the complaint number and completion state without mutations', async () => {
  const f = fixture(), res = f.response();
  await f.handlers.preview({ body: { token } }, res);
  assert.deepEqual(res.body, { complaint_no: 'CMP-42', completed: false });
  assert(f.queries.every(q => q.sql.startsWith('SELECT')));
  assert.equal(f.state().committed, 0);
});

test('explicit confirmation completes the token-bound complaint and audits the unverified identity', async () => {
  const f = fixture(), res = f.response();
  await f.handlers.confirm({ body: { token, confirm: true, complaint_id: 999 } }, res);
  assert.equal(res.code, 200);
  assert.equal(f.state().committed, 1);
  assert.equal(f.state().used, true);
  const history = f.queries.find(q => q.sql.startsWith('INSERT'));
  assert.deepEqual(history.args.slice(0, 3), [42, 2, 9]);
  assert.match(history.args[3], /Employee identity was not verified/);
  assert.match(history.sql, /NULL, NULL/);
  assert(f.queries.filter(q => q.sql.includes('FOR UPDATE')).length >= 2);
  const update = f.queries.find(q => q.sql.startsWith('UPDATE cable_tv_complaints'));
  assert.deepEqual(update.args, [42]);
});

test('replay, expired and forged tokens cannot create completion history', async () => {
  const f = fixture();
  await f.handlers.confirm({ body: { token, confirm: true } }, f.response());
  const replay = f.response();
  await f.handlers.confirm({ body: { token, confirm: true } }, replay);
  assert.equal(replay.code, 410);
  assert.equal(f.state().history, 1);
  const expired = fixture({ expired: true }), res = expired.response();
  await expired.handlers.confirm({ body: { token, confirm: true } }, res);
  assert.equal(res.code, 410);
  assert.equal(expired.state().history, 0);
  const forged = fixture(), bad = forged.response();
  await forged.handlers.confirm({ body: { token: 'bad', confirm: true } }, bad);
  assert.equal(bad.code, 410);
  assert.equal(forged.queries.length, 0);
});

test('confirmation flag is mandatory and completed complaints are not modified', async () => {
  const f = fixture(), res = f.response();
  await f.handlers.confirm({ body: { token } }, res);
  assert.equal(res.code, 410);
  assert.equal(f.queries.length, 0);
  for (const options of [{ status: 'COMPLETED' }]) {
    const g = fixture(options), result = g.response();
    await g.handlers.confirm({ body: { token, confirm: true } }, result);
    assert.equal(g.state().history, 0);
    assert.equal(g.state().committed, 0);
    assert([409, 410].includes(result.code));
  }
});

test('database failure rolls back history, complaint update and token consumption together', async () => {
  const f = fixture({ fail: true }), res = f.response();
  await f.handlers.confirm({ body: { token, confirm: true } }, res);
  assert.equal(res.code, 503);
  assert.equal(f.state().rolledBack, 1);
  assert.equal(f.state().committed, 0);
});

test('disabled feature cannot access the database', async () => {
  const handlers = completionHandlers({ promise() { throw new Error('Unexpected DB access'); } }, {});
  const f = fixture();
  for (const handler of [handlers.preview, handlers.confirm]) {
    const res = f.response();
    await handler({ body: { token, confirm: true } }, res);
    assert.equal(res.code, 404);
  }
});

test('GET and link preview never complete a complaint; only a button click sends confirm', async () => {
  const router = createCompletionRouter({ promise() { throw new Error('GET must not touch DB'); } }, env);
  const route = router.stack.find(layer => layer.route?.path === '/done').route;
  let html;
  route.stack[0].handle({}, { set() {}, type() { return this; }, send(value) { html = value; } });
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const elements = { message: {}, number: {}, done: { disabled: true, addEventListener(_name, callback) { this.click = callback; } } };
  const requests = [];
  const ctx = { location: { hash: '#' + token, pathname: '/api/public/catv-complaints/done' },
    history: { replaceState() {} }, document: { getElementById: id => elements[id] },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => url.endsWith('/preview') ? { complaint_no: 'CMP-42', completed: false } : { message: 'Complete' } };
    } };
  vm.runInNewContext(script, ctx);
  await new Promise(setImmediate);
  assert.equal(requests.length, 1);
  assert(requests[0].url.endsWith('/preview'));
  assert.equal(elements.done.disabled, false);
  await elements.done.click();
  assert.equal(requests.length, 2);
  assert(requests[1].url.endsWith('/confirm'));
  assert.equal(requests[1].body.confirm, true);
  assert.equal(elements.done.disabled, true);
});

for (const type of ['CATV', 'NET', 'CCTV', 'ANONYMOUS']) {
  test(type + ' token allows preview and explicit completion', async () => {
    const f = fixture({ type }), preview = f.response(), confirm = f.response();
    await f.handlers.preview({ body: { token } }, preview);
    assert.equal(preview.code, 200);
    assert.doesNotMatch(f.queries[0].sql, /complainant_type = 'CATV'/);
    await f.handlers.confirm({ body: { token, confirm: true } }, confirm);
    assert.equal(confirm.code, 200);
    assert.equal(f.state().committed, 1);
    assert.equal(f.state().history, 1);
  });
}
