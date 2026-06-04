const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    getLookupEmployees,
    getLookupMaterialIssues,
    getLookupProducts,
    getLookupSuppliers,
    getLookupWorkOrders
} = require('../controller/lookupController');

router.get('/suppliers', auth.authendicateToken, getLookupSuppliers);
router.get('/products', auth.authendicateToken, getLookupProducts);
router.get('/employees', auth.authendicateToken, getLookupEmployees);
router.get('/work-orders', auth.authendicateToken, getLookupWorkOrders);
router.get('/material-issues', auth.authendicateToken, getLookupMaterialIssues);

module.exports = router;
