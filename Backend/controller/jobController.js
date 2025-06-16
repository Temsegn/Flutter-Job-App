import asyncHandler from 'express-async-handler';
import Job from '../models/job.js';
import Application from '../models/application.js';
import Proposal from '../models/proposal.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

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
export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'username email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.status(200).json({ job });
});

// Update job
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, postedBy: req.user.userId || req.user._id },
    req.body,
    { new: true, runValidators: true }
  ).populate('postedBy', 'username email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found or unauthorized');
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
  const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user.userId || req.user._id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found or unauthorized');
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

// Apply for job
export const applyForJob = asyncHandler(async (req, res) => {
  const { coverLetter } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const existingApplication = await Application.findOne({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
  });
  if (existingApplication) {
    res.status(400);
    throw new Error('You have already applied for this job');
  }

  const application = await Application.create({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
    coverLetter,
    status: 'pending',
  });

  await Notification.create({
    userId: job.postedBy,
    type: 'application_received',
    message: `New application received for ${job.title} at ${job.company}`,
    jobId: job._id,
    applicationId: application._id,
    status: 'unread',
  });

  res.status(201).json({ application, msg: 'Application submitted' });
});

// Get job applications (admin)
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

// Update application status (admin)
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

// Submit proposal
export const submitProposal = asyncHandler(async (req, res) => {
  const { proposalText, bidAmount, estimatedDuration } = req.body;
  if (!proposalText) {
    res.status(400);
    throw new Error('Proposal text is required');
  }

  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const existingProposal = await Proposal.findOne({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
  });
  if (existingProposal) {
    res.status(400);
    throw new Error('You have already submitted a proposal for this job');
  }

  const proposal = await Proposal.create({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
    proposalText,
    bidAmount,
    estimatedDuration,
    status: 'pending',
  });

  await Notification.create({
    userId: job.postedBy,
    type: 'proposal_received',
    message: `New proposal received for ${job.title} at ${job.company}`,
    jobId: job._id,
    proposalId: proposal._id,
    status: 'unread',
  });

  res.status(201).json({ proposal, msg: 'Proposal submitted' });
});

// Get job proposals (admin)
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

// Update proposal status (admin)
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

// Get user's proposals
export const getMyProposals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const proposals = await Proposal.find({ userId: req.user.userId || req.user._id })
    .populate('jobId', 'title company')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Proposal.countDocuments({ userId: req.user.userId || req.user._id });
  res.status(200).json({ proposals, count, pages: Math.ceil(count / limit) });
});

// Get user's applied jobs
export const getAppliedJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const applications = await Application.find({ userId: req.user.userId || req.user._id })
    .populate('jobId', 'title company')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Application.countDocuments({ userId: req.user.userId || req.user._id });
  const jobs = applications.map(app => ({
    job: app.jobId,
    applicationStatus: app.status,
    applicationId: app._id,
  }));
  res.status(200).json({ jobs, count, pages: Math.ceil(count / limit) });
});

// Get job recommendations
export const getJobRecommendations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const jobs = await Job.find({
    skills: { $in: user.skills },
  })
    .populate('postedBy', 'username email')
    .sort('-createdAt')
    .limit(10);
  res.status(200).json({ jobs, count: jobs.length });
});

// Get user's posted jobs
export const getMyJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const jobs = await Job.find({ postedBy: req.user.userId || req.user._id })
    .populate('postedBy', 'username email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Job.countDocuments({ postedBy: req.user.userId || req.user._id });
  res.status(200).json({ jobs, count, pages: Math.ceil(count / limit) });
});