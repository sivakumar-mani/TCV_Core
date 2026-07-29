const express = require('express');
const auth = require('../services/authendication');
const { addTransaction, getTransactions } = require('../controller/transactionController');

const router = express.Router();
router.use(auth.authendicateToken);
router.get('/', getTransactions);
router.post('/', addTransaction);

module.exports = router;
