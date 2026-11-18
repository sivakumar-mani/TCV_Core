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
    assert.equal(cleared, 1);
    assert.match(logs.join('\n'), databaseFailure ? /database setup.*ER_TABLEACCESS_DENIED_ERROR/ : /browser initialization.*browser is already running/);
    assert.doesNotMatch(logs.join('\n'), /secret SQL credentials/);
    await assert.rejects(context.module.exports.sendComplaintManually(42), error => error.status === 503);
  });
}
