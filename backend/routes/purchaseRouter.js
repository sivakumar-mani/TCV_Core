const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchaseById,
  getNextPurchaseNo,
  addPurchase,
  updatePurchase,
  deletePurchase
} = require('../controller/purchaseController');

router.get('/', getPurchases);
router.get('/get', getPurchases);
router.get('/next-no', getNextPurchaseNo);
router.get('/get/:purchase_id', getPurchaseById);
router.get('/:purchase_id', getPurchaseById);
router.post('/', addPurchase);
router.post('/add', addPurchase);
router.patch('/', updatePurchase);
router.patch('/update', updatePurchase);
router.patch('/:purchase_id', (req, res) => {
  req.body.purchase_id = req.body.purchase_id || req.params.purchase_id;
  return updatePurchase(req, res);
});
router.delete('/delete', deletePurchase);
router.delete('/:purchase_id', (req, res) => {
  req.body.purchase_id = req.body.purchase_id || req.params.purchase_id;
  return deletePurchase(req, res);
});

module.exports = router;
