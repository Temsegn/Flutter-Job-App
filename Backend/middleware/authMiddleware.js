import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const authMiddleware = asyncHandler(async (req, res, next) => {
  // Check for token in cookies or Authorization header
  let token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401);
    throw new Error('Authentication token missing');
  }

  if (!process.env.JWT_SECRET) {
    res.status(500);
    throw new Error('JWT_SECRET is not defined');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch user and exclude sensitive fields
    const user = await User.findById(decoded.userId).select('-password -verificationCode -resetPasswordToken -resetPasswordExpiresAt');
    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }
    // Check if user is blocked
    if (user.isBlocked) {
      res.status(403);
      throw new Error('Account is blocked');
    }
    // Attach user to request
    req.user = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error.message); // Debug
    res.status(401);
    throw new Error('Invalid or expired token');
  }
});

export default authMiddleware;