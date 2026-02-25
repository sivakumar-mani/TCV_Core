const express = require('express');
const router = express.Router();
const { login, forgotPassword ,changePassword} = require('../controller/userController')

router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.post('/changePassword', changePassword);

module.exports = router;