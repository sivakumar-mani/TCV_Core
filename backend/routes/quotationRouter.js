const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    addQuotation,
    deleteQuotation,
    getQuotationById,
    getQuotations,
    updateQuotation
} = require('../controller/quotationController');

router.get('/get', auth.authendicateToken, getQuotations);
router.get('/get/:quotation_id', auth.authendicateToken, getQuotationById);
router.post('/add', auth.authendicateToken, addQuotation);
router.patch('/update', auth.authendicateToken, updateQuotation);
router.delete('/delete', auth.authendicateToken, deleteQuotation);

module.exports = router;
