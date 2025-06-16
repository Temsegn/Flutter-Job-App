import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import Job from '../models/job.js';
import Application from '../models/application.js';
import Proposal from '../models/proposal.js';
import Notification from '../models/notification.js';

// Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort('name');
  res.status(200).json({ users, count: users.length });
});

// Get a single user by ID
export const getSingleUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ user });
});

// Block a user
export const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Notify the user
  await Notification.create({
    userId: user._id,
    type: 'user_blocked',
    message: 'Your account has been blocked by an admin.',
    status: 'unread',
  });

  res.status(200).json({ msg: 'User blocked', user });
});

// Unblock a user
export const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Notify the user
  await Notification.create({
    userId: user._id,
    type: 'user_unblocked',
    message: 'Your account has been unblocked.',
    status: 'unread',
  });

  res.status(200).json({ msg: 'User unblocked', user });
});

// Delete a user
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Delete related data
  await Job.deleteMany({ postedBy: req.params.id });
  await Application.deleteMany({ userId: req.params.id });
  await Proposal.deleteMany({ userId: req.params.id });
  await Notification.deleteMany({ userId: req.params.id });

  res.status(200).json({ msg: 'User and related data deleted' });
});

// Create a new job
export const createJob = asyncHandler(async (req, res) => {
  const { title, description, company, location, period, contractType, requirements, imageUrl, salary } = req.body;
  if (!title || !description || !company || !location || !period || !contractType || !requirements || !salary) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  const job = await Job.create({
    ...req.body,
    postedBy: req.user.userId || req.user._id,
  });

  // Notify all non-blocked users
  const users = await User.find({ isBlocked: false, role: { $ne: 'admin' } });
  const notifications = users.map(user => ({
    userId: user._id,
    type: 'job_posted',
    message: `New job posted: ${title} at ${company}`,
    jobId: job._id,
    status: 'unread',
  }));
  await Notification.insertMany(notifications);

  res.status(201).json({ job });
});

// Get all jobs
export const getAllJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find().populate('postedBy', 'name email').sort('-createdAt');
  res.status(200).json({ jobs, count: jobs.length });
});

// Search jobs
export const searchJobs = asyncHandler(async (req, res) => {
  const { q, category, location } = req.query;
  let query = {};

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { company: { $regex: q, $options: 'i' } },
    ];
  }
  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  const jobs = await Job.find(query).populate('postedBy', 'name email').sort('-createdAt');
  res.status(200).json({ jobs, count: jobs.length });
});

// Get a single job
export const getSingleJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.status(200).json({ job });
});

// Update a job
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('postedBy', 'name email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Notify applicants and proposers
  const applications = await Application.find({ jobId: job._id });
  const proposals = await Proposal.find({ jobId: job._id });
  const notifications = [
    ...applications.map(app => ({
      userId: app.userId,
      type: 'job_updated',
      message: `The job ${job.title} at ${job.company} you applied to has been updated.`,
      jobId: job._id,
      applicationId: app._id,
      status: 'unread',
    })),
    ...proposals.map(prop => ({
      userId: prop.userId,
      type: 'job_updated',
      message: `The job ${job.title} at ${job.company} you submitted a proposal for has been updated.`,
      jobId: job._id,
      proposalId: prop._id,
      status: 'unread',
    })),
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ job });
});

// Delete a job
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Notify applicants and proposers
  const applications = await Application.find({ jobId: job._id });
  const proposals = await Proposal.find({ jobId: job._id });
  const notifications = [
    ...applications.map(app => ({
      userId: app.userId,
      type: 'job_deleted',
      message: `The job ${job.title} at ${job.company} you applied to has been deleted.`,
      jobId: job._id,
      applicationId: app._id,
      status: 'unread',
    })),
    ...proposals.map(prop => ({
      userId: prop.userId,
      type: 'job_deleted',
      message: `The job ${job.title} at ${job.company} you submitted a proposal for has been deleted.`,
      jobId: job._id,
      proposalId: prop._id,
      status: 'unread',
    })),
  ];
  await Notification.insertMany(notifications);

  // Delete related data
  await Application.deleteMany({ jobId: job._id });
  await Proposal.deleteMany({ jobId: job._id });

  res.status(200).json({ msg: 'Job and related data deleted' });
});

// Get applications for a job
export const getJobApplications = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  const applications = await Application.find({ jobId: req.params.id })
    .populate('userId', 'name email')
    .sort('-createdAt');
  res.status(200).json({ applications, count: applications.length });
});

// Update application status
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  const application = await Application.findByIdAndUpdate(
    req.params.applicationId,
    { status },
    { new: true }
  ).populate('userId', 'name email').populate('jobId', 'title company');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Notify the applicant
  await Notification.create({
    userId: application.userId._id,
    type: 'application_status',
    message: `Your application for ${application.jobId.title} at ${application.jobId.company} was ${status}.`,
    jobId: application.jobId._id,
    applicationId: application._id,
    status: 'unread',
  });

  res.status(200).json({ application, msg: 'Application status updated' });
});

// Get proposals for a job
export const getJobProposals = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  const proposals = await Proposal.find({ jobId: req.params.id })
    .populate('userId', 'name email')
    .sort('-createdAt');
  res.status(200).json({ proposals, count: proposals.length });
});

// Update proposal status
export const updateProposalStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  const proposal = await Proposal.findByIdAndUpdate(
    req.params.proposalId,
    { status },
    { new: true }
  ).populate('userId', 'name email').populate('jobId', 'title company');
  if (!proposal) {
    res.status(404);
    throw new Error('Proposal not found');
  }

  // Notify the proposer
  await Notification.create({
    userId: proposal.userId._id,
    type: 'proposal_status',
    message: `Your proposal for ${proposal.jobId.title} at ${proposal.jobId.company} was ${status}.`,
    jobId: proposal.jobId._id,
    proposalId: proposal._id,
    status: 'unread',
  });

  res.status(200).json({ proposal, msg: 'Proposal status updated' });
});

// Get job statistics
export const getJobStats = asyncHandler(async (req, res) => {
  const totalJobs = await Job.countDocuments();
  const totalApplications = await Application.countDocuments();
  const totalProposals = await Proposal.countDocuments();
  const monthlyApplications = await Application.aggregate([
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 6 },
  ]);
  const monthlyProposals = await Proposal.aggregate([
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 6 },
  ]);
  res.status(200).json({
    totalJobs,
    totalApplications,
    totalProposals,
    monthlyApplications,
    monthlyProposals,
  });
});

// Get system-wide statistics
export const getSystemStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalJobs = await Job.countDocuments();
  const totalApplications = await Application.countDocuments();
  const totalProposals = await Proposal.countDocuments();
  const activeUsers = await User.countDocuments({ isBlocked: false });
  const blockedUsers = await User.countDocuments({ isBlocked: true });
  res.status(200).json({
    totalUsers,
    activeUsers,
    blockedUsers,
    totalJobs,
    totalApplications,
    totalProposals,
  });
});