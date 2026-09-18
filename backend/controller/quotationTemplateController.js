const connection = require('../connection');
// Keep runtime setup self-contained: deployments may omit standalone migrations.
// Keep this definition aligned with migrations/create_quotation_templates.sql.
const schema = `CREATE TABLE IF NOT EXISTS quotation_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(150) NOT NULL,
    items_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_quotation_template_name (template_name)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

const normalizeTemplate = (body) => {
    const template_name = typeof body.template_name === 'string' ? body.template_name.trim().replace(/\s+/g, ' ') : '';
    if (!template_name || template_name.length > 150) throw new Error('Template name is required (maximum 150 characters)');
    if (!Array.isArray(body.items) || !body.items.length) throw new Error('At least one item is required');
    const items = body.items.map((item, index) => {
        const row = { product_id: item.product_id ? Number(item.product_id) : null,
            item_name: String(item.item_name || '').trim(), description: String(item.description || ''),
            notes: String(item.notes || '') };
        if (!row.item_name) throw new Error(`Item name is required in row ${index + 1}`);
        if (row.product_id !== null && (!Number.isSafeInteger(row.product_id) || row.product_id <= 0)) throw new Error('Invalid product');
        for (const key of ['qty', 'selling_price', 'discount_percent', 'tax_percent']) {
            row[key] = Number(item[key]);
            if (item[key] === null || item[key] === '' || !Number.isFinite(row[key]) || row[key] < 0 || (key === 'qty' && row[key] <= 0)
                || (key.endsWith('_percent') && row[key] > 100)) throw new Error(`Invalid ${key} in row ${index + 1}`);
        }
        return row;
    });
    return { template_name, items };
};

const list = async (req, res) => {
    try {
        const db = connection.promise();
        await db.query(schema);
        const [rows] = await db.query('SELECT template_id, template_name FROM quotation_templates ORDER BY template_name');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: 'Unable to load quotation templates' }); }
};

const get = async (req, res) => {
    try {
        const db = connection.promise();
        await db.query(schema);
        const [rows] = await db.query('SELECT * FROM quotation_templates WHERE template_id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Template not found' });
        const data = rows[0];
        data.items = typeof data.items_json === 'string' ? JSON.parse(data.items_json) : data.items_json;
        delete data.items_json;
        res.json(data);
    } catch (error) { res.status(500).json({ message: 'Unable to load quotation template' }); }
};

const save = async (req, res) => {
    let data;
    try { data = normalizeTemplate(req.body); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    try {
        const db = connection.promise();
        await db.query(schema);
        const ids = [...new Set(data.items.map(item => item.product_id).filter(Boolean))];
        if (ids.length) {
            const [products] = await db.query('SELECT product_id FROM products WHERE product_id IN (?)', [ids]);
            if (products.length !== ids.length) return res.status(400).json({ message: 'One or more selected products no longer exist' });
        }
        if (req.params.id) {
            const [result] = await db.query('UPDATE quotation_templates SET template_name = ?, items_json = ? WHERE template_id = ?',
                [data.template_name, JSON.stringify(data.items), req.params.id]);
            if (!result.affectedRows) return res.status(404).json({ message: 'Template not found' });
        } else {
            await db.query('INSERT INTO quotation_templates (template_name, items_json) VALUES (?, ?)', [data.template_name, JSON.stringify(data.items)]);
        }
        res.json({ message: 'Quotation template saved' });
    } catch (error) {
        res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: error.code === 'ER_DUP_ENTRY' ? 'A template with this name already exists' : 'Unable to save quotation template' });
    }
};
module.exports = { list, get, save, normalizeTemplate };
