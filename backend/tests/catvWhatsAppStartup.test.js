const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../services/catvWhatsAppNotifications'), 'utf8');
for (const databaseFailure of [false, true]) {
  test('startup reports ' + (databaseFailure ? 'database error code without SQL or secrets' : 'browser error and stage'), async () => {
    const logs = [];
    let destroyed = 0, cleared = 0;
    class Client {
      on() {}
      async initialize() { throw new Error('The browser is already running for session-catv-complaints'); }
      async destroy() { destroyed++; }
    }
    const context = { module: { exports: {} }, __dirname: '.', process: { env: {} },
      setTimeout: () => ({ unref() {} }), clearTimeout() {},
      setInterval: () => ({ unref() {} }), clearInterval: () => { cleared++; },
      require: name => {
        if (name === 'whatsapp-web.js') return { Client, LocalAuth: class {} };
        if (name === './catvComplaintCompletionLinks') return { completionConfig: () => null };
        if (name === '../controller/internetCustomerNumber') return require('../controller/internetCustomerNumber');
        return require(name);
      } };
    vm.runInNewContext(source, context);
    const db = { query: async () => {
      if (databaseFailure) throw Object.assign(new Error('secret SQL credentials'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
      return [[]];
    } };
    context.module.exports.startCatvWhatsAppNotifications({ promise: () => db },
      { CATV_WHATSAPP_ENABLED: 'true', CATV_WHATSAPP_GROUP_ID: '123@g.us' }, { log: msg => logs.push(msg), error: msg => logs.push(msg) });
    await new Promise(setImmediate);
    assert.equal(destroyed, 1);
    assert(cleared >= 1);
    assert.match(logs.join('\n'), databaseFailure ? /database setup.*ER_TABLEACCESS_DENIED_ERROR/ : /browser initialization.*browser is already running/);
    assert.doesNotMatch(logs.join('\n'), /secret SQL credentials/);
    await assert.rejects(context.module.exports.sendComplaintManually(42), error => error.status === 503);
  });
}

function lifecycle({ failFirst = false } = {}) {
  const { EventEmitter } = require('node:events');
  const clients = [], retries = [], polls = new Set();
  class Client extends EventEmitter {
    constructor() { super(); clients.push(this); this.closed = false; }
    async initialize() { if (failFirst && clients.length === 1) throw new Error('Temporary browser failure'); }
    async destroy() { this.closed = true; this.emit('disconnected'); }
  }
  const context = { module: { exports: {} }, __dirname: '.', process: { env: {} },
    setInterval: cb => { const item = { cb, unref() {} }; polls.add(item); return item; },
    clearInterval: item => polls.delete(item),
    setTimeout: (cb, delay) => { const item = { cb, delay, unref() {} }; retries.push(item); return item; },
    clearTimeout: item => { if (item) item.cancelled = true; },
    require: name => {
      if (name === 'whatsapp-web.js') return { Client, LocalAuth: class {} };
      if (name === './catvComplaintCompletionLinks') return { completionConfig: () => null };
      if (name === '../controller/internetCustomerNumber') return require('../controller/internetCustomerNumber');
      return require(name);
    } };
  vm.runInNewContext(source, context);
  const stop = context.module.exports.startCatvWhatsAppNotifications({ promise: () => ({ query: async () => [[]] }) },
    { CATV_WHATSAPP_ENABLED: 'true', CATV_WHATSAPP_GROUP_ID: '123@g.us' }, { log() {}, error() {} });
  return { clients, retries, polls, stop };
}
const settled = () => new Promise(setImmediate);

test('disconnect schedules one reconnect and closes old browser before creating another', async () => {
  const f = lifecycle(); await settled();
  f.clients[0].emit('ready');
  f.clients[0].emit('disconnected'); f.clients[0].emit('disconnected');
  assert.equal(f.retries.length, 1);
  assert.equal(f.retries[0].delay, 30000);
  assert.equal(f.polls.size, 0);
  f.retries[0].cb(); await settled();
  assert.equal(f.clients.length, 2);
  assert(f.clients[0].closed);
  assert.equal(f.polls.size, 1);
  f.stop(); await settled();
  assert(f.clients[1].closed);
  assert.equal(f.retries.length, 1);
});

test('startup failure retries with backoff and ready resets the delay', async () => {
  const f = lifecycle({ failFirst: true }); await settled();
  assert.equal(f.retries[0].delay, 30000);
  f.retries[0].cb(); await settled();
  f.clients[1].emit('disconnected');
  assert.equal(f.retries[1].delay, 60000);
  f.retries[1].cb(); await settled();
  f.clients[2].emit('ready'); f.clients[2].emit('disconnected');
  assert.equal(f.retries[2].delay, 30000);
  f.stop(); await settled();
  assert(f.retries[2].cancelled);
});

test('authentication failure pauses retries without deleting login data', async () => {
  const f = lifecycle(); await settled();
  f.clients[0].emit('auth_failure'); f.clients[0].emit('disconnected');
  assert.equal(f.retries.length, 0);
  assert.equal(f.clients.length, 1);
  f.stop(); await settled();
});

test('stopping during startup prevents a late browser from remaining open', async () => {
  const f = lifecycle(); f.stop(); await settled();
  assert.equal(f.clients.length, 0);
  assert.equal(f.retries.length, 0);
  assert.equal(f.polls.size, 0);
});
