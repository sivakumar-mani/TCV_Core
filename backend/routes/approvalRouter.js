const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    approveRequest,
    getApprovalHistory,
    getApprovalRequests,
    rejectRequest,
    submitApprovalRequest
} = require('../controller/approvalController');

router.get('/get', auth.authendicateToken, auth.requireAdmin, getApprovalRequests);
router.get('/history/:approval_request_id', auth.authendicateToken, auth.requireAdmin, getApprovalHistory);
router.post('/submit', auth.authendicateToken, submitApprovalRequest);
router.patch('/approve/:approval_request_id', auth.authendicateToken, auth.requireAdmin, approveRequest);
router.patch('/reject/:approval_request_id', auth.authendicateToken, auth.requireAdmin, rejectRequest);

module.exports = router;
