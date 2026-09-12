const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function save(method, overrides = {}) {
    let values;
    const db = { query: async (sql, params) => { values = params; return [{ insertId: 3 }]; } };
    const sandbox = {
        module: { exports: {} },
        require: name => {
            if (name === '../connection') return { promise: () => db };
            if (name === '../utils/businessModuleSchema') return { ensureSalesTable: async () => {} };
            throw new Error(name);
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/salesController.js'), 'utf8'), sandbox);
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await sandbox.module.exports[method]({ body: {
        sales_id: 3, invoice_no: 'INV-202609-0002', invoice_date: '2026-09-11', customer_id: 5,
        total_amount: '4000.00', discount_amount: '500', tax_amount: '0.00', net_amount: '4000.00',
        paid_amount: '3500', paid_date: '2026-09-11', payment_reference: 'received', ...overrides
    } }, res);
    assert.equal(res.body.success, true);
    assert.equal(res.statusCode, method === 'addSale' ? 201 : 200);
    return values;
}

for (const method of ['updateSale', 'addSale']) {
    test(method + ': discount plus payment settles the invoice', async () => {
        const values = await save(method);
        assert.equal(values[11], 0);
        assert.equal(values[15], 'PAID');
        assert.equal(values[9], 4000);
        assert.equal(values[10], 3500);
    });
    test(method + ': partial and undiscounted payments', async () => {
        assert.equal((await save(method, { paid_amount: 3000 }))[11], 500);
        assert.equal((await save(method, { discount_amount: 0 }))[11], 500);
    });
    test(method + ': derived net deducts the discount only once', async () => {
        const values = await save(method, { net_amount: undefined });
        assert.equal(values[9], 3500);
        assert.equal(values[11], 0);
    });
    test(method + ': decimal settlement and explicit status are preserved', async () => {
        const values = await save(method, { net_amount: '0.30', discount_amount: '0.10', paid_amount: '0.20', payment_status: 'PAID' });
        assert.equal(values[11], 0);
        assert.equal(values[15], 'PAID');
    });
}
