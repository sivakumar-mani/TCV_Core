const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { addCategory }=require('../controller/categoryController');

router.post('/add', addCategory);

module.exports = router;