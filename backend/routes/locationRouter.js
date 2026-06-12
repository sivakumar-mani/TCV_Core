const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const { 
  getStates, 
  getDistricts,
  getStatesFromDB,
  getDistrictsByStateDB,
  getStatesWithDistrictsDB,
  getIdProofTypes,
  getDepartments
} = require('../controller/locationController');

// Legacy external API routes
router.get('/states', auth.authendicateToken, getStates);
router.get('/districts/:state_id', auth.authendicateToken, getDistricts);

// Database-based routes
router.get('/db/states', auth.authendicateToken, getStatesFromDB);
router.get('/db/districts/:state_id', auth.authendicateToken, getDistrictsByStateDB);
router.get('/db/states-with-districts', auth.authendicateToken, getStatesWithDistrictsDB);

// Dropdown data routes
router.get('/id-proof-types', auth.authendicateToken, getIdProofTypes);
router.get('/departments', auth.authendicateToken, getDepartments);

module.exports = router;
