const express=require('express');
const auth=require('../services/authendication');
const {internetLookups,getInternetCustomers,getInternetCustomer,saveInternetCustomer,getInternetComplaints,addInternetComplaint}=require('../controller/internetCustomerController');
const router=express.Router(); router.use(auth.authendicateToken); router.use(auth.requirePermission('INTERNET_CUSTOMERS'));
router.get('/lookups',internetLookups); router.get('/customers',getInternetCustomers); router.get('/customers/:id',getInternetCustomer);
router.post('/customers',saveInternetCustomer); router.put('/customers/:id',saveInternetCustomer);
router.get('/customers/:id/complaints',getInternetComplaints); router.post('/customers/:id/complaints',addInternetComplaint);
module.exports=router;
