const router = require('express').Router();
const auth = require('../services/authendication');
const controller = require('../controller/permissionController');

router.use(auth.authendicateToken, auth.requireAdmin);
router.get('/', controller.getPermissions);
router.put('/:role', controller.updatePermissions);

module.exports = router;
