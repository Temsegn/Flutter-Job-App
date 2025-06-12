import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  getAllUsers,
  getSingleUser,
  blockUser,
  unblockUser,
  deleteUser,
  getJobStats,
  getSystemStats
} from '../controller/adminController.js';

const router = express.Router();

// All routes protected by auth + admin check
router.use(authMiddleware, verifyAdmin);

// Get all users
router.get('/users', getAllUsers);

// Get a single user by ID
router.get('/users/:id', getSingleUser);

// Block a user
router.patch('/block/:id', blockUser);

// Unblock a user
router.patch('/unblock/:id', unblockUser);

// Delete a user
router.delete('/users/:id', deleteUser);

// View job stats (posted jobs, applicants, etc.)
router.get('/job-stats', getJobStats);

// View system-wide stats (user count, job count, etc.)
router.get('/system-stats', getSystemStats);

export default router;
