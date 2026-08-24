const express = require('express');
const { getDashboardSummary } = require('../controller/dashboardController');

const router = express.Router();
router.get('/summary', getDashboardSummary);

module.exports = router;
