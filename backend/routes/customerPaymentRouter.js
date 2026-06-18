const express = require('express');
const router = express.Router();
const {
  getCustomerPayments,
  addCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment
} = require('../controller/paymentController');

router.get('/', getCustomerPayments);
router.get('/get', getCustomerPayments);
router.post('/', addCustomerPayment);
router.post('/add', addCustomerPayment);
router.patch('/', updateCustomerPayment);
router.patch('/update', updateCustomerPayment);
router.delete('/', deleteCustomerPayment);
router.delete('/delete', deleteCustomerPayment);

module.exports = router;
