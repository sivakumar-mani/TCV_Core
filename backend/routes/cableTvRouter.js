const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const {
  addArea,
  addCableCustomer,
  addLocation,
  addLocationInfo,
  addPackage,
  addStbMaster,
  addStreet,
  deleteLocationInfo,
  getCableCustomerById,
  getCableCustomers,
  getLookups,
  getMasters,
  getPendingAccounts,
  receiveAccount,
  updateLocationInfo,
  updateCableCustomer
} = require('../controller/cableTvController');

router.use(auth.authendicateToken);
router.use('/lookups', auth.requireAnyPermission(['CABLE_TV_CUSTOMERS', 'CABLE_TV_MASTERS']));
router.use('/masters', auth.requirePermission('CABLE_TV_MASTERS'));
router.use('/accounts', auth.requirePermission('CABLE_TV_MASTERS'));
router.use('/customers', auth.requirePermission('CABLE_TV_CUSTOMERS'));

router.get('/lookups', getLookups);
router.get('/masters', getMasters);
router.post('/masters/locations', addLocation);
router.post('/masters/areas', addArea);
router.post('/masters/streets', addStreet);
router.post('/masters/location-info', addLocationInfo);
router.patch('/masters/location-info/:streetId', updateLocationInfo);
router.delete('/masters/location-info/:streetId', deleteLocationInfo);
router.post('/masters/packages', addPackage);
router.post('/masters/stbs', addStbMaster);
router.get('/accounts/pending', getPendingAccounts);
router.patch('/accounts/:accountId/receive', receiveAccount);
router.get('/customers', getCableCustomers);
router.get('/customers/:id', getCableCustomerById);
router.post('/customers', addCableCustomer);
router.patch('/customers/:id', updateCableCustomer);

module.exports = router;
