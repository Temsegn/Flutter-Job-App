import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import Job from '../models/job.js';
import Application from '../models/application.js';
import Proposal from '../models/proposal.js';
import Notification from '../models/notification.js';
import Contract from '../models/contract.js';
import Payment from '../models/payment.js';
import Dispute from '../models/dispute.js';

// Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -verificationCode').sort('username');
  res.status(200).json({ users, count: users.length });
});

// Get single user
export const getSingleUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -verificationCode');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ user });
});

// Block user
export const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
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

// Unblock user
export const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
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

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await User.deleteOne({ _id: req.params.id });
  await Job.deleteMany({ postedBy: req.params.id });
  await Application.deleteMany({ userId: req.params.id });
  await Proposal.deleteMany({ userId: req.params.id });
  await Notification.deleteMany({ userId: req.params.id });
  await Bookmark.deleteMany({ user: req.params.id });
  await Contract.deleteMany({ $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }] });
  await Payment.deleteMany({ $or: [{ clientId: req.params.id }, { freelancerId: req.params.id }] });

  res.status(200).json({ msg: 'User and related data deleted' });
});

// Create job
export const createJob = asyncHandler(async (req, res) => {
  const { title, description, company, location, period, contractType, requirements, skills, salary } = req.body;
  if (!title || !description || !company || !location || !period || !contractType || !requirements || !salary) {
    res.status(400);
    throw new Error('All required fields must be provided');
  }

  const job = await Job.create({
    ...req.body,
    postedBy: req.user.userId || req.user._id,
  });

  const users = await User.find({ isBlocked: false, role: { $ne: 'admin' } });
  const notifications = users.map(user => ({
    userId: user._id,
    type: 'job_posted',
    message: `New job posted: ${job.title} at ${job.company}`,
    jobId: job._id,
    status: 'unread',
  }));
  await Notification.insertMany(notifications);

  res.status(201).json({ job });
});

// Get all jobs
export const getAllJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const jobs = await Job.find()
    .populate('postedBy', 'username email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Job.countDocuments();
  res.status(200).json({ jobs, count, pages: Math.ceil(count / limit) });
});

// Search jobs
export const searchJobs = asyncHandler(async (req, res) => {
  const { q, skills, location, contractType, page = 1, limit = 10 } = req.query;
  let query = {};

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { company: { $regex: q, $options: 'i' } },
    ];
  }
  if (skills) {
    query.skills = { $in: skills.split(',').map(s => new RegExp(s.trim(), 'i')) };
  }
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  if (contractType) {
    query.contractType = { $regex: contractType, $options: 'i' };
  }

  const jobs = await Job.find(query)
    .populate('postedBy', 'username email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Job.countDocuments(query);
  res.status(200).json({ jobs, count, pages: Math.ceil(count / limit) });
});

// Get single job
export const getSingleJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'username email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.status(200).json({ job });
});

// Update job
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('postedBy', 'username email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const applications = await Application.find({ jobId: job._id });
  const proposals = await Proposal.find({ jobId: job._id });
  const notifications = [
    ...applications.map(app => ({
      userId: app.userId,
      type: 'job_updated',
      message: `The job ${job.title} at ${job.company} you applied to has been updated`,
      jobId: job._id,
      applicationId: app._id,
      status: 'unread',
    })),
    ...proposals.map(prop => ({
      userId: prop.userId,
      type: 'job_updated',
      message: `The job ${job.title} at ${job.company} you submitted a proposal for has been updated`,
      jobId: job._id,
      proposalId: prop._id,
      status: 'unread',
    })),
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ job });
});

// Delete job
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const applications = await Application.find({ jobId: job._id });
  const proposals = await Proposal.find({ jobId: job._id });
  const notifications = [
    ...applications.map(app => ({
      userId: app.userId,
      type: 'job_deleted',
      message: `The job ${job.title} at ${job.company} you applied to has been deleted`,
      jobId: job._id,
      applicationId: app._id,
      status: 'unread',
    })),
    ...proposals.map(prop => ({
      userId: prop.userId,
      type: 'job_deleted',
      message: `The job ${job.title} at ${job.company} you submitted a proposal for has been deleted`,
      jobId: job._id,
      proposalId: prop._id,
      status: 'unread',
    })),
  ];
  await Notification.insertMany(notifications);

  await Application.deleteMany({ jobId: job._id });
  await Proposal.deleteMany({ jobId: job._id });

  res.status(200).json({ msg: 'Job and related data deleted' });
});

// Get job applications
export const getJobApplications = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const applications = await Application.find({ jobId: req.params.id })
    .populate('userId', 'username email')
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
  ).populate('jobId', 'title company').populate('userId', 'username email');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  await Notification.create({
    userId: application.userId._id,
    type: 'application_status',
    message: `Your application for ${application.jobId.title} at ${application.jobId.company} was ${status}`,
    jobId: application.jobId._id,
    applicationId: application._id,
    status: 'unread',
  });

  res.status(200).json({ application, msg: 'Application status updated' });
});

// Get job proposals
export const getJobProposals = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const proposals = await Proposal.find({ jobId: req.params.id })
    .populate('userId', 'username email')
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
  ).populate('jobId', 'title company').populate('userId', 'username email');
  if (!proposal) {
    res.status(404);
    throw new Error('Proposal not found');
  }

  await Notification.create({
    userId: proposal.userId._id,
    type: 'proposal_status',
    message: `Your proposal for ${proposal.jobId.title} at ${proposal.jobId.company} was ${status}`,
    jobId: proposal.jobId._id,
    proposalId: proposal._id,
    status: 'unread',
  });

  res.status(200).json({ proposal, msg: 'Proposal status updated' });
});

// Get job stats
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

// Get system stats
export const getSystemStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalJobs = await Job.countDocuments();
  const totalApplications = await Application.countDocuments();
  const totalProposals = await Proposal.countDocuments();
  const activeUsers = await User.countDocuments({ isBlocked: false });
  const blockedUsers = await User.countDocuments({ isBlocked: true });
  const totalContracts = await Contract.countDocuments();
  const totalPayments = await Payment.countDocuments();

  res.status(200).json({
    totalUsers,
    activeUsers,
    blockedUsers,
    totalJobs,
    totalApplications,
    totalProposals,
    totalContracts,
    totalPayments,
  });
});

// Get all contracts
export const getAllContracts = asyncHandler(async (req, res) => {
  const contracts = await Contract.find()
    .populate('jobId', 'title company')
    .populate('clientId', 'username email')
    .populate('freelancerId', 'username email')
    .sort('-createdAt');
  res.status(200).json({ contracts, count: contracts.length });
});

// Get all payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .populate('clientId', 'username email')
    .populate('freelancerId', 'username email')
    .sort('-createdAt');
  res.status(200).json({ payments, count: payments.length });
});

// Resolve dispute
export const resolveDispute = asyncHandler(async (req, res) => {
  const { resolution } = req.body;
  if (!resolution) {
    res.status(400);
    throw new Error('Resolution is required');
  }

  const dispute = await Dispute.findByIdAndUpdate(
    req.params.disputeId,
    { status: 'resolved', resolution },
    { new: true }
  ).populate('contractId', 'jobId clientId freelancerId');

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  const notifications = [
    {
      userId: dispute.contractId.clientId,
      type: 'dispute_raised',
      message: `Dispute for contract ${dispute.contractId.jobId.title} has been resolved`,
      disputeId: dispute._id,
      contractId: dispute.contractId._id,
      status: 'unread',
    },
    {
      userId: dispute.contractId.freelancerId,
      type: 'dispute_raised',
      message: `Dispute for contract ${dispute.contractId.jobId.title} has been resolved`,
      disputeId: dispute._id,
      contractId: dispute.contractId._id,
      status: 'unread',
    },
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ dispute, msg: 'Dispute resolved' });
});