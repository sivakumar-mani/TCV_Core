const express = require('express');
const { getDashboardSummary, getUpcomingInternetExpiries } = require('../controller/dashboardController');
const auth = require('../services/authendication');
const sendExpiryReminder = require('../controller/internetExpiryReminder')(require('../connection'));

const router = express.Router();
router.get('/summary', getDashboardSummary);
router.get('/internet-expiries', auth.requirePermission('INTERNET_CUSTOMERS'), getUpcomingInternetExpiries);
router.post('/internet-expiries/:customerId/reminder', auth.requirePermissionAction('INTERNET_CUSTOMERS', 'can_update'), sendExpiryReminder);
router.get('/internet-expiries/:customerId/reminder-preview', auth.requirePermissionAction('INTERNET_CUSTOMERS', 'can_update'), sendExpiryReminder);

module.exports = router;
