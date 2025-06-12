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
} from '../controller/jobController.js';

const router = express.Router();
router.route('/')
  .post(authMiddleware, verifyAdmin, createJob)
  .get(getAllJobs);

router.route('/:id')
  .get(getJob)
  .patch(authMiddleware, verifyAdmin, updateJob)
  .delete(authMiddleware, verifyAdmin, deleteJob);

router.post('/createjob', authMiddleware, verifyAgent, createJob);
router.get('/search/:id', authMiddleware, getJob);

export default router;