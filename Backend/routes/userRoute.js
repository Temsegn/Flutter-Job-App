import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  getUserProfile,
  updateUserProfile,
  getFreelancerProfile,
  searchFreelancers,
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  addSkill,
  deleteSkill,
  getUserReviews,
  addReview,
  getAllUsers,
  getSingleUser,
  blockUser,
  unblockUser,
  deleteUser,
} from '../controller/userController.js';

const router = express.Router();

// Public routes
router.route('/freelancers/:userId')
  .get(getFreelancerProfile); // Get freelancer public profile

router.route('/freelancers/search')
  .get(searchFreelancers); // Search freelancers (?q=web&skills=javascript)

// Authenticated routes
router.use(authMiddleware);

router.route('/profile')
  .get(getUserProfile) // Get own profile
  .patch(updateUserProfile); // Update profile (bio, hourlyRate)

router.route('/portfolio')
  .post(addPortfolio)
  .patch(updatePortfolio)
  .delete(deletePortfolio);

router.route('/skills')
  .post(addSkill)
  .delete(deleteSkill);

router.route('/reviews/:userId')
  .get(getUserReviews) // Get reviews for a user
  .post(addReview); // Add review (post-contract)

// Admin routes
router.use(verifyAdmin);

router.route('/')
  .get(getAllUsers);

router.route('/:userId')
  .get(getSingleUser)
  .delete(deleteUser);

router.route('/block/:userId')
  .patch(blockUser);

router.route('/unblock/:userId')
  .patch(unblockUser);

export default router;