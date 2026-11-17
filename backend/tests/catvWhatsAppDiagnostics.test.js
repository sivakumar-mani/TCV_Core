const { test } = require('node:test');
const assert = require('node:assert/strict');
const { diagnose } = require('../scripts/diagnoseCatvWhatsApp');

test('diagnostic uses only read queries scoped to configured group and does not print customer secrets', async () => {
  const calls = [], output = [];
  const group = '123@g.us';
  await diagnose({ promise: () => ({ query: async (sql, values) => {
    assert(sql.startsWith('SELECT'));
    assert(values.every(value => value === group));
    assert.doesNotMatch(sql, /email|mobile|full_name|token_hash|message_id/i);
    calls.push(sql);
    return [[]];
  } }) }, { CATV_WHATSAPP_GROUP_ID: group, CATV_WHATSAPP_ENABLED: 'true', INVOICE_EMAIL_PASSWORD: 'never-print' }, {
    log: (...values) => output.push(values.join(' ')), table() {}
  });
  assert.equal(calls.length, 3);
  assert.match(calls[2], /BEFORE_ACTIVATION/);
  assert.match(calls[2], /NOT_QUEUED/);
  assert(!output.join(' ').includes('never-print'));
});

test('missing group configuration does not query the database', async () => {
  await diagnose({ promise() { throw new Error('Unexpected DB query'); } }, {}, { log() {}, table() {} });
});
