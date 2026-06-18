const express = require('express');
const router = express.Router();
const {
  getAttendance,
  addAttendance,
  updateAttendance,
  deleteAttendance
} = require('../controller/employeeAttendanceController');

router.get('/', getAttendance);
router.get('/get', getAttendance);
router.post('/', addAttendance);
router.post('/add', addAttendance);
router.patch('/', updateAttendance);
router.patch('/update', updateAttendance);
router.delete('/', deleteAttendance);
router.delete('/delete', deleteAttendance);

module.exports = router;
