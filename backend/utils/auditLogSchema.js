const ensureAuditLogTable = async (conn) => {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      audit_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      module VARCHAR(100),
      action VARCHAR(50),
      table_name VARCHAR(100),
      record_id INT NULL,
      old_values JSON NULL,
      new_values JSON NULL,
      ip_address VARCHAR(45) NULL,
      browser_info VARCHAR(255) NULL,
      change_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_module (module),
      INDEX idx_table_name (table_name),
      INDEX idx_created_at (created_at),
      INDEX idx_record (table_name, record_id)
    ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

module.exports = {
  ensureAuditLogTable
};
