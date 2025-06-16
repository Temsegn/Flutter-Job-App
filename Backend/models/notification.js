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
      'application_received',
      'proposal_received',
      'contract_offered',
      'contract_status',
      'milestone_completed',
      'payment_received',
      'message_received',
      'review_received',
      'dispute_raised',
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
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute',
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

NotificationSchema.index({ userId: 1, status: 1 });

// Update `updatedAt` timestamp on save
NotificationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Notification', NotificationSchema);