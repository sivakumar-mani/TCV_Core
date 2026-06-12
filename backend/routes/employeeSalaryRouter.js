const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
  getSalaries,
  getSalaryById,
  addSalary,
  updateSalary,
  deleteSalary,
  getSalaryByEmployee
} = require('../controller/employeeSalaryController');

router.get('/get', auth.authendicateToken, getSalaries);
router.get('/get/:salary_id', auth.authendicateToken, getSalaryById);
router.get('/employee/:employee_id', auth.authendicateToken, getSalaryByEmployee);
router.post('/add', auth.authendicateToken, addSalary);
router.patch('/update', auth.authendicateToken, updateSalary);
router.delete('/delete', auth.authendicateToken, deleteSalary);

module.exports = router;
