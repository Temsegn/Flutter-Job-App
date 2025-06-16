import asyncHandler from 'express-async-handler';
import Job from '../models/job.js';
import Application from '../models/application.js';
import Proposal from '../models/proposal.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

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

  // Notify all non-blocked users about the new job
  const users = await User.find({ isBlocked: false, role: { $ne: 'admin' } }); // Exclude admins
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
  const jobs = await Job.find().sort('-createdAt');
  res.status(200).json({ jobs, count: jobs.length });
});

// Search jobs with query parameters
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

  const jobs = await Job.find(query).sort('-createdAt');
  res.status(200).json({ jobs, count: jobs.length });
});

// Get a single job by ID
export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.status(200).json({ job });
});

// Update a job by ID
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  ).populate('postedBy', 'name email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Notify applicants and proposers about job update
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

// Delete a job by ID
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user.userId || req.user._id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Notify applicants and proposers about job deletion
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

  // Delete related applications and proposals
  await Application.deleteMany({ jobId: job._id });
  await Proposal.deleteMany({ jobId: job._id });

  res.status(200).json({ msg: 'Job deleted' });
});

// Apply for a job
export const applyForJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const application = await Application.create({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
    status: 'pending',
  });

  // Notify the job poster (e.g., admin or agent)
  await Notification.create({
    userId: job.postedBy,
    type: 'application_received',
    message: `A new application was received for ${job.title} at ${job.company}.`,
    jobId: job._id,
    applicationId: application._id,
    status: 'unread',
  });

  res.status(201).json({ application, msg: 'Application submitted' });
});

// Get all applications for a job (admin only)
export const getJobApplications = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const applications = await Application.find({ jobId: req.params.id });
  res.status(200).json({ applications, count: applications.length });
});

// Update application status (admin only)
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  const application = await Application.findOneAndUpdate(
    { _id: req.params.applicationId },
    { status },
    { new: true, runValidators: true }
  ).populate('jobId', 'title company');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Notify the applicant
  await Notification.create({
    userId: application.userId,
    type: 'application_status',
    message: `Your application for ${application.jobId.title} at ${application.jobId.company} was ${status}.`,
    jobId: application.jobId._id,
    applicationId: application._id,
    status: 'unread',
  });

  res.status(200).json({ application, msg: 'Application status updated' });
});

// Submit a proposal for a job
export const submitProposal = asyncHandler(async (req, res) => {
  const { proposalText } = req.body;
  if (!proposalText) {
    res.status(400);
    throw new Error('Proposal text is required');
  }

  const job = await Job.findOne({ _id: req.params.id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const proposal = await Proposal.create({
    jobId: req.params.id,
    userId: req.user.userId || req.user._id,
    proposalText,
    status: 'pending',
  });

  // Notify the job poster (e.g., admin or agent)
  await Notification.create({
    userId: job.postedBy,
    type: 'proposal_received',
    message: `A new proposal was received for ${job.title} at ${job.company}.`,
    jobId: job._id,
    proposalId: proposal._id,
    status: 'unread',
  });

  res.status(201).json({ proposal, msg: 'Proposal submitted' });
});

// Get all proposals for a job (admin only)
export const getJobProposals = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const proposals = await Proposal.find({ jobId: req.params.id });
  res.status(200).json({ proposals, count: proposals.length });
});

// Get all proposals submitted by the authenticated user
export const getMyProposals = asyncHandler(async (req, res) => {
  const proposals = await Proposal.find({ userId: req.user.userId || req.user._id })
    .populate('jobId', 'title company')
    .sort('-createdAt');
  res.status(200).json({ proposals, count: proposals.length });
});

// Get all jobs the authenticated user has applied to
export const getAppliedJobs = asyncHandler(async (req, res) => {
  const applications = await Application.find({ userId: req.user.userId || req.user._id })
    .populate('jobId', 'title company')
    .sort('-createdAt');
  const jobs = applications.map(app => ({
    job: app.jobId,
    applicationStatus: app.status,
    applicationId: app._id,
  }));
  res.status(200).json({ jobs, count: jobs.length });
});

// Show stats
export const showStats = asyncHandler(async (req, res) => {
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

  res.status(200).json({
    defaultStats: { totalJobs, totalApplications, totalProposals },
    monthlyApplications,
  });
});