const express = require('express');
const router = express.Router();
const { getSales, getSaleById, addSale, updateSale, deleteSale } = require('../controller/salesController');

router.get('/', getSales);
router.get('/get', getSales);
router.get('/:sales_id', getSaleById);
router.post('/', addSale);
router.post('/add', addSale);
router.patch('/', updateSale);
router.patch('/update', updateSale);
router.delete('/', deleteSale);
router.delete('/delete', deleteSale);

module.exports = router;
