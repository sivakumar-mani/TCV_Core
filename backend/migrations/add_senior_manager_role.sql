-- Run against the intended ERP database before deploying the role UI/backend.
-- Append the new role to preserve the enum indexes of all existing roles.
-- No existing users or permission grants are changed.
ALTER TABLE users
  MODIFY COLUMN role ENUM('ADMIN','MANAGER','EMPLOYEE','SALES','SERVICE','SENIOR_MANAGER')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE role_permissions
  MODIFY COLUMN role ENUM('MANAGER','EMPLOYEE','SALES','SERVICE','SENIOR_MANAGER') NOT NULL;
