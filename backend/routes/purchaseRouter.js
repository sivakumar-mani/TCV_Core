const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    addPurchase,
    addPurchaseItem,
    getPurchaseItems,
    getPurchases
} = require('../controller/purchaseController');

router.get('/get', auth.authendicateToken, getPurchases);
router.get('/:purchase_id/items', auth.authendicateToken, getPurchaseItems);
router.post('/add', auth.authendicateToken, addPurchase);
router.post('/:purchase_id/items/add', auth.authendicateToken, addPurchaseItem);

module.exports = router;
