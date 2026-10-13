const express = require('express');
const { getDashboardSummary, getUpcomingExpiries } = require('../controller/dashboardController');
const auth = require('../services/authendication');

const router = express.Router();
router.get('/summary', getDashboardSummary);
router.get('/upcoming-expiries', (req, res, next) => {
  if (!['CATV', 'NET'].includes(req.query.type)) return res.status(400).json({ message: 'Select CATV or NET' });
  return auth.requirePermission(req.query.type === 'CATV' ? 'CABLE_TV_CUSTOMERS' : 'INTERNET_CUSTOMERS')(req, res, next);
}, getUpcomingExpiries);

module.exports = router;
