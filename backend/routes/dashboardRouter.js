const express = require('express');
const { getDashboardSummary, getUpcomingExpiries, getUpcomingInternetExpiries } = require('../controller/dashboardController');
const auth = require('../services/authendication');
const sendExpiryReminder = require('../controller/internetExpiryReminder')(require('../connection'));

const router = express.Router();
router.get('/subscription-unpaid', require('../controller/dashboardWidgets').createUnpaidHandler(require('../connection')));
router.get('/summary', getDashboardSummary);
router.get('/upcoming-expiries', (req, res, next) => {
  if (!['CATV', 'NET'].includes(req.query.type)) return res.status(400).json({ message: 'Select CATV or NET' });
  return auth.requirePermission(req.query.type === 'CATV' ? 'CABLE_TV_CUSTOMERS' : 'INTERNET_CUSTOMERS')(req, res, next);
}, getUpcomingExpiries);
router.get('/internet-expiries', auth.requirePermission('DASHBOARD_INTERNET_EXPIRIES'), auth.requirePermission('INTERNET_CUSTOMERS'), getUpcomingInternetExpiries);
router.post('/internet-expiries/:customerId/reminder', auth.requirePermissionAction('DASHBOARD_INTERNET_EXPIRIES', 'can_view'), auth.requirePermissionAction('INTERNET_CUSTOMERS', 'can_update'), sendExpiryReminder);
router.get('/internet-expiries/:customerId/reminder-preview', auth.requirePermission('DASHBOARD_INTERNET_EXPIRIES'), auth.requirePermissionAction('INTERNET_CUSTOMERS', 'can_update'), sendExpiryReminder);

module.exports = router;
