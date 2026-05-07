const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { getProducts, addProduct } = require('../controller/productController');

router.get('/get', getProducts);
router.post('/add', addProduct);

module.exports = router;