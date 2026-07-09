const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const { getProducts, addProduct, updateProduct, deleteProduct } = require('../controller/productController');

router.get('/', getProducts);
router.get('/get', getProducts);
router.post('/', addProduct);
router.post('/add', addProduct);
router.patch('/', updateProduct);
router.patch('/update', updateProduct);
router.patch('/:product_id', (req, res) => {
  req.body.product_id = req.body.product_id || req.params.product_id;
  return updateProduct(req, res);
});
router.delete('/:product_id', deleteProduct);
router.delete('/delete/:product_id', deleteProduct);

module.exports = router;
