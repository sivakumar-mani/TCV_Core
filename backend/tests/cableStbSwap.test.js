const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/cableTvController'), 'utf8');
const handler = source.slice(source.indexOf('const addCustomerStb ='), source.indexOf('const updateCustomerStb ='));

async function submit(reason, status, approvalStatus = 'PENDING', pending = false) {
  const queries = [], accounts = [];
  let committed = false;
  const db = {
    async beginTransaction() {}, async rollback() {}, async commit() { committed = true; },
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT cable_customer_id FROM')) return [[{ cable_customer_id: 1 }]];
      if (sql.includes('INNER JOIN cable_approval_groups')) return [pending ? [{ customer_stb_id: 8 }] : []];
      if (sql.includes('FROM cable_customer_stbs')) return [[{ customer_stb_id: 2, stb_master_id: 3, status, stb_no: 'OLD', stb_type: 'NEW' }]];
      if (sql.includes('FROM cable_stb_master sm')) return [[{ stb_master_id: 4, stb_number: 'NEW', stock_type: 'NEW', status: 'AVAILABLE', assigned_employee_id: 5, stb_amount: 650 }]];
      return [{ insertId: 9 }];
    }
  };
  const context = vm.createContext({ connection: { promise: () => db },
    ensureCableTvExtendedTables: async () => {},
    createApprovalGroup: async () => ({ approvalGroupId: 7, approvalStatus, createdBy: 5 }),
    resolveEmployeeId: async () => 5, isAdmin: () => approvalStatus === 'APPROVED',
    textOrNull: value => value || null, intOrNull: value => Number(value) || null,
    money: value => Number(value) || 0, customerStatusForStbStatus: value => value,
    saveStbAccessories: async () => {}, addPendingAccount: async (_db, _req, account) => accounts.push(account)
  });
  vm.runInContext(handler + '\nthis.submit = addCustomerStb;', context);
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await context.submit({ params: { id: 1 }, body: { reason, stb_master_id: 4, labour_service_charge: 50, stb_discount: 25 } }, res);
  return { queries, accounts, committed, res };
}

for (const [reason, status] of [['STB_SWAP', 'ACTIVE'], ['STB_SWAP', 'DISCONNECTED'], ['REPLACED', 'DISCONNECTED']]) {
  for (const approval of ['PENDING', 'APPROVED']) {
    test(`${reason} from ${status}, ${approval}: replacement charges and stock lifecycle`, async () => {
      const result = await submit(reason, status, approval);
      assert.equal(result.res.statusCode, 201, JSON.stringify(result.res.body));
      assert.equal(result.committed, true);
      assert.equal(result.accounts.length, 1);
      assert.equal(result.accounts[0].stb_amount, 650);
      assert.equal(result.accounts[0].labor_amount, 50);
      assert.equal(result.accounts[0].discount, 25);
      assert.equal(result.accounts[0].approval_status, approval);
      const insert = result.queries.find(q => q.sql.includes('INSERT INTO cable_customer_stbs'));
      assert.equal(insert.params[15], reason);
      assert.equal(insert.params[17], 'ACTIVE');
      assert.equal(result.queries.some(q => q.sql.includes("SET status = 'AVAILABLE'")), approval === 'APPROVED');
      assert.ok(result.queries.some(q => q.sql.includes('INSERT INTO cable_stb_issue_master')));
    });
  }
}
test('existing active replacement restriction and pending approval guard remain', async () => {
  assert.equal((await submit('REPLACED', 'ACTIVE')).res.statusCode, 400);
  const blocked = await submit('STB_SWAP', 'ACTIVE', 'PENDING', true);
  assert.equal(blocked.res.statusCode, 409);
  assert.equal(blocked.accounts.length, 0);
});

for (const reason of ['STB_SWAP', 'REPLACED']) {
  test(`${reason} workflow approval returns the previous box and preserves account receipt gate`, async () => {
    const workflow = fs.readFileSync(require.resolve('../controller/workflowController'), 'utf8');
    const queries = [];
    const db = {
      async beginTransaction() {}, async rollback() {}, async commit() {},
      async query(sql, params) {
        queries.push({ sql, params });
        if (sql.includes('SELECT * FROM cable_approval_groups')) return [[{ approval_status: 'PENDING' }]];
        if (sql.includes('COUNT(*) AS count')) return [[{ count: 1 }]];
        if (sql.includes('SELECT customer_stb_id, cable_customer_id, stb_master_id')) return [[{ customer_stb_id: 9, cable_customer_id: 1, stb_master_id: 4, status: 'ACTIVE', update_reason: reason }]];
        if (sql.includes('SELECT customer_stb_id, stb_master_id')) return [[{ customer_stb_id: 2, stb_master_id: 3 }]];
        return [[]];
      }
    };
    const context = vm.createContext({ connection: { promise: () => db },
      ensureWorkflowTable: async () => {}, ensureTransactionTable: async () => {},
      applyApprovedLocationChange: async () => {}, customerStatusForStbStatus: value => value,
      synchronizeLatestCustomerStbStatus: async () => {}
    });
    vm.runInContext(workflow.slice(workflow.indexOf('const approveWorkflow ='), workflow.indexOf('module.exports =')) + '\nthis.approve = approveWorkflow;', context);
    const res = { locals: { role: 'ADMIN', userId: 5 }, statusCode: 200,
      status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await context.approve({ params: { workflow_id: 'CTV-7' }, body: {}, res }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const returned = queries.find(q => q.sql.includes("SET issue_status = 'RETURNED'"));
    assert.deepEqual(Array.from(returned.params[0]), [3]);
    assert.equal(queries.some(q => q.sql.includes('UPDATE cable_customer_stb_accessories')), false);
  });
}
