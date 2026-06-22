const express = require('express');
const router = express.Router();
const { getWorkflowApprovals, approveWorkflow } = require('../controller/workflowController');

router.get('/', getWorkflowApprovals);
router.post('/:workflow_id/approve', approveWorkflow);
router.get('/get', getWorkflowApprovals);

module.exports = router;
