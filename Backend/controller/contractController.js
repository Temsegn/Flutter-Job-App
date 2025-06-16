import asyncHandler from 'express-async-handler';
import Contract from '../models/contract.js';
import Job from '../models/job.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Create contract
export const createContract = asyncHandler(async (req, res) => {
  const { jobId, freelancerId, type, amount, milestones } = req.body;
  if (!jobId || !freelancerId || !type || !amount) {
    res.status(400);
    throw new Error('All required fields must be provided');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const freelancer = await User.findById(freelancerId);
  if (!freelancer || !['freelancer', 'user'].includes(freelancer.role)) {
    res.status(404);
    throw new Error('Freelancer not found');
  }

  const contract = await Contract.create({
    jobId,
    clientId: req.user.userId || req.user._id,
    freelancerId,
    type,
    amount,
    milestones,
  });

  await Notification.create({
    userId: freelancerId,
    type: 'contract_offered',
    message: `You received a contract offer for ${job.title} at ${job.company}`,
    jobId,
    contractId: contract._id,
    status: 'unread',
  });

  res.status(201).json({ contract });
});

// Get contract
export const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('jobId', 'title company')
    .populate('clientId', 'username email')
    .populate('freelancerId', 'username email');
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (![contract.clientId._id.toString(), contract.freelancerId._id.toString()].includes(req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to view this contract');
  }

  res.status(200).json({ contract });
});

// Update contract status
export const updateContractStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'active', 'completed', 'terminated'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  const contract = await Contract.findById(req.params.id);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (![contract.clientId.toString(), contract.freelancerId.toString()].includes(req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to update this contract');
  }

  contract.status = status;
  await contract.save();

  const notifications = [
    {
      userId: contract.clientId,
      type: 'contract_status',
      message: `Contract for ${contract.jobId.title} is now ${status}`,
      jobId: contract.jobId,
      contractId: contract._id,
      status: 'unread',
    },
    {
      userId: contract.freelancerId,
      type: 'contract_status',
      message: `Contract for ${contract.jobId.title} is now ${status}`,
      jobId: contract.jobId,
      contractId: contract._id,
      status: 'unread',
    },
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ contract });
});

// Add milestone
export const addMilestone = asyncHandler(async (req, res) => {
  const { title, amount, dueDate } = req.body;
  if (!title || !amount) {
    res.status(400);
    throw new Error('Title and amount are required');
  }

  const contract = await Contract.findById(req.params.id);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.clientId.toString() !== (req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to add milestone');
  }

  contract.milestones.push({ title, amount, dueDate });
  await contract.save();

  await Notification.create({
    userId: contract.freelancerId,
    type: 'milestone_added',
    message: `New milestone "${title}" added to contract for ${contract.jobId.title}`,
    contractId: contract._id,
    status: 'unread',
  });

  res.status(200).json({ contract });
});

// Update milestone
export const updateMilestone = asyncHandler(async (req, res) => {
  const { milestoneId, title, amount, dueDate } = req.body;
  if (!milestoneId) {
    res.status(400);
    throw new Error('Milestone ID is required');
  }

  const contract = await Contract.findById(req.params.id);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.clientId.toString() !== (req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to update milestone');
  }

  const milestone = contract.milestones.id(milestoneId);
  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }

  milestone.set({ title, amount, dueDate });
  await contract.save();

  await Notification.create({
    userId: contract.freelancerId,
    type: 'milestone_updated',
    message: `Milestone "${title}" updated for contract ${contract.jobId.title}`,
    contractId: contract._id,
    status: 'unread',
  });

  res.status(200).json({ contract });
});

// Complete milestone
export const completeMilestone = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.freelancerId.toString() !== (req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to complete milestone');
  }

  const milestone = contract.milestones.id(req.params.milestoneId);
  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }

  milestone.status = 'completed';
  await contract.save();

  await Notification.create({
    userId: contract.clientId,
    type: 'milestone_completed',
    message: `Milestone "${milestone.title}" completed for ${contract.jobId.title}`,
    contractId: contract._id,
    status: 'unread',
  });

  res.status(200).json({ contract });
});

// Get user's contracts
export const getMyContracts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const contracts = await Contract.find({
    $or: [
      { clientId: req.user.userId || req.user._id },
      { freelancerId: req.user.userId || req.user._id },
    ],
  })
    .populate('jobId', 'title company')
    .populate('clientId', 'username email')
    .populate('freelancerId', 'username email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Contract.countDocuments({
    $or: [
      { clientId: req.user.userId || req.user._id },
      { freelancerId: req.user.userId || req.user._id },
    ],
  });
  res.status(200).json({ contracts, count, pages: Math.ceil(count / limit) });
});

// Get all contracts (admin)
export const getAllContracts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const contracts = await Contract.find()
    .populate('jobId', 'title company')
    .populate('clientId', 'username email')
    .populate('freelancerId', 'username email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Contract.countDocuments();
  res.status(200).json({ contracts, count, pages: Math.ceil(count / limit) });
});