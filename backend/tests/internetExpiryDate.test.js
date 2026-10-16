const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { internetExpiryDateSql } = require('../controller/internetExpiryDate');

test('expiry uses current billing start minus one, falling back to latest approved end', () => {
  const db = new DatabaseSync(':memory:');
  let today = '2026-10-10';
  db.function('CURDATE', () => today);
  db.function('MONTH', value => Number(value.slice(5, 7)));
  db.function('YEAR', value => Number(value.slice(0, 4)));
  db.function('DATE_SUB', (value, interval) => {
    assert.equal(interval, '1 DAY');
    if (!value) return null;
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  });
  db.exec(`CREATE TABLE internet_subscriptions (internet_customer_id INTEGER,
    subscription_month INTEGER, subscription_year INTEGER, start_date TEXT, end_date TEXT, approval_status TEXT)`);
  const insert = db.prepare('INSERT INTO internet_subscriptions VALUES (?, ?, ?, ?, ?, ?)');
  insert.run(1, 9, 2026, '2026-09-16', '2026-10-15', 'APPROVED');
  insert.run(1, 10, 2026, '2026-10-16', '2026-11-15', 'APPROVED');
  insert.run(1, 11, 2026, '2026-11-16', '2026-12-15', 'APPROVED');
  insert.run(2, 9, 2026, '2026-09-16', '2026-10-15', 'APPROVED');
  insert.run(2, 10, 2026, '2026-10-20', '2026-11-19', 'REJECTED');
  insert.run(3, 1, 2027, '2027-01-01', '2027-01-30', 'APPROVED');
  insert.run(4, 10, 2025, '2025-10-16', '2025-11-15', 'APPROVED');
  insert.run(4, 9, 2026, '2026-09-16', '2026-10-18', 'APPROVED');
  // SQLite uses a string argument where MySQL uses the INTERVAL keyword.
  const expression = internetExpiryDateSql.replace('INTERVAL 1 DAY', "'1 DAY'");
  const expiry = db.prepare(`SELECT ${expression} expiry_date FROM internet_subscriptions s
    WHERE s.approval_status = 'APPROVED' AND s.internet_customer_id = ?`);
  try {
    assert.equal(expiry.get(1).expiry_date, '2026-10-15');
    assert.equal(expiry.get(2).expiry_date, '2026-10-15');
    assert.equal(expiry.get(4).expiry_date, '2026-10-18');
    assert.equal(expiry.get(99).expiry_date, null);
    today = '2026-11-10';
    assert.equal(expiry.get(1).expiry_date, '2026-11-15');
    today = '2027-01-01';
    assert.equal(expiry.get(3).expiry_date, '2026-12-31');
  } finally { db.close(); }
});
