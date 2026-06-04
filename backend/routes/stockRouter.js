const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const { getStockLedger, getStockSummary } = require('../controller/stockController');

router.get('/summary', auth.authendicateToken, getStockSummary);
router.get('/ledger', auth.authendicateToken, getStockLedger);

module.exports = router;
