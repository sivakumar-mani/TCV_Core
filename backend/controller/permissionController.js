const connection = require('../connection');
const { permissionCatalog } = require('../utils/permissionCatalog');

const roles = ['MANAGER', 'EMPLOYEE', 'SALES', 'SERVICE'];
const query = (sql, params = []) => new Promise((resolve, reject) => {
  connection.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});

const getPermissions = async (_req, res) => {
  try {
    const rows = await query('SELECT role, permission_key, can_view, can_create, can_update, can_delete FROM role_permissions');
    return res.json({ roles, catalog: permissionCatalog, permissions: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Permission list failed', error: error.message });
  }
};

const updatePermissions = async (req, res) => {
  const role = String(req.params.role || '').toUpperCase();
  if (!roles.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (!Array.isArray(req.body.permissions)) return res.status(400).json({ message: 'Permissions are required' });

  const allowedKeys = new Set(permissionCatalog.map(item => item.key));
  const catalogByKey = new Map(permissionCatalog.map(item => [item.key, item]));
  const values = req.body.permissions.filter(item => allowedKeys.has(item.permission_key));
  try {
    await query('START TRANSACTION');
    await query('DELETE FROM role_permissions WHERE role = ?', [role]);
    for (const item of values) {
      const createOnly = catalogByKey.get(item.permission_key)?.createOnly;
      const canCreate = !!item.can_create;
      await query(
        `INSERT INTO role_permissions
         (role, permission_key, can_view, can_create, can_update, can_delete, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [role, item.permission_key, createOnly ? canCreate : !!item.can_view, canCreate,
          createOnly ? false : !!item.can_update, createOnly ? false : !!item.can_delete,
          res.locals.userId]
      );
    }
    await query('COMMIT');
    return res.json({ message: `${role} permissions updated successfully` });
  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    return res.status(500).json({ message: 'Permission update failed', error: error.message });
  }
};

module.exports = { getPermissions, updatePermissions };
