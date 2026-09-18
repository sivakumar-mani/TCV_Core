const express = require('express');
const router = express.Router();
const {
  getQuotations,
  getQuotationById,
  getNextQuotationNo,
  addQuotation,
  updateQuotation,
  approveQuotation,
  submitQuotation,
  updateCustomerResponse,
  deleteQuotation
} = require('../controller/quotationController');

const templates = require('../controller/quotationTemplateController');
const { requireAdmin } = require('../services/authendication');
router.get('/templates', templates.list);
router.get('/templates/:id', templates.get);
router.post('/templates', requireAdmin, templates.save);
router.put('/templates/:id', requireAdmin, templates.save);

router.get('/', getQuotations);
router.get('/get', getQuotations);
router.get('/next-no', getNextQuotationNo);
router.get('/get/:quotation_id', getQuotationById);
router.get('/:quotation_id', getQuotationById);
router.post('/', addQuotation);
router.post('/add', addQuotation);
router.patch('/', updateQuotation);
router.patch('/update', updateQuotation);
router.patch('/:quotation_id', (req, res) => {
  req.body.quotation_id = req.body.quotation_id || req.params.quotation_id;
  return updateQuotation(req, res);
});
router.patch('/:quotation_id/approve', approveQuotation);
router.patch('/:quotation_id/submit', submitQuotation);
router.patch('/:quotation_id/customer-response', updateCustomerResponse);
router.delete('/', deleteQuotation);
router.delete('/delete', deleteQuotation);
router.delete('/:quotation_id', deleteQuotation);

module.exports = router;
