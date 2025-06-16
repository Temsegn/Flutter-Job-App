import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  getAllUsers,
  getSingleUser,
  blockUser,
  unblockUser,
  deleteUser,
  createJob,
  getAllJobs,
  searchJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  getJobApplications,
  updateApplicationStatus,
  getJobProposals,
  updateProposalStatus,
  getJobStats,
  getSystemStats,
  getAllContracts,
  getAllPayments,
  resolveDispute,
} from '../controller/adminController.js';

const router = express.Router();

router.use(authMiddleware, verifyAdmin);

// User management
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .get(getSingleUser)
  .delete(deleteUser);

router.route('/users/block/:id')
  .patch(blockUser);

router.route('/users/unblock/:id')
  .patch(unblockUser);

// Job management
router.route('/jobs')
  .get(getAllJobs)
  .post(createJob);

router.route('/jobs/search')
  .get(searchJobs);

router.route('/jobs/:id')
  .get(getSingleJob)
  .patch(updateJob)
  .delete(deleteJob);

// Applications
router.route('/jobs/:id/applications')
  .get(getJobApplications);

router.route('/applications/:applicationId/status')
  .patch(updateApplicationStatus);

// Proposals
router.route('/jobs/:id/proposals')
  .get(getJobProposals);

router.route('/proposals/:proposalId/status')
  .patch(updateProposalStatus);

// Contracts
router.route('/contracts')
  .get(getAllContracts);

// Payments
router.route('/payments')
  .get(getAllPayments);

// Disputes
router.route('/disputes/:disputeId/resolve')
  .patch(resolveDispute);

// Stats
router.route('/job-stats')
  .get(getJobStats);

router.route('/system-stats')
  .get(getSystemStats);

export default router;