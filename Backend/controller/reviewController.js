import asyncHandler from 'express-async-handler';
import Review from '../models/review.js';
import Contract from '../models/contract.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Create review
export const createReview = asyncHandler(async (req, res) => {
  const { contractId, rating, comment } = req.body;
  if (!contractId || !rating) {
    res.status(400);
    throw new Error('Contract ID and rating are required');
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.status !== 'completed') {
    res.status(400);
    throw new Error('Contract must be completed to leave a review');
  }

  const reviewerId = req.user.userId || req.user._id;
  const reviewedId = contract.clientId.toString() === reviewerId.toString() ? contract.freelancerId : contract.clientId;

  if (![contract.clientId.toString(), contract.freelancerId.toString()].includes(reviewerId.toString())) {
    res.status(403);
    throw new Error('Unauthorized to review this contract');
  }

  const existingReview = await Review.findOne({ contractId, reviewerId });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this contract');
  }

  const review = await Review.create({
    contractId,
    reviewerId,
    reviewedId,
    rating,
    comment,
  });

  await Notification.create({
    userId: reviewedId,
    type: 'review_received',
    message: `You received a ${rating}-star review from ${req.user.username}`,
    reviewId: review._id,
    contractId,
    status: 'unread',
  });

  // Update user's average rating
  const userReviews = await Review.find({ reviewedId });
  const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
  await User.findByIdAndUpdate(reviewedId, { averageRating });

  res.status(201).json({ review });
});

// Get reviews for a user
export const getUserReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const reviews = await Review.find({ reviewedId: req.params.userId })
    .populate('reviewerId', 'username')
    .populate('contractId', 'jobId')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Review.countDocuments({ reviewedId: req.params.userId });
  res.status(200).json({ reviews, count, pages: Math.ceil(count / limit) });
});

// Update review
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating) {
    res.status(400);
    throw new Error('Rating is required');
  }

  const review = await Review.findOneAndUpdate(
    {
      _id: req.params.id,
      reviewerId: req.user.userId || req.user._id,
    },
    { rating, comment },
    { new: true }
  ).populate('reviewerId', 'username').populate('contractId', 'jobId');

  if (!review) {
    res.status(404);
    throw new Error('Review not found or unauthorized');
  }

  await Notification.create({
    userId: review.reviewedId,
    type: 'review_updated',
    message: `Your review from ${req.user.username} was updated`,
    reviewId: review._id,
    contractId: review.contractId,
    status: 'unread',
  });

  // Update user's average rating
  const userReviews = await Review.find({ reviewedId: review.reviewedId });
  const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
  await User.findByIdAndUpdate(review.reviewedId, { averageRating });

  res.status(200).json({ review, msg: 'Review updated' });
});

// Delete review
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({
    _id: req.params.id,
    reviewerId: req.user.userId || req.user._id,
  });

  if (!review) {
    res.status(404);
    throw new Error('Review not found or unauthorized');
  }

  // Update user's average rating
  const userReviews = await Review.find({ reviewedId: review.reviewedId });
  const averageRating = userReviews.length ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length : 0;
  await User.findByIdAndUpdate(review.reviewedId, { averageRating });

  res.status(200).json({ msg: 'Review deleted' });
});