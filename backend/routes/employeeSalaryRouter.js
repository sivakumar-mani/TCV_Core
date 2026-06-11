const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
  getSalarySlips,
  getSalarySlipById,
  addSalarySlip,
  updateSalarySlip,
  deleteSalarySlip
} = require('../controller/employeeSalaryController');

router.get('/get', auth.authendicateToken, getSalarySlips);
router.get('/get/:salary_id', auth.authendicateToken, getSalarySlipById);
router.post('/add', auth.authendicateToken, addSalarySlip);
router.patch('/update', auth.authendicateToken, updateSalarySlip);
router.delete('/delete', auth.authendicateToken, deleteSalarySlip);

module.exports = router;
