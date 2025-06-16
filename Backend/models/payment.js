import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  type: {
    type: String,
    enum: ['payment', 'invoice', 'withdrawal'],
    required: [true, 'Payment type is required'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'processing'],
    default: 'pending',
  },
  stripePaymentId: {
    type: String,
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

PaymentSchema.index({ clientId: 1, freelancerId: 1 });

export default mongoose.model('Payment', PaymentSchema);