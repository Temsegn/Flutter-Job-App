import express from 'express';
import {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logoutUser,
} from '../controller/authController.js';

const router = express.Router();

router.route('/register')
  .post(registerUser); // Register user (client/freelancer)

router.route('/login')
  .post(loginUser); // Login user

router.route('/verify-email')
  .post(verifyEmail); // Verify email with code

router.route('/forgot-password')
  .post(forgotPassword); // Send password reset link

router.route('/reset-password')
  .post(resetPassword); // Reset password with token

router.route('/logout')
  .post(logoutUser); // Logout user

export default router;