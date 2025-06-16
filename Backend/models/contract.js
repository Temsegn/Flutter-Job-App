import mongoose from 'mongoose';

const ContractSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required'],
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer ID is required'],
  },
  type: {
    type: String,
    enum: ['fixed', 'hourly'],
    required: [true, 'Contract type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'terminated'],
    default: 'pending',
  },
  milestones: [{
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'completed', 'paid'],
      default: 'pending',
    },
  }],
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

ContractSchema.index({ clientId: 1, freelancerId: 1 });

export default mongoose.model('Contract', ContractSchema);