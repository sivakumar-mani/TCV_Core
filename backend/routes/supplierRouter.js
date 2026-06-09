const express = require('express');
const router = express.Router();
const { addSupplier, updateSupplier, deleteSupplier, getSupplierById, getSuppliers } = require('../controller/supplierController');

router.post('/', addSupplier);
router.post('/add', addSupplier);
router.get('/', getSuppliers);
router.get('/get', getSuppliers);
router.get('/get/:supplier_id', getSupplierById);
router.get('/:supplier_id', getSupplierById);
router.patch('/', updateSupplier);
router.patch('/update', updateSupplier);
router.patch('/:supplier_id', (req, res) => {
  req.body.supplier_id = req.body.supplier_id || req.params.supplier_id;
  return updateSupplier(req, res);
});
router.delete('/delete', deleteSupplier);
router.delete('/:supplier_id', (req, res) => {
  req.body.supplier_id = req.body.supplier_id || req.params.supplier_id;
  return deleteSupplier(req, res);
});

module.exports = router;
