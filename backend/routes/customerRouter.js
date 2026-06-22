const express = require('express');
const router = express.Router();
const {
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  getMarketingEmployees
} = require('../controller/customerController');

router.post('/', addCustomer);
router.post('/add', addCustomer);
router.get('/', getCustomers);
router.get('/get', getCustomers);
router.get('/marketing-employees', getMarketingEmployees);
router.get('/get/:customer_id', getCustomerById);
router.get('/:customer_id', getCustomerById);
router.patch('/', updateCustomer);
router.patch('/update', updateCustomer);
router.patch('/:customer_id', (req, res) => {
  req.body.customer_id = req.body.customer_id || req.params.customer_id;
  return updateCustomer(req, res);
});
router.delete('/delete', deleteCustomer);
router.delete('/:customer_id', (req, res) => {
  req.body.customer_id = req.body.customer_id || req.params.customer_id;
  return deleteCustomer(req, res);
});

module.exports = router;
