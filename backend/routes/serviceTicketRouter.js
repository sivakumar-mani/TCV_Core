const express = require('express');
const router = express.Router();
const { getServiceTickets, addServiceTicket, updateServiceTicket, deleteServiceTicket } = require('../controller/serviceTicketController');

router.get('/', getServiceTickets);
router.get('/get', getServiceTickets);
router.post('/', addServiceTicket);
router.post('/add', addServiceTicket);
router.patch('/', updateServiceTicket);
router.patch('/update', updateServiceTicket);
router.delete('/', deleteServiceTicket);
router.delete('/delete', deleteServiceTicket);

module.exports = router;
