import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import Notification from '../models/notification.js';

// Get all users (admin)
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -verificationCode').sort('username');
  res.status(200).json({ users, count: users.length });
});

// Get single user by ID (admin)
export const getSingleUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password -verificationCode');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ user });
});

// Get own profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId || req.user._id).select('-password -verificationCode');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ user });
});

// Update own profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, email, location, bio, hourlyRate, profilePicture } = req.body;
  const updates = { username, email, location, bio, hourlyRate, profilePicture };

  const user = await User.findByIdAndUpdate(
    req.user.userId || req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -verificationCode');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ user });
});

// Get freelancer public profile
export const getFreelancerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('username bio skills hourlyRate portfolio reviews location');
  if (!user || !['freelancer', 'user'].includes(user.role)) {
    res.status(404);
    throw new Error('Freelancer not found');
  }
  res.status(200).json({ user });
});

// Search freelancers
export const searchFreelancers = asyncHandler(async (req, res) => {
  const { q, skills, location } = req.query;
  let query = { role: 'freelancer' };

  if (q) {
    query.$or = [
      { username: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
    ];
  }
  if (skills) {
    query.skills = { $in: skills.split(',').map(s => new RegExp(s.trim(), 'i')) };
  }
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  const freelancers = await User.find(query).select('username bio skills hourlyRate location');
  res.status(200).json({ freelancers, count: freelancers.length });
});

// Add portfolio item
export const addPortfolio = asyncHandler(async (req, res) => {
  const { title, description, url, imageUrl } = req.body;
  if (!title || !description) {
    res.status(400);
    throw new Error('Title and description are required');
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.portfolio.push({ title, description, url, imageUrl });
  await user.save();

  res.status(200).json({ portfolio: user.portfolio });
});

// Update portfolio item
export const updatePortfolio = asyncHandler(async (req, res) => {
  const { portfolioId, title, description, url, imageUrl } = req.body;
  if (!portfolioId) {
    res.status(400);
    throw new Error('Portfolio ID is required');
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const portfolioItem = user.portfolio.id(portfolioId);
  if (!portfolioItem) {
    res.status(404);
    throw new Error('Portfolio item not found');
  }

  portfolioItem.set({ title, description, url, imageUrl });
  await user.save();

  res.status(200).json({ portfolio: user.portfolio });
});

// Delete portfolio item
export const deletePortfolio = asyncHandler(async (req, res) => {
  const { portfolioId } = req.body;
  if (!portfolioId) {
    res.status(400);
    throw new Error('Portfolio ID is required');
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.portfolio.pull(portfolioId);
  await user.save();

  res.status(200).json({ msg: 'Portfolio item deleted', portfolio: user.portfolio });
});

// Add skill
export const addSkill = asyncHandler(async (req, res) => {
  const { skill } = req.body;
  if (!skill) {
    res.status(400);
    throw new Error('Skill is required');
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.skills.includes(skill)) {
    user.skills.push(skill);
    await user.save();
  }

  res.status(200).json({ skills: user.skills });
});

// Delete skill
export const deleteSkill = asyncHandler(async (req, res) => {
  const { skill } = req.body;
  if (!skill) {
    res.status(400);
    throw new Error('Skill is required');
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.skills = user.skills.filter(s => s !== skill);
  await user.save();

  res.status(200).json({ skills: user.skills });
});

// Get user reviews
export const getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewedId: req.params.userId }).populate('reviewerId', 'username');
  res.status(200).json({ reviews, count: reviews.length });
});

// Add review (handled in reviewController.js, but route is in userRouter.js)
export const addReview = asyncHandler(async (req, res) => {
  // Redirect to reviewController for consistency
  const { contractId, rating, comment } = req.body;
  if (!contractId || !rating) {
    res.status(400);
    throw new Error('Contract ID and rating are required');
  }

  const review = await Review.create({
    contractId,
    reviewerId: req.user.userId || req.user._id,
    reviewedId: req.params.userId,
    rating,
    comment,
  });

  await Notification.create({
    userId: req.params.userId,
    type: 'review_received',
    message: `You received a new review from ${req.user.username}`,
    reviewId: review._id,
    status: 'unread',
  });

  res.status(201).json({ review });
});

// Block user (admin)
export const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isBlocked: true },
    { new: true }
  ).select('-password -verificationCode');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await Notification.create({
    userId: user._id,
    type: 'user_blocked',
    message: 'Your account has been blocked by an admin',
    status: 'unread',
  });

  res.status(200).json({ msg: 'User blocked', user });
});

// Unblock user (admin)
export const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isBlocked: false },
    { new: true }
  ).select('-password -verificationCode');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await Notification.create({
    userId: user._id,
    type: 'user_unblocked',
    message: 'Your account has been unblocked',
    status: 'unread',
  });

  res.status(200).json({ msg: 'User unblocked', user });
});

// Delete user (admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (['admin', 'agent'].includes(user.role)) {
    res.status(403);
    throw new Error('Cannot delete admin or agent');
  }

  await User.deleteOne({ _id: req.params.userId });
  await Job.deleteMany({ postedBy: req.params.userId });
  await Application.deleteMany({ userId: req.params.userId });
  await Proposal.deleteMany({ userId: req.params.userId });
  await Notification.deleteMany({ userId: req.params.userId });
  await Bookmark.deleteMany({ user: req.params.userId });

  res.status(200).json({ msg: 'User and related data deleted' });
});