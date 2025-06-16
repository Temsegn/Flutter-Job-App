import asyncHandler from 'express-async-handler';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Get user's notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { userId: req.user.userId || req.user._id };
  if (status) {
    query.status = status;
  }

  const notifications = await Notification.find(query)
    .populate('jobId', 'title company')
    .populate('applicationId', 'status')
    .populate('proposalId', 'status')
    .populate('contractId', 'status')
    .populate('paymentId', 'amount status')
    .populate('messageId', 'content')
    .populate('disputeId', 'status')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Notification.countDocuments(query);
  res.status(200).json({ notifications, count, pages: Math.ceil(count / limit) });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId || req.user._id },
    { status: 'read' },
    { new: true }
  ).populate('jobId', 'title company');
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ notification, msg: 'Notification marked as read' });
});

// Mark notification as unread
export const markAsUnread = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId || req.user._id },
    { status: 'unread' },
    { new: true }
  ).populate('jobId', 'title company');
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ notification, msg: 'Notification marked as unread' });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.userId || req.user._id, status: 'unread' },
    { status: 'read' }
  );
  res.status(200).json({ msg: 'All notifications marked as read' });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId || req.user._id,
  });
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ msg: 'Notification deleted' });
});

// Delete all notifications
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.userId || req.user._id });
  res.status(200).json({ msg: 'All notifications deleted' });
});

// Create notification (admin)
export const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, message, jobId, applicationId, proposalId, contractId, paymentId, disputeId } = req.body;
  if (!userId || !type || !message) {
    res.status(400);
    throw new Error('User ID, type, and message are required');
  }

  const notification = await Notification.create({
    userId,
    type,
    message,
    jobId,
    applicationId,
    proposalId,
    contractId,
    paymentId,
    disputeId,
    status: 'unread',
  });
  res.status(201).json({ notification, msg: 'Notification created' });
});

// Create system announcement (admin)
export const createSystemAnnouncement = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const users = await User.find({ isBlocked: false });
  const notifications = users.map(user => ({
    userId: user._id,
    type: 'system_announcement',
    message,
    status: 'unread',
  }));

  await Notification.insertMany(notifications);
  res.status(201).json({ msg: `System announcement sent to ${users.length} users` });
});