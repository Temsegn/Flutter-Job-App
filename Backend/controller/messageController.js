import asyncHandler from 'express-async-handler';
import Message from '../models/message.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

// Send message
export const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, content, conversationId } = req.body;
  if (!recipientId || !content) {
    res.status(400);
    throw new Error('Recipient ID and content are required');
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    res.status(404);
    throw new Error('Recipient not found');
  }

  // Use provided conversationId or generate new one
  const convId = conversationId || new mongoose.Types.ObjectId();
  const message = await Message.create({
    conversationId: convId,
    senderId: req.user.userId || req.user._id,
    recipientId,
    content,
    status: 'sent',
  });

  await Notification.create({
    userId: recipientId,
    type: 'message_received',
    message: `New message from ${req.user.username}`,
    messageId: message._id,
    status: 'unread',
  });

  res.status(201).json({ message });
});

// Get conversation
export const getConversation = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const messages = await Message.find({
    conversationId: req.params.conversationId,
    $or: [
      { senderId: req.user.userId || req.user._id },
      { recipientId: req.user.userId || req.user._id },
    ],
  })
    .populate('senderId', 'username')
    .populate('recipientId', 'username')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const count = await Message.countDocuments({
    conversationId: req.params.conversationId,
    $or: [
      { senderId: req.user.userId || req.user._id },
      { recipientId: req.user.userId || req.user._id },
    ],
  });

  // Mark messages as read for the recipient
  await Message.updateMany(
    {
      conversationId: req.params.conversationId,
      recipientId: req.user.userId || req.user._id,
      status: 'sent',
    },
    { status: 'read' }
  );

  res.status(200).json({ messages, count, pages: Math.ceil(count / limit) });
});

// Get user's conversations
export const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(req.user.userId || req.user._id) },
          { recipientId: new mongoose.Types.ObjectId(req.user.userId || req.user._id) },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$content' },
        senderId: { $first: '$senderId' },
        recipientId: { $first: '$recipientId' },
        createdAt: { $first: '$createdAt' },
        status: { $first: '$status' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'senderId',
        foreignField: '_id',
        as: 'sender',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'recipientId',
        foreignField: '_id',
        as: 'recipient',
      },
    },
    {
      $unwind: '$sender',
    },
    {
      $unwind: '$recipient',
    },
    {
      $project: {
        conversationId: '$_id',
        lastMessage: 1,
        sender: { username: '$sender.username', _id: '$sender._id' },
        recipient: { username: '$recipient.username', _id: '$recipient._id' },
        createdAt: 1,
        status: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: Number(limit),
    },
  ]);

  const count = await Message.distinct('conversationId', {
    $or: [
      { senderId: req.user.userId || req.user._id },
      { recipientId: req.user.userId || req.user._id },
    ],
  }).then(distinctConversations => distinctConversations.length);

  res.status(200).json({ conversations, count, pages: Math.ceil(count / limit) });
});

// Mark message as read
export const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findOneAndUpdate(
    {
      _id: req.params.messageId,
      recipientId: req.user.userId || req.user._id,
      status: 'sent',
    },
    { status: 'read' },
    { new: true }
  ).populate('senderId', 'username').populate('recipientId', 'username');

  if (!message) {
    res.status(404);
    throw new Error('Message not found or unauthorized');
  }

  res.status(200).json({ message, msg: 'Message marked as read' });
});

// Delete message
export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOneAndDelete({
    _id: req.params.messageId,
    $or: [
      { senderId: req.user.userId || req.user._id },
      { recipientId: req.user.userId || req.user._id },
    ],
  });

  if (!message) {
    res.status(404);
    throw new Error('Message not found or unauthorized');
  }

  res.status(200).json({ msg: 'Message deleted' });
});