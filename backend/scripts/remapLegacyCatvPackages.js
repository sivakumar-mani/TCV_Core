const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sqlString = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
const customerPackageType = (value) => value === 'BROADCAST' ? 'BROADCASTER' : value;
const normalize = (value) => String(value).toLowerCase()
  .replace(/\band\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');
const tokenSet = (value) => new Set(normalize(value).split(' ').filter(Boolean));

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return 1;
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  const intersection = [...aa].filter((token) => bb.has(token)).length;
  const union = new Set([...aa, ...bb]).size;
  const jaccard = union ? intersection / union : 0;
  const containment = a.includes(b) || b.includes(a)
    ? Math.min(a.length, b.length) / Math.max(a.length, b.length)
    : 0;
  return Math.max(jaccard, containment);
}

function confidence(score, margin) {
  if (score === 1) return 'EXACT';
  if (score >= 0.8 && margin >= 0.15) return 'HIGH';
  return 'REVIEW';
}

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const exportPath = path.resolve(process.argv[2]);
  const reviewPath = path.resolve(process.argv[3]);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const [legacy] = await connection.query(`SELECT pm.package_id, pm.package_name, pm.package_type,
      pm.price, COUNT(cp.customer_package_id) AS customer_references
      FROM cable_package_master pm
      JOIN cable_customer_packages cp ON cp.package_id = pm.package_id
      WHERE pm.service_category = 'CATV' AND pm.is_active = 0
      GROUP BY pm.package_id, pm.package_name, pm.package_type, pm.price
      ORDER BY pm.package_id`);
    const [active] = await connection.query(`SELECT package_id, package_name, package_type, price
      FROM cable_package_master WHERE service_category = 'CATV' AND is_active = 1`);
    if (!legacy.length || !active.length) throw new Error('Legacy or active CATV package set is empty.');

    const mappings = legacy.map((oldPackage) => {
      const ranked = active.map((newPackage) => ({
        newPackage,
        score: similarity(oldPackage.package_name, newPackage.package_name),
      })).sort((a, b) => b.score - a.score || Number(a.newPackage.package_id) - Number(b.newPackage.package_id));
      const margin = ranked[0].score - ranked[1].score;
      return {
        oldPackage,
        newPackage: ranked[0].newPackage,
        score: ranked[0].score,
        margin,
        confidence: confidence(ranked[0].score, margin),
      };
    });

    const csvHeader = ['old_package_id', 'old_package_name', 'old_package_type', 'old_price',
      'customer_references', 'new_package_id', 'new_package_name', 'new_package_type', 'new_price',
      'match_score', 'confidence'];
    const csvRows = mappings.map((item) => [item.oldPackage.package_id, item.oldPackage.package_name,
      item.oldPackage.package_type, item.oldPackage.price, item.oldPackage.customer_references,
      item.newPackage.package_id, item.newPackage.package_name, item.newPackage.package_type,
      item.newPackage.price, item.score.toFixed(3), item.confidence]);
    fs.writeFileSync(reviewPath, [csvHeader, ...csvRows].map((row) => row.map(csvValue).join(',')).join('\r\n') + '\r\n');

    await connection.beginTransaction();
    for (const item of mappings) {
      await connection.execute(`UPDATE cable_customer_packages
        SET package_id = ?, package_type = ? WHERE package_id = ?`,
      [item.newPackage.package_id, customerPackageType(item.newPackage.package_type), item.oldPackage.package_id]);
    }
    const [deleted] = await connection.query(`DELETE pm FROM cable_package_master pm
      WHERE pm.service_category = 'CATV' AND pm.is_active = 0
        AND NOT EXISTS (SELECT 1 FROM cable_customer_packages cp WHERE cp.package_id = pm.package_id)`);
    await connection.commit();

    const mappingValues = mappings.map((item) => `(${sqlString(item.oldPackage.package_name)},${sqlString(item.oldPackage.package_type)},${sqlString(item.newPackage.package_name)},${sqlString(item.newPackage.package_type)},${sqlString(item.confidence)})`).join(',\n');
    let exportSql = fs.readFileSync(exportPath, 'utf8');
    const remapSql = `\n-- Remap legacy customer package references to the closest package in the new master.\n` +
      `-- Review catv_package_mapping_review_20260826.csv and adjust uncertain mappings after import.\n` +
      `CREATE TEMPORARY TABLE catv_package_remap (\n` +
      `  old_package_name VARCHAR(150) NOT NULL, old_package_type VARCHAR(20) NOT NULL,\n` +
      `  new_package_name VARCHAR(150) NOT NULL, new_package_type VARCHAR(20) NOT NULL, confidence VARCHAR(10) NOT NULL\n` +
      `);\nINSERT INTO catv_package_remap VALUES\n${mappingValues};\n\n` +
      `UPDATE cable_customer_packages cp\n` +
      `JOIN cable_package_master old_pm ON old_pm.package_id = cp.package_id\n` +
      `JOIN catv_package_remap map ON map.old_package_name = old_pm.package_name AND map.old_package_type = old_pm.package_type\n` +
      `JOIN cable_package_master new_pm ON new_pm.package_name = map.new_package_name AND new_pm.package_type = map.new_package_type\n` +
      `SET cp.package_id = new_pm.package_id,\n` +
      `    cp.package_type = CASE WHEN new_pm.package_type = 'BROADCAST' THEN 'BROADCASTER' ELSE new_pm.package_type END;\n\n` +
      `DELETE pm FROM cable_package_master pm\n` +
      `WHERE pm.service_category = 'CATV' AND pm.is_active = 0\n` +
      `  AND NOT EXISTS (SELECT 1 FROM cable_customer_packages cp WHERE cp.package_id = pm.package_id);\n` +
      `DROP TEMPORARY TABLE catv_package_remap;\n`;
    exportSql = exportSql.replace(/\nCOMMIT;\s*$/i, `${remapSql}\nCOMMIT;\n`);
    fs.writeFileSync(exportPath, exportSql, 'utf8');

    const totals = mappings.reduce((result, item) => {
      result[item.confidence] += 1;
      result.references += Number(item.oldPackage.customer_references);
      return result;
    }, { EXACT: 0, HIGH: 0, REVIEW: 0, references: 0 });
    console.log(JSON.stringify({ mappings: mappings.length, ...totals, deleted: deleted.affectedRows,
      exportPath, reviewPath }, null, 2));
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
