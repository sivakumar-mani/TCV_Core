const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
  getAuditLogs,
  getAuditLogById,
  addAuditLog,
  updateAuditLog,
  deleteAuditLog
} = require('../controller/auditLogController');

router.get('/get', auth.authendicateToken, getAuditLogs);
router.get('/get/:audit_id', auth.authendicateToken, getAuditLogById);
router.post('/add', auth.authendicateToken, addAuditLog);
router.patch('/update', auth.authendicateToken, updateAuditLog);
router.delete('/delete', auth.authendicateToken, deleteAuditLog);

module.exports = router;
