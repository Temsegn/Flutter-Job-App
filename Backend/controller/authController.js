import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail } from '../mailtrap/sendEmail.js';
import generateToken from '../utils/generateToken.js';
import generateCode from '../utils/generateCode.js';

const JWT_SECRET = process.env.JWT_SECRET || 'abegiya';

// Register new user
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, location, role, bank, phoneNumber } = req.body;
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
    bank,
    phoneNumber,
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

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(400);
    throw new Error('Invalid credentials');
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email');
  }
  
  let token;
  try {
    token = generateToken(user);
  } catch (err) {
    res.status(500);
    throw new Error('Token generation failed');
  }

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day to match token expiration
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

// Forgot password - Send verification code
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

  const verificationCode = generateCode(6);
  user.resetVerificationCode = verificationCode;
  user.resetVerificationCodeExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  await sendVerificationEmail(email, verificationCode, 'Password Reset Verification Code');
  res.status(200).json({ msg: 'Verification code sent to your email' });
});

// Verify code for password reset
export const verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error('Email and verification code are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (
    user.resetVerificationCode !== code ||
    !user.resetVerificationCodeExpiresAt ||
    user.resetVerificationCodeExpiresAt < Date.now()
  ) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  user.resetVerificationCode = undefined;
  user.resetVerificationCodeExpiresAt = undefined;
  await user.save();

  res.status(200).json({
    msg: 'Verification successful',
    resetToken,
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password } = req.body;
  if (!resetToken || !password) {
    res.status(400);
    throw new Error('Reset token and password are required');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpiresAt: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = await bcrypt.hash(password, 10);
  user.testPass = password; // Update testPass if needed
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  await sendPasswordResetSuccessEmail(user.email);
  res.status(200).json({ msg: 'Password reset successful' });
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id; // From auth middleware

  if (!oldPassword || !newPassword) {
    res.status(400);
    throw new Error('Old password and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Incorrect old password');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.testPass = newPassword; // Update testPass if needed
  await user.save();

  res.status(200).json({ msg: 'Password changed successfully' });
});

// Logout user
export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ msg: 'Logout successful' });
});