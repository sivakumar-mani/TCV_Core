const express = require('express');
const router = express.Router();
const { addSupplier, updateSupplier, deleteSupplier, getAllSuppliers, getSupplierById } = require('../controller/supplierController');

router.post('/add', addSupplier);
router.get('/get', getAllSuppliers);
router.get('/get/:supplier_id', getSupplierById);
router.patch('/update', updateSupplier);
router.delete('/delete', deleteSupplier);

module.exports = router;
