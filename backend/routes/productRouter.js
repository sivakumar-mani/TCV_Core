const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { getProducts, addProduct, updateProduct } = require('../controller/productController');

router.get('/get', getProducts);
router.post('/add', addProduct);
router.patch('/update', updateProduct);

module.exports = router;