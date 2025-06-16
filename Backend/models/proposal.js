import mongoose from 'mongoose';

const ProposalSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  proposalText: {
    type: String,
    required: [true, 'Proposal text is required'],
    trim: true,
    maxlength: [2000, 'Proposal text cannot exceed 2000 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  bidAmount: {
    type: Number,
    min: [0, 'Bid amount cannot be negative'],
  },
  estimatedDuration: {
    type: String,
    trim: true,
    maxlength: [100, 'Estimated duration cannot exceed 100 characters'],
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

ProposalSchema.index({ jobId: 1, userId: 1 });

// Update `updatedAt` timestamp on save
ProposalSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Proposal', ProposalSchema);