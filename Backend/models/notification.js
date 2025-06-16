import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  type: {
    type: String,
    enum: [
      'job_posted',
      'application_status',
      'proposal_status',
      'job_updated',
      'job_deleted',
      'user_blocked',
      'user_unblocked',
      'system_announcement',
      'application_received', // New: Notify job poster of new application
      'proposal_received', // New: Notify job poster of new proposal
    ],
    required: [true, 'Notification type is required'],
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters'],
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    index: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
  },
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
NotificationSchema.index({ userId: 1, status: 1 });

// Update updatedAt on save
NotificationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Notification', NotificationSchema);