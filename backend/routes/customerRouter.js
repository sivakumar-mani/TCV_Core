const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    addCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer
} = require('../controller/customerController');

router.get('/get', auth.authendicateToken, getCustomers);
router.get('/get/:customer_id', auth.authendicateToken, getCustomerById);
router.post('/add', auth.authendicateToken, addCustomer);
router.patch('/update', auth.authendicateToken, updateCustomer);
router.delete('/delete', auth.authendicateToken, deleteCustomer);

module.exports = router;
