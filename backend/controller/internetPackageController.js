const connection = require('../connection');

const fail = (res, error) => res.status(error.code === 'ER_DUP_ENTRY' ? 409 : error.status || 500)
  .json({ message: error.code === 'ER_DUP_ENTRY' ? 'Package code already exists for this provider' : error.status ? error.message : 'Unable to save or load Internet packages' });

function packageValues(body) {
  const name = String(body.package_name || '').trim();
  const code = String(body.package_code || '').trim() || null;
  const provider = String(body.provider_category || '').trim().toUpperCase();
  const price = Number(body.price);
  const gst = Number(body.gst_percent);
  if (!name || name.length > 255 || (code && code.length > 50) ||
      !['KRISHI', 'RAILWIRE', 'DMNET', 'LEGACY'].includes(provider) ||
      body.price == null || body.price === '' || !Number.isFinite(price) || price < 0 || price > 9999999999.99 ||
      body.gst_percent == null || body.gst_percent === '' || !Number.isFinite(gst) || gst < 0 || gst > 100) {
    throw Object.assign(new Error('Enter a package name, valid provider, non-negative price and GST between 0 and 100'), { status: 400 });
  }
  const base = Math.round(price * 100) / 100;
  const tax = Math.round(gst * 100) / 100;
  const total = Math.round(base * (1 + tax / 100) * 100) / 100;
  if (total > 9999999999.99) throw Object.assign(new Error('Package total is too large'), { status: 400 });
  return [code, name, provider, base, tax, total, String(body.description || '').trim() || null];
}

async function listPackages(req, res) {
  try {
    const [packages] = await connection.promise().query('SELECT package_id, package_code, package_name, provider_category, price, gst_percent, price_including_gst, description, is_active FROM internet_package_master ORDER BY provider_category, package_name');
    return res.json({ packages });
  } catch (error) { return fail(res, error); }
}

async function savePackage(req, res) {
  try {
    const values = packageValues(req.body);
    const db = connection.promise();
    if (req.params.id !== undefined) {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('Invalid package ID'), { status: 400 });
      // Keep the provider immutable: changing it could invalidate existing customer assignments.
      const [[existing]] = await db.query('SELECT provider_category FROM internet_package_master WHERE package_id=?', [id]);
      if (!existing) return res.status(404).json({ message: 'Internet package not found' });
      if (existing.provider_category !== values[2]) return res.status(400).json({ message: 'The provider of an existing package cannot be changed' });
      await db.query('UPDATE internet_package_master SET package_code=?, package_name=?, provider_category=?, price=?, gst_percent=?, price_including_gst=?, description=? WHERE package_id=?', [...values, id]);
      return res.json({ message: 'Internet package updated successfully' });
    }
    const [result] = await db.query('INSERT INTO internet_package_master (package_code, package_name, provider_category, price, gst_percent, price_including_gst, description) VALUES (?,?,?,?,?,?,?)', values);
    return res.status(201).json({ message: 'Internet package added successfully', package_id: result.insertId });
  } catch (error) { return fail(res, error); }
}

module.exports = { listPackages, savePackage };
