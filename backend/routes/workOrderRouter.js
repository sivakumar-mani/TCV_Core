const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getNextWorkOrderNo,
  getWorkOrders,
  getWorkOrderById,
  addWorkOrder,
  updateWorkOrder,
  addMaterialIssue,
  addMaterialReturn,
  createInvoiceFromWorkOrder
} = require('../controller/workOrderController');

router.get('/materials', getMaterials);
router.get('/next-no', getNextWorkOrderNo);
router.get('/', getWorkOrders);
router.get('/get', getWorkOrders);
router.get('/get/:work_order_id', getWorkOrderById);
router.get('/:work_order_id', getWorkOrderById);
router.post('/', addWorkOrder);
router.post('/add', addWorkOrder);
router.patch('/', updateWorkOrder);
router.patch('/update', updateWorkOrder);
router.patch('/:work_order_id', (req, res) => {
  req.body.work_order_id = req.body.work_order_id || req.params.work_order_id;
  return updateWorkOrder(req, res);
});
router.post('/:work_order_id/material-issue', addMaterialIssue);
router.post('/:work_order_id/material-return', addMaterialReturn);
router.post('/:work_order_id/create-invoice', createInvoiceFromWorkOrder);

module.exports = router;
