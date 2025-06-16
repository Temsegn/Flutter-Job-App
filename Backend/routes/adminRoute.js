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
  getSystemStats,
  createJob,
  updateJob,
  deleteJob,
  getAllJobs,
  getSingleJob,
  searchJobs,
  getJobApplications,
  updateApplicationStatus,
  getJobProposals,
  updateProposalStatus,
} from '../controller/adminController.js';

const router = express.Router();

// All routes protected by auth + admin check
router.use(authMiddleware, verifyAdmin);

// User Management Routes
router.route('/users')
  .get(getAllUsers); // Get all users

router.route('/users/:id')
  .get(getSingleUser) // Get a single user by ID
  .delete(deleteUser); // Delete a user by ID

router.route('/block/:id')
  .patch(blockUser); // Block a user by ID

router.route('/unblock/:id')
  .patch(unblockUser); // Unblock a user by ID

// Job Management Routes
router.route('/jobs')
  .get(getAllJobs) // Get all jobs
  .post(createJob); // Create a new job

router.route('/jobs/search')
  .get(searchJobs); // Search and filter jobs (e.g., ?q=keyword&category=dev)

router.route('/jobs/:id')
  .get(getSingleJob) // Get a single job by ID
  .patch(updateJob) // Update a job by ID
  .delete(deleteJob); // Delete a job by ID

// Job Application Management Routes
router.route('/jobs/:id/applications')
  .get(getJobApplications); // Get all applications for a job

router.route('/applications/:applicationId/status')
  .patch(updateApplicationStatus); // Update application status by application ID

// Job Proposal Management Routes
router.route('/jobs/:id/proposals')
  .get(getJobProposals); // Get all proposals for a job

router.route('/proposals/:proposalId/status')
  .patch(updateProposalStatus); // Update proposal status by proposal ID

// Statistics Routes
router.route('/job-stats')
  .get(getJobStats); // View job-related statistics (posted jobs, applicants, etc.)

router.route('/system-stats')
  .get(getSystemStats); // View system-wide statistics (user count, job count, etc.)

export default router;