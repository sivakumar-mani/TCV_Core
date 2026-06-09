const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { addCategory, getCategoriesTree, updateCategory, deleteCategory, getCatById }=require('../controller/categoryController');

router.post('/', addCategory);
router.post('/add', addCategory);
// router.post('/create', createCategoryBulk);
router.get('/', getCategoriesTree);
router.get('/get', getCategoriesTree);
router.patch('/', updateCategory);
router.patch('/update', updateCategory);
router.patch('/:id', (req, res) => {
  req.body.category_id = req.body.category_id || req.params.id;
  return updateCategory(req, res);
});
router.delete('/delete/:id', deleteCategory);
router.delete('/:id', deleteCategory);
router.get('/get/:id', getCatById);
router.get('/:id', getCatById);

module.exports = router;
