import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyEmail,
  forgotPassword as forgot,
  resetPassword as reset,
} from '../controller/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';


const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post("/verify", verifyEmail);
router.post('/forgot-pasword',forgot);
router.post('/reset-pasword',reset); 


router.get('/profile', authMiddleware, getUserProfile);

export default router;
