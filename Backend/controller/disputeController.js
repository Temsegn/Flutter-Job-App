import asyncHandler from 'express-async-handler';
import Dispute from '../models/dispute.js';
import Contract from '../models/contract.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Raise dispute
export const raiseDispute = asyncHandler(async (req, res) => {
  const { contractId, reason } = req.body;
  if (!contractId || !reason) {
    res.status(400);
    throw new Error('Contract ID and reason are required');
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (![contract.clientId.toString(), contract.freelancerId.toString()].includes(req.user.userId || req.user._id)) {
    res.status(403);
    throw new Error('Unauthorized to raise dispute for this contract');
  }

  const dispute = await Dispute.create({
    contractId,
    raisedBy: req.user.userId || req.user._id,
    reason,
    status: 'pending',
  });

  const notifications = [
    {
      userId: contract.clientId,
      type: 'dispute_raised',
      message: `A dispute was raised for contract ${contract.jobId.title}`,
      disputeId: dispute._id,
      contractId,
      status: 'unread',
    },
    {
      userId: contract.freelancerId,
      type: 'dispute_raised',
      message: `A dispute was raised for contract ${contract.jobId.title}`,
      disputeId: dispute._id,
      contractId,
      status: 'unread',
    },
  ];
  await Notification.insertMany(notifications);

  // Notify admins
  const admins = await User.find({ role: 'admin' });
  const adminNotifications = admins.map(admin => ({
    userId: admin._id,
    type: 'dispute_raised',
    message: `New dispute raised for contract ${contract.jobId.title}`,
    disputeId: dispute._id,
    contractId,
    status: 'unread',
  }));
  await Notification.insertMany(adminNotifications);

  res.status(201).json({ dispute });
});

// Get dispute
export const getDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.disputeId)
    .populate('contractId', 'jobId clientId freelancerId')
    .populate('raisedBy', 'username');
  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  const contract = dispute.contractId;
  if (
    ![
      contract.clientId.toString(),
      contract.freelancerId.toString(),
      req.user.userId || req.user._id,
    ].includes(req.user.userId || req.user._id) &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Unauthorized to view this dispute');
  }

  res.status(200).json({ dispute });
});

// Update dispute
export const updateDispute = asyncHandler(async (req, res) => {
  const { reason, status } = req.body;
  if (!reason && !status) {
    res.status(400);
    throw new Error('Reason or status is required');
  }

  const dispute = await Dispute.findById(req.params.disputeId);
  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  const contract = await Contract.findById(dispute.contractId);
  if (
    dispute.raisedBy.toString() !== (req.user.userId || req.user._id) &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Unauthorized to update this dispute');
  }

  if (reason) dispute.reason = reason;
  if (status) dispute.status = status;
  await dispute.save();

  const notifications = [
    {
      userId: contract.clientId,
      type: 'dispute_updated',
      message: `Dispute for contract ${contract.jobId.title} was updated`,
      disputeId: dispute._id,
      contractId: dispute.contractId,
      status: 'unread',
    },
    {
      userId: contract.freelancerId,
      type: 'dispute_updated',
      message: `Dispute for contract ${contract.jobId.title} was updated`,
      disputeId: dispute._id,
      contractId: dispute.contractId,
      status: 'unread',
    },
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ dispute });
});

// Resolve dispute (admin)
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

  const contract = dispute.contractId;
  const notifications = [
    {
      userId: contract.clientId,
      type: 'dispute_resolved',
      message: `Dispute for contract ${contract.jobId.title} has been resolved`,
      disputeId: dispute._id,
      contractId: dispute.contractId,
      status: 'unread',
    },
    {
      userId: contract.freelancerId,
      type: 'dispute_resolved',
      message: `Dispute for contract ${contract.jobId.title} has been resolved`,
      disputeId: dispute._id,
      contractId: dispute.contractId,
      status: 'unread',
    },
  ];
  await Notification.insertMany(notifications);

  res.status(200).json({ dispute, msg: 'Dispute resolved' });
});

// Get user's disputes
export const getMyDisputes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const disputes = await Dispute.find({
    $or: [
      { raisedBy: req.user.userId || req.user._id },
      { 'contractId.clientId': req.user.userId || req.user._id },
      { 'contractId.contractId': req.user.userId || req.user._id },
    ],
  })
    .populate('contractId', 'title company')
    .populate('raisedBy', 'username')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Dispute.countDocuments({
    $or: [
      { raisedBy: req.user.userId || req.user._id },
      { 'contractId.clientId': req.user.userId || req.user._id },
      { 'contractId.contractId': req.user.userId || req.user._id },
    ],
  });
  res.status(200).json({ disputes, count, pages: Math.ceil(count / limit) });
});

// Get all disputes (admin)
export const getAllDisputes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const disputes = await Dispute.find()
    .populate('contractId', 'title company')
    .populate('raisedBy', 'username')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Dispute.countDocuments();
  res.status(200).json({ disputes, count, pages: Math.ceil(count / limit) });
});