const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
const localEnvPath = path.join(backendRoot, '.env copy');
const outputPath = path.join(backendRoot, 'migrations', 'production_schema.sql');

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '``')}\``;

const normalizeCreateSql = (sql) => String(sql)
  .replace(/ AUTO_INCREMENT=\d+/gi, '')
  .replace(/utf8mb4_0900_ai_ci/gi, 'utf8mb4_unicode_ci')
  .replace(/DEFINER=`[^`]+`@`[^`]+`\s*/gi, '');

async function exportSchema() {
  const env = dotenv.parse(fs.readFileSync(localEnvPath));
  const connection = await mysql.createConnection({
    host: String(env.DB_HOST || '127.0.0.1').trim(),
    port: Number(process.env.LOCAL_DB_PORT || 3308),
    user: String(env.DB_USERNAME || '').trim(),
    password: env.DB_PASSWORD,
    database: String(env.DB_NAME || '').trim()
  });

  try {
    const [objects] = await connection.query('SHOW FULL TABLES');
    const nameKey = Object.keys(objects[0] || {}).find((key) => key.startsWith('Tables_in_'));
    const typeKey = Object.keys(objects[0] || {}).find((key) => key === 'Table_type');
    const tables = objects.filter((row) => row[typeKey] === 'BASE TABLE').map((row) => row[nameKey]).sort();
    const views = objects.filter((row) => row[typeKey] === 'VIEW').map((row) => row[nameKey]).sort();
    const statements = [];

    statements.push('-- TCV Core production schema');
    statements.push('-- Generated from the current local tcvonedb structure. Contains no application data.');
    statements.push(`-- Generated: ${new Date().toISOString()}`);
    statements.push('SET NAMES utf8mb4;');
    statements.push('SET FOREIGN_KEY_CHECKS = 0;');
    statements.push('SET UNIQUE_CHECKS = 0;');
    statements.push('');

    for (const table of tables) {
      const [[definition]] = await connection.query(`SHOW CREATE TABLE ${quoteIdentifier(table)}`);
      statements.push(`-- Table: ${table}`);
      statements.push(`${normalizeCreateSql(definition['Create Table'])};`);
      statements.push('');
    }

    for (const view of views) {
      const [[definition]] = await connection.query(`SHOW CREATE VIEW ${quoteIdentifier(view)}`);
      statements.push(`-- View: ${view}`);
      statements.push(`${normalizeCreateSql(definition['Create View'])};`);
      statements.push('');
    }

    statements.push('SET UNIQUE_CHECKS = 1;');
    statements.push('SET FOREIGN_KEY_CHECKS = 1;');
    statements.push('');
    fs.writeFileSync(outputPath, statements.join('\n'), 'utf8');
    console.log(`Exported ${tables.length} tables and ${views.length} views to ${outputPath}`);
  } finally {
    await connection.end();
  }
}

exportSchema().catch((error) => {
  console.error(`Schema export failed: ${error.message}`);
  process.exitCode = 1;
});
