const express = require('express');
const router = express.Router();
const auth = require('../services/authendication');
const {
    addMaterialIssue,
    addMaterialReturn,
    getMaterialIssues,
    getMaterialReturns,
    updateMaterialIssueStatus,
    updateMaterialReturnStatus
} = require('../controller/materialController');

router.get('/issue/get', auth.authendicateToken, getMaterialIssues);
router.post('/issue/add', auth.authendicateToken, addMaterialIssue);
router.patch('/issue/status/:material_issue_id', auth.authendicateToken, updateMaterialIssueStatus);

router.get('/return/get', auth.authendicateToken, getMaterialReturns);
router.post('/return/add', auth.authendicateToken, addMaterialReturn);
router.patch('/return/status/:material_return_id', auth.authendicateToken, updateMaterialReturnStatus);

module.exports = router;
