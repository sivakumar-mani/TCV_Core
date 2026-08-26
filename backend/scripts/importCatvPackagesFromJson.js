const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const typeMap = {
  broadcaster: 'BROADCAST',
  addon: 'ADDON',
  alacarte: 'ALACARTE',
};

function sqlString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function normalize(rows) {
  if (!Array.isArray(rows)) throw new Error('Input must be a JSON array.');
  const seen = new Set();
  return rows.map((row, index) => {
    const packageName = String(row.package_name || '').trim();
    const sourceType = String(row.package_type || '').trim().toLowerCase();
    const packageType = typeMap[sourceType];
    const serviceCategory = String(row.service_category || '').trim().toUpperCase();
    const price = Number(row.price);
    const channelCount = String(row.channel_count || '').trim();
    if (!packageName) throw new Error(`Row ${index + 2}: package name is blank.`);
    if (!packageType) throw new Error(`Row ${index + 2}: unsupported package type ${row.package_type}.`);
    if (serviceCategory !== 'CATV') throw new Error(`Row ${index + 2}: category must be CATV.`);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Row ${index + 2}: invalid price ${row.price}.`);
    const key = `${packageType}\u0000${packageName.toLocaleLowerCase('en')}`;
    if (seen.has(key)) throw new Error(`Row ${index + 2}: duplicate ${packageName}/${packageType}.`);
    seen.add(key);
    return {
      packageName,
      packageType,
      price: price.toFixed(2),
      description: channelCount ? `Channels: ${channelCount}` : null,
    };
  });
}

function buildExport(rows) {
  const values = rows.map((row) => `(${sqlString(row.packageName)},${sqlString(row.packageType)},'CATV',NULL,${row.price},0.00,${row.price},${row.description ? sqlString(row.description) : 'NULL'},1)`).join(',\n');
  return `-- CATV package master replacement generated from packages_updated.xlsx\n` +
    `-- Existing referenced packages are retained as inactive to preserve customer history.\n` +
    `START TRANSACTION;\n\n` +
    `UPDATE cable_package_master SET is_active = 0 WHERE service_category = 'CATV';\n\n` +
    `DELETE pm FROM cable_package_master pm\n` +
    `WHERE pm.service_category = 'CATV'\n` +
    `  AND NOT EXISTS (SELECT 1 FROM cable_customer_packages cp WHERE cp.package_id = pm.package_id);\n\n` +
    `INSERT INTO cable_package_master\n` +
    `  (package_name, package_type, service_category, internet_network_type, price, gst_percent, price_including_gst, description, is_active)\nVALUES\n${values}\n` +
    `ON DUPLICATE KEY UPDATE\n` +
    `  service_category = VALUES(service_category),\n` +
    `  internet_network_type = VALUES(internet_network_type),\n` +
    `  price = VALUES(price),\n` +
    `  gst_percent = VALUES(gst_percent),\n` +
    `  price_including_gst = VALUES(price_including_gst),\n` +
    `  description = VALUES(description),\n` +
    `  is_active = 1;\n\nCOMMIT;\n`;
}

async function main() {
  const input = await new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
  const rows = normalize(JSON.parse(input));
  const exportPath = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'database_backups', 'catv_package_master_update.sql'));
  fs.writeFileSync(exportPath, buildExport(rows), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE cable_package_master SET is_active = 0 WHERE service_category = 'CATV'");
    const [deleted] = await connection.query(`DELETE pm FROM cable_package_master pm
      WHERE pm.service_category = 'CATV'
        AND NOT EXISTS (SELECT 1 FROM cable_customer_packages cp WHERE cp.package_id = pm.package_id)`);
    const statement = `INSERT INTO cable_package_master
      (package_name, package_type, service_category, internet_network_type, price, gst_percent, price_including_gst, description, is_active)
      VALUES (?, ?, 'CATV', NULL, ?, 0.00, ?, ?, 1)
      ON DUPLICATE KEY UPDATE service_category=VALUES(service_category), internet_network_type=NULL,
        price=VALUES(price), gst_percent=0.00, price_including_gst=VALUES(price_including_gst),
        description=VALUES(description), is_active=1`;
    for (const row of rows) {
      await connection.execute(statement, [row.packageName, row.packageType, row.price, row.price, row.description]);
    }
    await connection.commit();
    const [[summary]] = await connection.query(`SELECT
      COUNT(*) AS active_count,
      SUM(package_type='BROADCAST') AS broadcaster_count,
      SUM(package_type='ADDON') AS addon_count,
      SUM(package_type='ALACARTE') AS alacarte_count
      FROM cable_package_master WHERE service_category='CATV' AND is_active=1`);
    console.log(JSON.stringify({ imported: rows.length, deleted: deleted.affectedRows, exportPath, summary }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
