import asyncHandler from 'express-async-handler';
import Notification from '../models/notification.js';
import User from '../models/user.js';

// Get all notifications for the authenticated user
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { userId: req.user.userId || req.user._id };
  if (status) {
    query.status = status; // Filter by read/unread
  }

  const notifications = await Notification.find(query)
    .populate('jobId', 'title company')
    .populate('applicationId', 'status')
    .populate('proposalId', 'status')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Notification.countDocuments(query);
  res.status(200).json({ notifications, count, pages: Math.ceil(count / limit) });
});

// Mark a notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user.userId || req.user._id },
    { status: 'read' },
    { new: true, runValidators: true }
  ).populate('jobId', 'title company');
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ notification, msg: 'Notification marked as read' });
});

// Mark a notification as unread
export const markAsUnread = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user.userId || req.user._id },
    { status: 'unread' },
    { new: true, runValidators: true }
  ).populate('jobId', 'title company');
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ notification, msg: 'Notification marked as unread' });
});

// Mark all notifications as read for the authenticated user
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.userId || req.user._id, status: 'unread' },
    { status: 'read' }
  );
  res.status(200).json({ msg: 'All notifications marked as read' });
});

// Delete a specific notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    userId: req.user.userId || req.user._id,
  });
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or unauthorized');
  }
  res.status(200).json({ msg: 'Notification deleted' });
});

// Delete all notifications for the authenticated user
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.userId || req.user._id });
  res.status(200).json({ msg: 'All notifications deleted' });
});

// Create a notification (admin only)
export const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, message, jobId, applicationId, proposalId } = req.body;
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
    status: 'unread',
  });
  res.status(201).json({ notification, msg: 'Notification created' });
});

// Create a system announcement for all users (admin only)
export const createSystemAnnouncement = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const users = await User.find({ isBlocked: false }); // Exclude blocked users
  const notifications = users.map(user => ({
    userId: user._id,
    type: 'system_announcement',
    message,
    status: 'unread',
  }));

  await Notification.insertMany(notifications);
  res.status(201).json({ msg: `System announcement sent to ${users.length} users` });
});