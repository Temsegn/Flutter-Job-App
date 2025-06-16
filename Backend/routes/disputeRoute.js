import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  raiseDispute,
  getDispute,
  getMyDisputes,
  resolveDispute,
} from '../controller/disputeController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(raiseDispute)
  .get(getMyDisputes);

router.route('/:id')
  .get(getDispute);

router.use(verifyAdmin);

router.route('/:id/resolve')
  .patch(resolveDispute);

export default router;