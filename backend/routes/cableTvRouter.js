const express = require('express');
const auth = require('../services/authendication');
const router = express.Router();
const {
  getMaterialSalesLookups,
  getTechnicianStock,
  getMaterialMovements,
  addMaterialMovement,
  mapMaterialSaleCustomer,
  addMaterialIssueBatch,
  addMaterialSaleBatch
} = require('../controller/materialSalesController');
const {
  getComplaints,
  getComplaintCustomers,
  getComplaintById,
  addComplaint,
  addComplaintAttempt
} = require('../controller/cableTvComplaintController');
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
  updateStbMaster,
  deleteStbMaster,
  assignStbMaster,
  addStreet,
  getStbPaymentReport,
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
  getLoAccounts,
  getPendingSubscriptions,
  previewSubscriptionGeneration,
  generateMonthlySubscriptions,
  getCableSubscriptionReport,
  getAccountPayments,
  receiveSubscriptionPayment,
  receiveAccount,
  revertAccountToPending,
  updateLocationInfo,
  updateCableCustomer,
  updateCableCustomerInformation,
  updateCustomerConnection,
  updateCustomerPackage,
  removeCustomerPackage,
  updateCustomerStb,
  updateCustomerSubscription
} = require('../controller/cableTvController');

router.use(auth.authendicateToken);
router.use('/lookups', auth.requireAnyPermission([
  'CABLE_TV_CUSTOMERS', 'CABLE_TV_CONNECTIONS', 'CABLE_TV_CUSTOMER_STBS',
  'CABLE_TV_CUSTOMER_PACKAGES', 'CABLE_TV_SUBSCRIPTIONS', 'CABLE_TV_MASTERS',
  'CABLE_TV_PACKAGES', 'CABLE_TV_STBS', 'CABLE_TV_ACCOUNTS',
  'CABLE_TV_SUBSCRIPTION_DUES', 'CABLE_TV_SUBSCRIPTION_REPORT'
]));

router.get('/lookups', getLookups);
router.get('/material-sales/lookups', getMaterialSalesLookups);
router.get('/material-sales/stock', getTechnicianStock);
router.get('/material-sales/movements', getMaterialMovements);
router.post('/material-sales/movements', addMaterialMovement);
router.post('/material-sales/issues/batch', addMaterialIssueBatch);
router.post('/material-sales/sales/batch', addMaterialSaleBatch);
router.patch('/material-sales/movements/:movementId/customer', mapMaterialSaleCustomer);
router.get('/complaints', getComplaints);
router.get('/complaints/customers/lookup', getComplaintCustomers);
router.get('/complaints/:complaintId', getComplaintById);
router.post('/complaints', addComplaint);
router.post('/complaints/:complaintId/attempts', addComplaintAttempt);
router.get('/masters', auth.requireAnyPermission(['CABLE_TV_MASTERS', 'CABLE_TV_PACKAGES', 'CABLE_TV_STBS']), getMasters);
router.post('/masters/locations', auth.requirePermission('CABLE_TV_MASTERS'), addLocation);
router.post('/masters/areas', auth.requirePermission('CABLE_TV_MASTERS'), addArea);
router.post('/masters/streets', auth.requirePermission('CABLE_TV_MASTERS'), addStreet);
router.post('/masters/location-info', auth.requirePermission('CABLE_TV_MASTERS'), addLocationInfo);
router.patch('/masters/location-info/:streetId', auth.requirePermission('CABLE_TV_MASTERS'), updateLocationInfo);
router.delete('/masters/location-info/:streetId', auth.requirePermission('CABLE_TV_MASTERS'), deleteLocationInfo);
router.post('/masters/packages', auth.requirePermission('CABLE_TV_PACKAGES'), addPackage);
router.post('/masters/stbs', auth.requirePermission('CABLE_TV_STBS'), addStbMaster);
router.patch('/masters/stbs/:stbMasterId', auth.requirePermission('CABLE_TV_STBS'), updateStbMaster);
router.delete('/masters/stbs/:stbMasterId', auth.requirePermission('CABLE_TV_STBS'), deleteStbMaster);
router.patch('/masters/stbs/:stbMasterId/assign', auth.requirePermission('CABLE_TV_STBS'), assignStbMaster);
router.get('/accounts/pending', auth.requirePermission('CABLE_TV_ACCOUNTS'), getPendingAccounts);
router.get('/accounts/lo-customers', auth.requirePermission('CABLE_TV_ACCOUNTS'), getLoAccounts);
router.get('/accounts/:accountId/payments', auth.requirePermission('CABLE_TV_ACCOUNTS'), getAccountPayments);
router.patch('/accounts/:accountId/receive', auth.requirePermission('CABLE_TV_ACCOUNTS'), receiveAccount);
router.patch('/accounts/:accountId/revert-pending', auth.requireAdmin, revertAccountToPending);
router.get('/subscriptions/pending', auth.requirePermission('CABLE_TV_SUBSCRIPTION_DUES'), getPendingSubscriptions);
router.get('/subscriptions/generation-preview', auth.requireAdmin, previewSubscriptionGeneration);
router.post('/subscriptions/generate', auth.requireAdmin, generateMonthlySubscriptions);
router.patch('/subscriptions/:subscriptionId/receive', auth.requirePermissionAction('CABLE_TV_SUBSCRIPTION_DUES', 'can_view'), receiveSubscriptionPayment);
router.get('/reports/subscriptions', auth.requirePermission('CABLE_TV_SUBSCRIPTION_REPORT'), getCableSubscriptionReport);
router.get('/reports/stb-payments', auth.requirePermission('CABLE_TV_SUBSCRIPTION_REPORT'), getStbPaymentReport);
router.get('/customers', auth.requirePermission('CABLE_TV_CUSTOMERS'), getCableCustomers);
router.get('/customers/:id', auth.requirePermission('CABLE_TV_CUSTOMERS'), getCableCustomerById);
router.post('/customers', auth.requirePermission('CABLE_TV_CUSTOMERS'), addCableCustomer);
router.patch('/customers/:id', auth.requirePermission('CABLE_TV_CUSTOMERS'), updateCableCustomer);
router.patch('/customers/:id/information', auth.requireAdmin, updateCableCustomerInformation);
router.post('/customers/:id/connections', auth.requirePermission('CABLE_TV_CONNECTIONS'), addCustomerConnection);
router.patch('/customers/:id/connections/:connectionId', auth.requireAdmin, updateCustomerConnection);
router.delete('/customers/:id/connections/:connectionId', auth.requireAdmin, deleteCustomerConnection);
router.post('/customers/:id/stbs', auth.requirePermission('CABLE_TV_CUSTOMER_STBS'), addCustomerStb);
router.patch('/customers/:id/stbs/:stbId', auth.requireAdmin, updateCustomerStb);
router.delete('/customers/:id/stbs/:stbId', auth.requireAdmin, deleteCustomerStb);
router.post('/customers/:id/packages', auth.requirePermission('CABLE_TV_CUSTOMER_PACKAGES'), addCustomerPackage);
router.post('/customers/:id/packages/:packageId/remove', auth.requirePermission('CABLE_TV_CUSTOMER_PACKAGES'), removeCustomerPackage);
router.patch('/customers/:id/packages/:packageId', auth.requireAdmin, updateCustomerPackage);
router.delete('/customers/:id/packages/:packageId', auth.requireAdmin, deleteCustomerPackage);
router.post('/customers/:id/subscriptions', auth.requirePermission('CABLE_TV_SUBSCRIPTIONS'), addCustomerSubscription);
router.patch('/customers/:id/subscriptions/:subscriptionId', auth.requirePermissionAction('CABLE_TV_SUBSCRIPTIONS', 'can_create'), updateCustomerSubscription);
router.delete('/customers/:id/subscriptions/:subscriptionId', auth.requireAdmin, deleteCustomerSubscription);

module.exports = router;
