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

router.use(authMiddleware);

router.route('/')
  .get(getMyNotifications);

router.route('/:id')
  .delete(deleteNotification);

router.route('/all')
  .delete(deleteAllNotifications);

router.route('/:id/read')
  .patch(markAsRead);

router.route('/:id/unread')
  .patch(markAsUnread);

router.route('/mark-all-read')
  .patch(markAllAsRead);

router.route('/create')
  .post(verifyAdmin, createNotification);

router.route('/system-announcement')
  .post(verifyAdmin, createSystemAnnouncement);

export default router;