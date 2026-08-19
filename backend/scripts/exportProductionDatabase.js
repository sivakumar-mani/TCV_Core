const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env copy');
const outputPath = path.join(backendRoot, 'migrations', 'production_database.sql');
const dumpExecutable = process.env.MYSQLDUMP_PATH
  || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe';

function exportDatabase() {
  const config = dotenv.parse(fs.readFileSync(envPath));
  const database = String(config.DB_NAME || '').trim();
  const args = [
    `--host=${String(config.DB_HOST || '127.0.0.1').trim()}`,
    `--port=${Number(process.env.LOCAL_DB_PORT || 3308)}`,
    `--user=${String(config.DB_USERNAME || '').trim()}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    '--hex-blob',
    '--default-character-set=utf8mb4',
    '--set-gtid-purged=OFF',
    '--no-tablespaces',
    '--skip-column-statistics',
    `--result-file=${outputPath}`,
    database
  ];
  const result = spawnSync(dumpExecutable, args, {
    cwd: backendRoot,
    env: { ...process.env, MYSQL_PWD: config.DB_PASSWORD },
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `mysqldump exited with ${result.status}`).trim());
  }

  const portableSql = fs.readFileSync(outputPath, 'utf8')
    .replace(/utf8mb4_0900_ai_ci/gi, 'utf8mb4_unicode_ci')
    .replace(/DEFINER=`[^`]+`@`[^`]+`\s*/gi, '')
    .replace(/\/\*!80\d{3}[\s\S]*?\*\//g, '');
  fs.writeFileSync(outputPath, portableSql, 'utf8');
  console.log(`Exported the complete local database structure and records to ${outputPath}`);
}

try {
  exportDatabase();
} catch (error) {
  console.error(`Production database export failed: ${error.message}`);
  process.exitCode = 1;
}
