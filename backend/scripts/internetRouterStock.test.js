const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { routerProductSql, ensureRouterIssues, availableRouterIssueQty } = require('../controller/internetRouterStock');
const { routerStockType } = require('../controller/internetEnrollment');
const source = fs.readFileSync(require.resolve('../controller/internetCustomerController'), 'utf8');

test('missing token employee uses the authenticated user mapping, not a name match', async () => {
  const ctx = vm.createContext({ intOrNull: v => Number(v) || null });
  vm.runInContext(source.slice(source.indexOf('const userId ='), source.indexOf('const dateOnly =')) + ';this.resolve=resolveLoggedInEmployeeId;', ctx);
  for (const mapped of [9, null]) {
    const calls = [];
    const db = { query: async (sql, args) => { calls.push({ sql, args }); return [[{ employee_id: mapped }]]; } };
    const value = await ctx.resolve(db, { res: { locals: { userId: 42, username: 'different-login-name' } } });
    assert.equal(value, mapped);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /FROM users WHERE user_id = \? AND is_active = 1/);
    assert.equal(calls[0].args[0], 42);
  }
});

test('lookup scopes staff stock and retains admin access to installer stock', async () => {
  for (const [admin, employee] of [[false, 9], [false, null], [true, null]]) {
    const stockCalls = [], issueCalls = [];
    const db = { query: async (sql, args) => {
      if (sql.includes('FROM technician_material_stock')) {
        stockCalls.push({ sql, args });
        return [[{ product_id: 20, product_name: 'Router', employee_id: 9, available_qty: 2 }]];
      }
      if(sql.includes('FROM technician_material_movements m')) {
        issueCalls.push({sql,args});
        return [[{product_id:21,product_name:'General Optinet Router Single Band 2.4GHz',employee_id:9,material_movement_id:77,available_qty:1}]];
      }
      return [[]];
    } };
    const ctx = vm.createContext({ connection: { promise: () => db }, ensureInternetSchema: async () => {}, resolveLoggedInEmployeeId: async () => employee, isAdmin: () => admin, routerProductSql, routerStockType, ensureRouterIssues, availableRouterIssueQty });
    vm.runInContext(source.slice(source.indexOf('const internetLookups ='), source.indexOf('\nconst ', source.indexOf('const internetLookups =') + 6)) + ';this.lookup=internetLookups;', ctx);
    const res = { json(body) { this.body = body; }, status(code) { throw new Error(String(code)); } };
    await ctx.lookup({}, res);
    assert.equal(stockCalls.length, admin || employee ? 1 : 0);
    assert.equal(issueCalls.length, admin || employee ? 1 : 0);
    if(issueCalls.length) {
      assert.equal(res.body.issued_routers[0].stock_key,'issue:77');
      assert.equal(res.body.issued_routers[0].material_movement_id,77);
      if(!admin) { assert.match(issueCalls[0].sql,/AND m.employee_id=\?/); assert.equal(issueCalls[0].args[0],9); }
    }
    if (stockCalls.length) {
      assert.ok(stockCalls[0].sql.includes(routerProductSql));
      assert.match(stockCalls[0].sql, /ts.available_qty > 0/);
      assert.match(stockCalls[0].sql, /p.status = 'ACTIVE'/);
      assert.equal(stockCalls[0].args.length, admin ? 0 : 1);
      if (!admin) { assert.match(stockCalls[0].sql, /AND ts.employee_id = \?/); assert.equal(stockCalls[0].args[0], employee); }
    } else assert.equal(res.body.routers.length, 0);
  }
});
