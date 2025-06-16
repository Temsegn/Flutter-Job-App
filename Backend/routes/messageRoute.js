import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  sendMessage,
  getConversation,
  getConversations,
  markMessageAsRead,
} from '../controller/messageController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(sendMessage);

router.route('/conversations')
  .get(getConversations);

router.route('/conversations/:id')
  .get(getConversation);

router.route('/messages/:id/read')
  .patch(markMessageAsRead);

export default router;