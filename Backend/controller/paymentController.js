// import asyncHandler from 'express-async-handler';
// import stripe from 'stripe';
// import Payment from '../models/payment.js';
// import Contract from '../models/contract.js';
// import Notification from '../models/notification.js';
// import User from '../models/user.js';

// const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// // Create payment intent
// export const createPaymentIntent = asyncHandler(async (req, res) => {
//   const { contractId, amount } = req.body;
//   if (!contractId || !amount) {
//     res.status(400);
//     throw new Error('Contract ID and amount are required');
//   }

//   const contract = await Contract.findById(contractId);
//   if (!contract) {
//     res.status(404);
//     throw new Error('Contract not found');
//   }

//   if (contract.clientId.toString() !== (req.user.userId || req.user._id)) {
//     res.status(403);
//     throw new Error('Unauthorized to create payment for this contract');
//   }

//   const paymentIntent = await stripeClient.paymentIntents.create({
//     amount: Math.round(amount * 100), // Convert to cents
//     currency: 'usd',
//     metadata: { contractId },
//   });

//   res.status(200).json({ clientSecret: paymentIntent.client_secret });
// });

// // Confirm payment
// export const confirmPayment = asyncHandler(async (req, res) => {
//   const { paymentIntentId, contractId } = req.body;
//   if (!paymentIntentId || !contractId) {
//     res.status(400);
//     throw new Error('Payment intent ID and contract ID are required');
//   }

//   const contract = await Contract.findById(contractId);
//   if (!contract) {
//     res.status(404);
//     throw new Error('Contract not found');
//   }

//   const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
//   if (paymentIntent.status !== 'succeeded') {
//     res.status(400);
//     throw new Error('Payment not successful');
//   }

//   const payment = await Payment.create({
//     contractId,
//     clientId: contract.clientId,
//     freelancerId: contract.freelancerId,
//     amount: paymentIntent.amount / 100, // Convert back to dollars
//     type: 'payment',
//     status: 'completed',
//     stripePaymentId: paymentIntentId,
//   });

//   await Notification.create({
//     userId: contract.freelancerId,
//     type: 'payment_received',
//     message: `Payment of $${payment.amount} received for contract ${contract.jobId.title}`,
//     contractId,
//     paymentId: payment._id,
//     status: 'unread',
//   });

//   res.status(200).json({ payment, msg: 'Payment confirmed' });
// });

// // Create invoice
// export const createInvoice = asyncHandler(async (req, res) => {
//   const { contractId, amount, description } = req.body;
//   if (!contractId || !amount) {
//     res.status(400);
//     throw new Error('Contract ID and amount are required');
//   }

//   const contract = await Contract.findById(contractId);
//   if (!contract) {
//     res.status(404);
//     throw new Error('Contract not found');
//   }

//   if (contract.freelancerId.toString() !== (req.user.userId || req.user._id)) {
//     res.status(403);
//     throw new Error('Unauthorized to create invoice for this contract');
//   }

//   const invoice = await Payment.create({
//     contractId,
//     clientId: contract.clientId,
//     freelancerId: contract.freelancerId,
//     amount,
//     type: 'invoice',
//     status: 'pending',
//     description,
//   });

//   await Notification.create({
//     userId: contract.clientId,
//     type: 'invoice_received',
//     message: `New invoice of $${amount} for contract ${contract.jobId.title}`,
//     contractId,
//     paymentId: invoice._id,
//     status: 'unread',
//   });

//   res.status(201).json({ invoice });
// });

// // Get user's invoices
// export const getMyInvoices = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const invoices = await Payment.find({
//     type: 'invoice',
//     $or: [
//       { clientId: req.user.userId || req.user._id },
//       { freelancerId: req.user.userId || req.user._id },
//     ],
//   })
//     .populate('contractId', 'jobId')
//     .sort('-createdAt')
//     .skip((page - 1) * limit)
//     .limit(Number(limit));
//   const count = await Payment.countDocuments({
//     type: 'invoice',
//     $or: [
//       { clientId: req.user.userId || req.user._id },
//       { freelancerId: req.user.userId || req.user._id },
//     ],
//   });
//   res.status(200).json({ invoices, count, pages: Math.ceil(count / limit) });
// });

// // Request withdrawal
// export const requestWithdrawal = asyncHandler(async (req, res) => {
//   const { amount, paymentMethod } = req.body;
//   if (!amount || !paymentMethod) {
//     res.status(400);
//     throw new Error('Amount and payment method are required');
//   }

//   const user = await User.findById(req.user.userId || req.user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }

//   const withdrawal = await Payment.create({
//     freelancerId: req.user.userId || req.user._id,
//     amount,
//     type: 'withdrawal',
//     status: 'pending',
//     paymentMethod,
//   });

//   await Notification.create({
//     userId: req.user.userId || req.user._id,
//     type: 'withdrawal_requested',
//     message: `Withdrawal request of $${amount} submitted`,
//     paymentId: withdrawal._id,
//     status: 'unread',
//   });

//   res.status(201).json({ withdrawal });
// });

// // Get user's withdrawals
// export const getMyWithdrawals = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const withdrawals = await Payment.find({
//     type: 'withdrawal',
//     freelancerId: req.user.userId || req.user._id,
//   })
//     .sort('-createdAt')
//     .skip((page - 1) * limit)
//     .limit(Number(limit));
//   const count = await Payment.countDocuments({
//     type: 'withdrawal',
//     freelancerId: req.user.userId || req.user._id,
//   });
//   res.status(200).json({ withdrawals, count, pages: Math.ceil(count / limit) });
// });

// // Process withdrawal (admin)
// export const processWithdrawal = asyncHandler(async (req, res) => {
//   const { status } = req.body;
//   if (!['completed', 'failed'].includes(status)) {
//     res.status(400);
//     throw new Error('Invalid status');
//   }

//   const withdrawal = await Payment.findByIdAndUpdate(
//     req.params.id,
//     { status },
//     { new: true }
//   ).populate('freelancerId', 'username email');
//   if (!withdrawal) {
//     res.status(404);
//     throw new Error('Withdrawal not found');
//   }

//   await Notification.create({
//     userId: withdrawal.freelancerId._id,
//     type: 'withdrawal_processed',
//     message: `Your withdrawal request of $${withdrawal.amount} was ${status}`,
//     paymentId: withdrawal._id,
//     status: 'unread',
//   });

//   res.status(200).json({ withdrawal, msg: 'Withdrawal processed' });
// });

// // Get all payments (admin)
// export const getAllPayments = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const payments = await Payment.find()
//     .populate('clientId', 'username email')
//     .populate('freelancerId', 'username email')
//     .sort('-createdAt')
//     .skip((page - 1) * limit)
//     .limit(Number(limit));
//   const count = await Payment.countDocuments();
//   res.status(200).json({ payments, count, pages: Math.ceil(count / limit) });
// });