require('dotenv').config();
const jwt = require('jsonwebtoken');
const connection = require('../connection');

function authendicateToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1];
   if(token == null){
    return res.sendStatus(401);
   }
   jwt.verify(token, process.env.ACCESS_TOKEN, (error, response)=>{
    if (error || !response) return res.sendStatus(403);
    res.locals = response;
    next();
   })
}

function requireAdmin(req, res, next) {
  if (String(res.locals.role).toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ message: 'Administrator permission is required' });
  }
  next();
}

const actionForMethod = method => ({ GET: 'can_view', POST: 'can_create', PUT: 'can_update', PATCH: 'can_update', DELETE: 'can_delete' }[method]);

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (String(res.locals.role).toUpperCase() === 'ADMIN') return next();
    const action = actionForMethod(req.method);
    if (!action) return next();
    connection.query(
      `SELECT 1 FROM role_permissions WHERE role = ? AND permission_key = ? AND ${action} = 1 LIMIT 1`,
      [String(res.locals.role).toUpperCase(), permissionKey],
      (error, rows) => {
        if (error) return res.status(500).json({ message: 'Permission check failed' });
        if (!rows.length) return res.status(403).json({ message: 'You do not have permission for this action' });
        next();
      }
    );
  };
}

function requirePermissionAction(permissionKey, action) {
  const allowedActions = new Set(['can_view', 'can_create', 'can_update', 'can_delete']);
  if (!allowedActions.has(action)) throw new Error(`Invalid permission action: ${action}`);
  return (req, res, next) => {
    if (String(res.locals.role).toUpperCase() === 'ADMIN') return next();
    connection.query(
      `SELECT 1 FROM role_permissions WHERE role = ? AND permission_key = ? AND ${action} = 1 LIMIT 1`,
      [String(res.locals.role).toUpperCase(), permissionKey],
      (error, rows) => {
        if (error) return res.status(500).json({ message: 'Permission check failed' });
        if (!rows.length) return res.status(403).json({ message: 'You do not have permission for this action' });
        next();
      }
    );
  };
}

function requireAnyPermission(permissionKeys) {
  return (req, res, next) => {
    if (String(res.locals.role).toUpperCase() === 'ADMIN') return next();
    const action = actionForMethod(req.method);
    if (!action) return next();
    connection.query(
      `SELECT 1 FROM role_permissions WHERE role = ? AND permission_key IN (?) AND ${action} = 1 LIMIT 1`,
      [String(res.locals.role).toUpperCase(), permissionKeys],
      (error, rows) => {
        if (error) return res.status(500).json({ message: 'Permission check failed' });
        if (!rows.length) return res.status(403).json({ message: 'You do not have permission for this action' });
        next();
      }
    );
  };
}

module.exports = { authendicateToken, requireAdmin, requirePermission, requirePermissionAction, requireAnyPermission };
