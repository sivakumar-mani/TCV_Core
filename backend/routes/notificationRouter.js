const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controller/notificationController');

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notification_id/read', markNotificationRead);

module.exports = router;
