const ensureReminderLog = db => db.query(`CREATE TABLE IF NOT EXISTS internet_expiry_reminder_log (
  reminder_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  internet_customer_id BIGINT NOT NULL,
  expiry_date DATE NOT NULL,
  recipient VARCHAR(254) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SENDING',
  sent_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expiry_reminder_customer (internet_customer_id, expiry_date, status)
)`);
module.exports = { ensureReminderLog };
