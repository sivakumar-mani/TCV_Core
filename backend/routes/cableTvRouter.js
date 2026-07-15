const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const {
  addArea,
  addCableCustomer,
  addCustomerConnection,
  addCustomerPackage,
  addCustomerStb,
  addCustomerSubscription,
  addLocation,
  addLocationInfo,
  addPackage,
  addStbMaster,
  addStreet,
  deleteLocationInfo,
  deleteCustomerConnection,
  deleteCustomerPackage,
  deleteCustomerStb,
  deleteCustomerSubscription,
  getCableCustomerById,
  getCableCustomers,
  getLookups,
  getMasters,
  getPendingAccounts,
  receiveAccount,
  updateLocationInfo,
  updateCableCustomer,
  updateCustomerConnection,
  updateCustomerPackage,
  updateCustomerStb,
  updateCustomerSubscription
} = require('../controller/cableTvController');

router.use(auth.authendicateToken);
router.use('/lookups', auth.requireAnyPermission(['CABLE_TV_CUSTOMERS', 'CABLE_TV_MASTERS', 'CABLE_TV_PACKAGES', 'CABLE_TV_STBS', 'CABLE_TV_ACCOUNTS']));
router.use('/customers', auth.requirePermission('CABLE_TV_CUSTOMERS'));

router.get('/lookups', getLookups);
router.get('/masters', auth.requireAnyPermission(['CABLE_TV_MASTERS', 'CABLE_TV_PACKAGES', 'CABLE_TV_STBS']), getMasters);
router.post('/masters/locations', auth.requirePermission('CABLE_TV_MASTERS'), addLocation);
router.post('/masters/areas', auth.requirePermission('CABLE_TV_MASTERS'), addArea);
router.post('/masters/streets', auth.requirePermission('CABLE_TV_MASTERS'), addStreet);
router.post('/masters/location-info', auth.requirePermission('CABLE_TV_MASTERS'), addLocationInfo);
router.patch('/masters/location-info/:streetId', auth.requirePermission('CABLE_TV_MASTERS'), updateLocationInfo);
router.delete('/masters/location-info/:streetId', auth.requirePermission('CABLE_TV_MASTERS'), deleteLocationInfo);
router.post('/masters/packages', auth.requirePermission('CABLE_TV_PACKAGES'), addPackage);
router.post('/masters/stbs', auth.requirePermission('CABLE_TV_STBS'), addStbMaster);
router.get('/accounts/pending', auth.requirePermission('CABLE_TV_ACCOUNTS'), getPendingAccounts);
router.patch('/accounts/:accountId/receive', auth.requirePermission('CABLE_TV_ACCOUNTS'), receiveAccount);
router.get('/customers', getCableCustomers);
router.get('/customers/:id', getCableCustomerById);
router.post('/customers', addCableCustomer);
router.patch('/customers/:id', updateCableCustomer);
router.post('/customers/:id/connections', addCustomerConnection);
router.patch('/customers/:id/connections/:connectionId', updateCustomerConnection);
router.delete('/customers/:id/connections/:connectionId', deleteCustomerConnection);
router.post('/customers/:id/stbs', addCustomerStb);
router.patch('/customers/:id/stbs/:stbId', updateCustomerStb);
router.delete('/customers/:id/stbs/:stbId', deleteCustomerStb);
router.post('/customers/:id/packages', addCustomerPackage);
router.patch('/customers/:id/packages/:packageId', updateCustomerPackage);
router.delete('/customers/:id/packages/:packageId', deleteCustomerPackage);
router.post('/customers/:id/subscriptions', addCustomerSubscription);
router.patch('/customers/:id/subscriptions/:subscriptionId', updateCustomerSubscription);
router.delete('/customers/:id/subscriptions/:subscriptionId', deleteCustomerSubscription);

module.exports = router;
