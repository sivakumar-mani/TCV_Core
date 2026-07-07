const express = require('express');
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
