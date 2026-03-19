const express = require('express');
const router = express.Router();
const { login, forgotPassword ,changePassword, signup, getAllUser, editUser, deleteUser} = require('../controller/userController')
const auth = require('../services/authendication')
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.post('/changePassword', auth.authendicateToken, changePassword);
router.post('/signup', auth.authendicateToken, signup);
router.get('/get', auth.authendicateToken, getAllUser);
router.patch('/editUser', auth.authendicateToken, editUser);
router.delete('/deleteUser', auth.authendicateToken, deleteUser);

module.exports = router;