import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import verifyAgent from '../middleware/verifyAgent.js';
import {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
  searchJobs,
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
  getJobProposals,
  submitProposal,
} from '../controller/jobController.js';

const router = express.Router();

// Public routes
router.route('/')
  .get(getAllJobs) // Get all jobs (publicly accessible)
  .post(authMiddleware, verifyAdmin, createJob); // Create job (admin only)

router.route('/search')
  .get(searchJobs); // Search and filter jobs with query parameters (e.g., ?q=keyword&category=dev&location=remote)

router.route('/:id')
  .get(getJob) // Get single job details (publicly accessible)
  .patch(authMiddleware, verifyAdmin, updateJob) // Update job (admin only)
  .delete(authMiddleware, verifyAdmin, deleteJob); // Delete job (admin only)

// Agent-specific routes
router.route('/createjob')
  .post(authMiddleware, verifyAgent, createJob); // Create job (agent only)

router.route('/search/:id')
  .get(authMiddleware, getJob); // Get job by ID (authenticated users)

// Job application routes
router.route('/:id/apply')
  .post(authMiddleware, applyForJob); // Apply for a job (authenticated users)

router.route('/:id/applications')
  .get(authMiddleware, verifyAdmin, getJobApplications); // Get all applications for a job (admin only)

router.route('/application/:applicationId/status')
  .patch(authMiddleware, verifyAdmin, updateApplicationStatus); // Update application status (admin only)

// Job proposal routes
router.route('/:id/proposals')
  .get(authMiddleware, verifyAdmin, getJobProposals) // Get all proposals for a job (admin only)
  .post(authMiddleware, submitProposal); // Submit a proposal for a job (authenticated users)

// Statistics route
router.route('/stats')
  .get(authMiddleware, verifyAdmin, showStats); // Get job statistics (admin only)

export default router;