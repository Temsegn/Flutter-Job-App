import express from 'express';
import { check, validationResult } from 'express-validator';
import { registerUser, loginUser, verifyEmail, resendVerificationEmail, forgotPassword, verifyCode, resetPassword, changePassword, logoutUser } from '../controller/authController.js';
import { loginRateLimit } from '../middleware/rateLimitMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/register')
  .post(
    [
      check('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters'),
      check('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
      check('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
      check('location')
        .trim()
        .notEmpty()
        .withMessage('Location is required'),
      check('role')
        .isIn(['freelancer', 'client'])
        .withMessage('Role must be freelancer or client'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    registerUser
  );

router.route('/login')
  .post(
    [
      check('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
      check('password')
        .notEmpty()
        .withMessage('Password is required'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    loginRateLimit,
    loginUser
  );

router.route('/verify-email')
  .post(
    [
      check('email').isEmail().withMessage('Invalid email format'),
      check('code').notEmpty().withMessage('Verification code is required'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    verifyEmail
  );

router.route('/resend-verification')
  .post(
    [
      check('email').isEmail().withMessage('Invalid email format'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    resendVerificationEmail
  );

router.route('/forgot-password')
  .post(
    [
      check('email').isEmail().withMessage('Invalid email format'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    forgotPassword
  );

router.route('/verify-code')
  .post(
    [
      check('email').isEmail().withMessage('Invalid email format'),
      check('code').notEmpty().withMessage('Verification code is required'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    verifyCode
  );

router.route('/reset-password')
  .post(
    [
      check('resetToken').notEmpty().withMessage('Reset token is required'),
      check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    resetPassword
  );

router.route('/change-password')
  .post(
    authMiddleware,
    [
      check('oldPassword').notEmpty().withMessage('Old password is required'),
      check('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400);
        return res.json({ msg: 'Validation failed', errors: errors.array() });
      }
      next();
    },
    changePassword
  );

router.route('/logout').post(logoutUser);

export default router;