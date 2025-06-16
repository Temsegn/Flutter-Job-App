import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
import {
  createPaymentIntent,
  confirmPayment,
  createInvoice,
  getMyInvoices,
  requestWithdrawal,
  getMyWithdrawals,
  processWithdrawal,
  getAllPayments,
} from '../controller/paymentController.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/intent')
  .post(createPaymentIntent);

router.route('/confirm')
  .post(confirmPayment);

router.route('/invoices')
  .post(createInvoice)
  .get(getMyInvoices);

router.route('/withdrawals')
  .post(requestWithdrawal)
  .get(getMyWithdrawals);

router.use(verifyAdmin);

router.route('/payments')
  .get(getAllPayments);

router.route('/withdrawals/:id/process')
  .patch(processWithdrawal);

export default router;