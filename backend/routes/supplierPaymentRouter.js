const express = require('express');
const router = express.Router();
const {
  getSupplierPayments,
  addSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment
} = require('../controller/paymentController');

router.get('/', getSupplierPayments);
router.get('/get', getSupplierPayments);
router.post('/', addSupplierPayment);
router.post('/add', addSupplierPayment);
router.patch('/', updateSupplierPayment);
router.patch('/update', updateSupplierPayment);
router.delete('/', deleteSupplierPayment);
router.delete('/delete', deleteSupplierPayment);

module.exports = router;
