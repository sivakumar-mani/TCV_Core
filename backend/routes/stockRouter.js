const express = require('express');
const router = express.Router();
const {
  getStock,
  getLedger,
  upsertStockSettings,
  adjustStock
} = require('../controller/stockController');

router.get('/', getStock);
router.get('/get', getStock);
router.get('/ledger', getLedger);
router.patch('/settings', upsertStockSettings);
router.post('/adjust', adjustStock);

module.exports = router;
