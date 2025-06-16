import asyncHandler from 'express-async-handler';
import Bookmark from '../models/bookmark.js';
import Job from '../models/job.js';

// Add bookmark
export const addBookmark = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    res.status(400);
    throw new Error('Job ID is required');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const bookmarkExists = await Bookmark.findOne({
    user: req.user.userId || req.user._id,
    job: jobId,
  });
  if (bookmarkExists) {
    res.status(400);
    throw new Error('Bookmark already exists');
  }

  const bookmark = await Bookmark.create({
    user: req.user.userId || req.user._id,
    job: jobId,
    title: job.title,
    imageUrl: job.imageUrl,
    company: job.company,
    location: job.location,
  });

  res.status(201).json({ bookmark });
});

// Get user's bookmarks
export const getMyBookmarks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const bookmarks = await Bookmark.find({ user: req.user.userId || req.user._id })
    .populate('job', 'title company location')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Bookmark.countDocuments({ user: req.user.userId || req.user._id });
  res.status(200).json({ bookmarks, count, pages: Math.ceil(count / limit) });
});

// Delete bookmark
export const deleteBookmark = asyncHandler(async (req, res) => {
  const bookmark = await Bookmark.findOneAndDelete({
    _id: req.params.id,
    user: req.user.userId || req.user._id,
  });
  if (!bookmark) {
    res.status(404);
    throw new Error('Bookmark not found or unauthorized');
  }
  res.status(200).json({ msg: 'Bookmark deleted' });
});