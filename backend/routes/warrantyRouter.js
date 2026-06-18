const express = require('express');
const router = express.Router();
const { getWarranties, addWarranty, updateWarranty, deleteWarranty } = require('../controller/warrantyController');

router.get('/', getWarranties);
router.get('/get', getWarranties);
router.post('/', addWarranty);
router.post('/add', addWarranty);
router.patch('/', updateWarranty);
router.patch('/update', updateWarranty);
router.delete('/', deleteWarranty);
router.delete('/delete', deleteWarranty);

module.exports = router;
