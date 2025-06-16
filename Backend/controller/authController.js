import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from '../mailtrap.js'; // Adjust path as needed
import generateToken from '../utils/generateToken.js';
import generateCode from '../utils/generateCode.js';

const JWT_SECRET = process.env.JWT_SECRET || 'abegiya';

// Register new user
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, location, role } = req.body;
  if (!username || !email || !password || !location || !role) {
    res.status(400);
    throw new Error('All required fields must be provided');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = generateCode(6);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    location,
    role,
    testPass: password,
    verificationCode,
  });

  await sendVerificationEmail(email, verificationCode);
  await sendWelcomeEmail(email);

  const token = generateToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    msg: 'User registered successfully',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(400);
    throw new Error('Invalid credentials');
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email');
  }

  const token = generateToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    msg: 'Login successful',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error('Email and code are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('User not found');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('User already verified');
  }

  if (user.verificationCode !== code) {
    res.status(400);
    throw new Error('Invalid verification code');
  }

  user.isVerified = true;
  user.verificationCode = null;
  await user.save();

  res.status(200).json({ msg: 'Email verified successfully' });
});

// Resend verification code
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Required email');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('User not found');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('User already verified');
  }

  const newCode = generateCode(6);
  user.verificationCode = newCode;
  await user.save();

  await sendVerificationEmail(email, newCode);
  res.status(200).json({ msg: 'Verification code resent' });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  await sendPasswordResetEmail(email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
  res.status(200).json({ msg: 'Password reset link sent' });
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400);
    throw new Error('Token and password are required');
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiresAt: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  await sendResetSuccessEmail(user.email);
  res.status(200).json({ msg: 'Password reset successful' });
});

// Logout user
export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ msg: 'Logout successful' });
});