import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createReview,
  getUserReviews,
  updateReview,
  deleteReview,
} from '../controller/reviewController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(createReview);

router.route('/user/:userId')
  .get(getUserReviews);

router.route('/:id')
  .patch(updateReview)
  .delete(deleteReview);

export default router;