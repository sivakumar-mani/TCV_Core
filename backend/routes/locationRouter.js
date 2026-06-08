const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const { getStates, getDistricts } = require('../controller/locationController');

router.get('/states', auth.authendicateToken, getStates);
router.get('/districts/:state_id', auth.authendicateToken, getDistricts);

module.exports = router;
