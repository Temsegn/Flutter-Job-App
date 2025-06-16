import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  createContract,
  getContract,
  updateContractStatus,
  addMilestone,
  updateMilestone,
  completeMilestone,
  getMyContracts,
  getAllContracts,
} from '../controller/contractController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(createContract)
  .get(getMyContracts);

router.route('/:id')
  .get(getContract)
  .patch(updateContractStatus);

router.route('/:id/milestones')
  .post(addMilestone)
  .patch(updateMilestone);

router.route('/:id/milestones/:milestoneId/complete')
  .patch(completeMilestone);

router.use(verifyAdmin);

router.route('/all')
  .get(getAllContracts);

export default router;