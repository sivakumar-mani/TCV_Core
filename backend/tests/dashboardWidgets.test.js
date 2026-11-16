const { test } = require('node:test');
const assert = require('node:assert/strict');
const { widgetKeys, dashboardAccess, unpaidSql, createUnpaidHandler } = require('../controller/dashboardWidgets');
const { permissionCatalog } = require('../utils/permissionCatalog');

test('every dashboard widget has an independent role permission entry', () => {
  for (const key of Object.values(widgetKeys)) assert.equal(permissionCatalog.filter(item => item.key === key).length, 1);
});
test('admin retains all widgets without database permission lookup', async () => {
  const access = await dashboardAccess({ query() { throw new Error('Unexpected lookup'); } }, 'ADMIN');
  assert(Object.values(access).every(Boolean));
});
test('ordinary roles receive only persisted view grants and no implicit widget grants', async () => {
  const access = await dashboardAccess({ query: async (sql, args) => {
    assert.match(sql, /can_view = 1/);
    assert.equal(args[0], 'EMPLOYEE');
    return [[{ permission_key: 'DASHBOARD_INTERNET_UNPAID' }, { permission_key: 'DASHBOARD' }]];
  } }, 'employee');
  assert.equal(access.internetUnpaid, true);
  assert.equal(access.catvUnpaid, false);
  assert.equal(access.expiries, false);
});
test('unpaid endpoint rejects invalid types and forbidden requests without querying subscriptions', async () => {
  for (const [type, expected] of [['OTHER', 400], ['CATV', 403], ['NET', 403]]) {
    const handler = createUnpaidHandler({ promise: () => ({ query: async sql => {
      assert.match(sql, /FROM role_permissions/);
      return [[]];
    } }) });
    const res = { locals: { role: 'EMPLOYEE' }, status(code) { this.code = code; return this; }, json() {} };
    await handler({ query: { type } }, res);
    assert.equal(res.code, expected);
  }
});
test('unpaid endpoint normalizes aggregate values for granted service only', async () => {
  const handler = createUnpaidHandler({ promise: () => ({ query: async sql => {
    if (sql.includes('FROM role_permissions')) return [[{ permission_key: 'DASHBOARD_CATV_UNPAID' }]];
    assert.equal(sql, unpaidSql('CATV'));
    return [[{ current_month: '4', two_months: '2', three_plus_months: '1' }]];
  } }) });
  let result;
  await handler({ query: { type: 'CATV' } }, { locals: { role: 'MANAGER' }, json(value) { result = value; } });
  assert.deepEqual(result, { current_month: 4, two_months: 2, three_plus_months: 1 });
});
