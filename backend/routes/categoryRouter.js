const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { addCategory, getCategory, createCategoryBulk, getCategoriesTree, updateCategory }=require('../controller/categoryController');

router.post('/add', addCategory);
// router.post('/create', createCategoryBulk);
router.get('/get', getCategoriesTree);
router.patch('/update', updateCategory);

module.exports = router;