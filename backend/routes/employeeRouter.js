const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
  getEmployees,
  getEmployeeById,
  getNextEmployeeCode,
  uploadEmployeePhoto,
  addEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controller/employeeController');

router.get('/get', auth.authendicateToken, getEmployees);
router.get('/next-code', auth.authendicateToken, getNextEmployeeCode);
router.get('/get/:employee_id', auth.authendicateToken, getEmployeeById);
router.post('/upload-photo', auth.authendicateToken, uploadEmployeePhoto);
router.post('/add', auth.authendicateToken, addEmployee);
router.patch('/update', auth.authendicateToken, updateEmployee);
router.delete('/delete', auth.authendicateToken, deleteEmployee);

module.exports = router;
