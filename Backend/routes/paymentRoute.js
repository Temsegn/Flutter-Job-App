import express from 'express';
import { check, validationResult } from 'express-validator';
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
} from '../controllers/paymentController.js';

const router = express.Router();

// Input validation middleware
const validatePaymentIntent = [
  check('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),
  check('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  check('paymentMethod')
    .isIn(['telebirr', 'cbe', 'mpesa'])
    .withMessage('Invalid payment method'),
];

const validateWithdrawal = [
  check('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  check('paymentMethod')
    .isIn(['telebirr', 'cbe', 'mpesa'])
    .withMessage('Invalid payment method'),
  check('accountDetails')
    .notEmpty()
    .withMessage('Account details are required'),
];

const validateInvoice = [
  check('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),
  check('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
];

router.use(authMiddleware);

router.route('/intent')
  .post(
    validatePaymentIntent,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    createPaymentIntent
  );

router.route('/callback')
  .post(confirmPayment);

router.route('/invoices')
  .post(
    validateInvoice,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    createInvoice
  )
  .get(getMyInvoices);

router.route('/withdrawals')
  .post(
    validateWithdrawal,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    requestWithdrawal
  )
  .get(getMyWithdrawals);

router.use(verifyAdmin);

router.route('/payments')
  .get(getAllPayments);

router.route('/withdrawals/:id/process')
  .patch(
    check('id').isMongoId().withMessage('Invalid withdrawal ID'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    processWithdrawal
  );

export default router;