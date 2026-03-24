const express = require('express');
const router = express.Router();
const {addBrand, getBrands, deleteBrand, editBrand} = require('../controller/brandController');
const auth = require('../services/authendication')

router.post('/add',auth.authendicateToken, addBrand);
router.get('/get',auth.authendicateToken, getBrands);
//router.delete("/delete/:brand_id", deleteBrand);// passing id through url
router.patch("/edit",auth.authendicateToken, editBrand);
router.delete("/delete",auth.authendicateToken, deleteBrand);

module.exports = router