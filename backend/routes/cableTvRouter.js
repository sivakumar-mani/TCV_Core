const express = require('express');
const router = express.Router();
const {
  addCableCustomer,
  getCableCustomerById,
  getCableCustomers,
  getLookups,
  updateCableCustomer
} = require('../controller/cableTvController');

router.get('/lookups', getLookups);
router.get('/customers', getCableCustomers);
router.get('/customers/:id', getCableCustomerById);
router.post('/customers', addCableCustomer);
router.patch('/customers/:id', updateCableCustomer);

module.exports = router;
