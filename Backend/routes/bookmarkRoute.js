import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  addBookmark,
  getMyBookmarks,
  deleteBookmark,
} from '../controller/bookmarkController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(addBookmark) // Add job to bookmarks
  .get(getMyBookmarks); // Get user's bookmarks

router.route('/:id')
  .delete(deleteBookmark); // Remove bookmark

export default router;