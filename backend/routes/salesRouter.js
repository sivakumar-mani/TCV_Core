const express = require('express');
const router = express.Router();
const { getSales, addSale, updateSale, deleteSale } = require('../controller/salesController');

router.get('/', getSales);
router.get('/get', getSales);
router.post('/', addSale);
router.post('/add', addSale);
router.patch('/', updateSale);
router.patch('/update', updateSale);
router.delete('/', deleteSale);
router.delete('/delete', deleteSale);

module.exports = router;
