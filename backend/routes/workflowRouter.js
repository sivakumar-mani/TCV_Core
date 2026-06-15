const express = require('express');
const router = express.Router();
const { getWorkflowApprovals } = require('../controller/workflowController');

router.get('/', getWorkflowApprovals);
router.get('/get', getWorkflowApprovals);

module.exports = router;
