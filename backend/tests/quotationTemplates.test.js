const { test } = require('node:test');
const assert = require('node:assert/strict');
// Stub the database before importing the controller: these checks never connect to MySQL.
const dbPath = require.resolve('../connection');
let query;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { promise: () => ({ query: (...args) => query(...args) }) } };
const controller = require('../controller/quotationTemplateController');
const item = { product_id: 1, item_name: 'Camera', qty: 2, selling_price: 50, discount_percent: 5, tax_percent: 18 };
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('controller loads and lists templates without a deployed migration file', async () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync(require.resolve('../controller/quotationTemplateController'), 'utf8');
    const sandbox = {
        module: { exports: {} },
        require(name) {
            if (name === '../connection') return require.cache[dbPath].exports;
            throw Object.assign(new Error('Runtime file dependency unavailable'), { code: 'ENOENT' });
        }
    };
    vm.runInNewContext(source, sandbox);
    const queries = [];
    query = async sql => {
        queries.push(sql);
        return sql.startsWith('CREATE') ? [{}] : [[{ template_id: 1, template_name: 'Home' }]];
    };
    const res = response();
    await sandbox.module.exports.list({}, res);
    assert.equal(res.code, 200);
    assert.equal(res.body[0].template_name, 'Home');
    const migration = fs.readFileSync(require('node:path').join(__dirname, '../migrations/create_quotation_templates.sql'), 'utf8');
    assert.equal(queries[0].replace(/\s+/g, ' ').trim(), migration.replace(/\s+/g, ' ').trim());
});

test('normalizes names and validates quantities and percentages', () => {
    assert.equal(controller.normalizeTemplate({ template_name: '  Home   CCTV ', items: [item] }).template_name, 'Home CCTV');
    for (const changes of [{ qty: 0 }, { qty: 'bad' }, { tax_percent: 101 }, { selling_price: -1 }]) {
        assert.throws(() => controller.normalizeTemplate({ template_name: 'Home', items: [{ ...item, ...changes }] }));
    }
    assert.throws(() => controller.normalizeTemplate({ template_name: ' ', items: [item] }));
});

test('applying and editing preserve saved selling prices, quantities and custom items', async () => {
    const savedItems = [item, { ...item, product_id: null, selling_price: 75 }, { ...item, selling_price: 0 }];
    query = async sql => {
        if (sql.startsWith('CREATE')) return [{}];
        assert.match(sql, /FROM quotation_templates/);
        return [[{ items_json: JSON.stringify(savedItems) }]];
    };
    // Legacy apply requests must also return saved prices without querying purchases.
    for (const params of [{}, { apply: '1' }]) {
        const res = response();
        await controller.get({ params: { id: 1 }, query: params }, res);
        assert.equal(res.code, 200);
        assert.deepEqual(res.body.items, savedItems);
    }
});

test('database duplicate-name constraint becomes a conflict response', async () => {
    query = async sql => {
        if (sql.startsWith('CREATE')) return [{}];
        if (sql.includes('FROM products')) return [[{ product_id: 1 }]];
        throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
    };
    const res = response();
    await controller.save({ params: {}, body: { template_name: 'Home', items: [item] } }, res);
    assert.equal(res.code, 409);
    assert.match(res.body.message, /already exists/);
});
