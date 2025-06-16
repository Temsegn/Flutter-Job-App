import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  getMyNotifications,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  createSystemAnnouncement,
} from '../controller/notificationController.js';

const router = express.Router();

// User routes (protected by authMiddleware)
router.use(authMiddleware);

router.route('/')
  .get(getMyNotifications); // Get all notifications for the authenticated user

router.route('/:notificationId')
  .delete(deleteNotification); // Delete a specific notification

router.route('/all')
  .delete(deleteAllNotifications); // Delete all notifications for the user

router.route('/:notificationId/read')
  .patch(markAsRead); // Mark a notification as read

router.route('/:notificationId/unread')
  .patch(markAsUnread); // Mark a notification as unread

router.route('/mark-all-read')
  .patch(markAllAsRead); // Mark all notifications as read

// Admin routes (protected by authMiddleware and verifyAdmin)
router.route('/create')
  .post(authMiddleware, verifyAdmin, createNotification); // Create a notification (admin only)

router.route('/system-announcement')
  .post(authMiddleware, verifyAdmin, createSystemAnnouncement); // Create a system announcement for all users (admin only)

export default router;