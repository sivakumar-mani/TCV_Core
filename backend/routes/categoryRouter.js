const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { addCategory, getCategory, createCategoryBulk, getCategoriesTree }=require('../controller/categoryController');

router.post('/add', addCategory);
// router.post('/create', createCategoryBulk);
router.get('/get', getCategoriesTree);

module.exports = router;