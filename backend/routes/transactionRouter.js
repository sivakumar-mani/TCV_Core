const express = require('express');
const auth = require('../services/authendication');
const { addTransaction, getTransactions, approveTransaction, deleteTransaction } = require('../controller/transactionController');

const router = express.Router();
router.use(auth.authendicateToken);
router.get('/', getTransactions);
router.post('/', addTransaction);
router.patch('/:transactionId/approve', auth.requireAdmin, approveTransaction);
router.delete('/:transactionId', auth.requireAdmin, deleteTransaction);

module.exports = router;
