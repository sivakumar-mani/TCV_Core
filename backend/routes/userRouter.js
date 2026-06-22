const express = require('express');
const router = express.Router();
const { getCaptcha, login, forgotPassword, changePassword, signup, getAllUser, getMyPermissions, editUser, deleteUser } = require('../controller/userController')
const auth = require('../services/authendication');

router.post('/login', login);
router.get('/captcha', getCaptcha);
router.post('/forgotPassword', forgotPassword);
router.post('/changePassword', auth.authendicateToken, changePassword);
router.get('/my-permissions', auth.authendicateToken, getMyPermissions);
router.post('/signup', auth.authendicateToken, auth.requireAdmin, signup);
router.get('/get', auth.authendicateToken, auth.requireAdmin, getAllUser);
router.patch('/editUser', auth.authendicateToken, auth.requireAdmin, editUser);
router.delete('/deleteUser', auth.authendicateToken, auth.requireAdmin, deleteUser);

module.exports = router;
