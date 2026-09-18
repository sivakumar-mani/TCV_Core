const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controller/workflowController'), 'utf8');
// Exercise the actual approval handler with a transaction stub, without schema or live DB changes.
const handler = source.slice(source.indexOf('const approveWorkflow ='), source.indexOf('module.exports ='));

async function approve(pendingAccount, role = 'ADMIN') {
    const queries = [];
    let committed = false;
    const db = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (sql.includes('SELECT * FROM cable_approval_groups')) return [[{ approval_status: 'PENDING' }]];
            if (sql.includes('COUNT(*) AS count')) return [[{ count: pendingAccount ? 1 : 0 }]];
            return [[]];
        },
        async beginTransaction() {}, async rollback() {}, async commit() { committed = true; }
    };
    const context = { connection: { promise: () => db }, ensureWorkflowTable: async () => {},
        ensureTransactionTable: async () => {}, applyApprovedLocationChange: async () => {} };
    vm.createContext(context);
    vm.runInContext(handler + '\nthis.approve = approveWorkflow;', context);
    const res = { locals: { role, userId: 1 }, statusCode: 200,
        status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await context.approve({ params: { workflow_id: 'CTV-42' }, body: {}, res }, res);
    return { queries, committed, res };
}

for (const pending of [true, false]) {
    test(`billing records approved with account ${pending ? 'pending' : 'received'}`, async () => {
        const { queries, committed, res } = await approve(pending);
        assert.equal(res.statusCode, 200);
        assert.equal(committed, true);
        for (const table of ['cable_customer_packages', 'cable_subscriptions']) {
            const update = queries.find(({ sql }) => sql.includes(`UPDATE ${table}`));
            assert.ok(update);
            assert.match(update.sql, /SET approval_status = 'APPROVED'/);
            assert.match(update.sql, /approval_group_id = \? AND approval_status = 'PENDING'/);
            assert.equal(update.params[0], 42);
            assert.doesNotMatch(update.sql, /paid_amount|payment_status|SET amount/);
        }
        assert.equal(queries.some(({ sql }) => sql.includes('UPDATE cable_customer_stb_accessories')), !pending);
        assert.equal(queries.some(({ sql }) => sql.includes('UPDATE cable_connection_materials')), !pending);
    });
}
test('non-admin approval remains forbidden', async () => {
    const { res, committed, queries } = await approve(true, 'EMPLOYEE');
    assert.equal(res.statusCode, 403);
    assert.equal(committed, false);
    assert.equal(queries.some(({ sql }) => sql.includes('UPDATE cable_customer_packages')), false);
});
