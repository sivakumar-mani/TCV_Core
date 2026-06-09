const express = require('express');
const router = express.Router();
const {addBrand, getBrands, deleteBrand, editBrand} = require('../controller/brandController');
const auth = require('../services/authendication')

router.post('/', auth.authendicateToken, addBrand);
router.post('/add',auth.authendicateToken, addBrand);
router.get('/', auth.authendicateToken, getBrands);
router.get('/get',auth.authendicateToken, getBrands);
//router.delete("/delete/:brand_id", deleteBrand);// passing id through url
router.patch("/", auth.authendicateToken, editBrand);
router.patch("/edit",auth.authendicateToken, editBrand);
router.patch("/:brand_id", auth.authendicateToken, (req, res) => {
  req.body.brand_id = req.body.brand_id || req.params.brand_id;
  return editBrand(req, res);
});
router.delete("/delete",auth.authendicateToken, deleteBrand);
router.delete("/:brand_id", auth.authendicateToken, (req, res) => {
  req.body.brand_id = req.body.brand_id || req.params.brand_id;
  return deleteBrand(req, res);
});

module.exports = router
