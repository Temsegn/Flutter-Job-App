import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  addReview,
  getReviewsByUser,
  updateReview,
  deleteReview,
} from '../controller/reviewController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(addReview);

router.route('/user/:userId')
  .get(getReviewsByUser);

router.route('/:id')
  .patch(updateReview)
  .delete(deleteReview);

export default router;