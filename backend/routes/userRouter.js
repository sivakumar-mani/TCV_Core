const express = require('express');
const router = express.Router();
const { login, forgotPassword } = require('../controller/userController')

router.post('/login', login);
router.post('/forgotPassword', forgotPassword);

module.exports = router;