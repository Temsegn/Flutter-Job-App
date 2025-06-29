import asyncHandler from 'express-async-handler';
import axios from 'axios';
import mongoose from 'mongoose';
import Payment from '../models/payment.js';
import Contract from '../models/contract.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CLIENT_URL = process.env.CLIENT_URL;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Create payment intent (Chapa initialization)
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { contractId, amount, paymentMethod } = req.body;
  const clientId = req.user._id;

  // Validate contract
  const contract = await Contract.findById(contractId);
  if (!contract || contract.clientId.toString() !== clientId.toString() || contract.status !== 'active') {
    res.status(404);
    throw new Error('Active contract not found or unauthorized');
  }

  // Create payment record
  const payment = await Payment.create({
    contractId,
    clientId,
    freelancerId: contract.freelancerId,
    amount,
    type: 'payment',
    status: 'pending',
  });

  // Generate unique transaction reference
  const txRef = `TX-${payment._id}-${Date.now()}`;

  // Chapa payment request
  const chapaPayload = {
    amount,
    currency: paymentMethod === 'mpesa' ? 'KES' : 'ETB',
    tx_ref: txRef,
    callback_url: CALLBACK_URL,
    return_url: `${process.env.CLIENT_URL}/payment-success`,
    payment_method: paymentMethod,
    email: req.user.email,
    first_name: req.user.username,
    phone_number: req.user.phoneNumber || 'N/A',
    description: `Payment for contract ${contractId}`, 
  };

  try {
    const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', chapaPayload, {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
    });

    await Payment.findByIdAndUpdate(payment._id, { chapaTxRef: txRef });

    res.status(200).json({
      checkoutUrl: response.data.data.checkout_url,
      paymentId: payment._id,
      txRef,
    });
  } catch (error) {
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    res.status(500);
    throw new Error(`Chapa initialization failed: ${error.response?.data?.message || error.message}`);
  }
});

// Confirm payment (Chapa callback)
export const confirmPayment = asyncHandler(async (req, res) => {
  const { tx_ref, status } = req.body;

  if (!tx_ref || !status) {
    res.status(400);
    throw new Error('Invalid callback data');
  }

  // Verify transaction with Chapa
  try {
    const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
    });

    const payment = await Payment.findOne({ chapaTxRef: tx_ref });
    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    if (response.data.status === 'success' && status === 'success') {
      payment.status = 'completed';
      await payment.save();

      // Update freelancer balance
      const freelancer = await User.findById(payment.freelancerId);
      freelancer.balance = (freelancer.balance || 0) + payment.amount;
      await freelancer.save();

      // Notify freelancer
      await Notification.create({
        userId: payment.freelancerId,
        type: 'payment_received',
        message: `Payment of ${payment.amount} ${response.data.data.currency} received for contract ${payment.contractId}`,
        status: 'unread',
      });

      // Notify client (optional)
      await Notification.create({
        userId: payment.clientId,
        type: 'payment_completed',
        message: `Payment of ${payment.amount} ${response.data.data.currency} for contract ${payment.contractId} completed`,
        status: 'unread',
      });
    } else {
      payment.status = 'failed';
      await payment.save();
    }

    res.status(200).json({ msg: 'Callback processed' });
  } catch (error) {
    res.status(500);
    throw new Error(`Callback verification failed: ${error.response?.data?.message || error.message}`);
  }
});

// Create invoice
export const createInvoice = asyncHandler(async (req, res) => {
  const { contractId, amount } = req.body;
  const freelancerId = req.user._id;

  // Validate contract
  const contract = await Contract.findById(contractId);
  if (!contract || contract.freelancerId.toString() !== freelancerId.toString() || contract.status !== 'active') {
    res.status(404);
    throw new Error('Active contract not found or unauthorized');
  }

  // Create invoice record
  const payment = await Payment.create({
    contractId,
    clientId: contract.clientId,
    freelancerId,
    amount,
    type: 'invoice',
    status: 'pending',
  });

  // Notify client
  await Notification.create({
    userId: contract.clientId,
    type: 'invoice_received',
    message: `New invoice for ${amount} ETB from ${req.user.username} for contract ${contractId}`,
    status: 'unread',
  });

  res.status(201).json({ payment, msg: 'Invoice generated' });
});

// Get my invoices
export const getMyInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const query = {
    type: 'invoice',
    $or: [{ clientId: req.user._id }, { freelancerId: req.user._id }],
  };

  const invoices = await Payment.find(query)
    .populate('contractId', 'title')
    .populate('clientId', 'username')
    .populate('freelancerId', 'username')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Payment.countDocuments(query);

  res.status(200).json({ invoices, count, pages: Math.ceil(count / limit) });
});

// Request withdrawal
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, accountDetails } = req.body;
  const freelancerId = req.user._id;

  // Validate freelancer balance
  const user = await User.findById(freelancerId);
  if (!user || user.balance < amount) {
    res.status(400);
    throw new Error('Insufficient balance');
  }

  // Create withdrawal record
  const payment = await Payment.create({
    freelancerId,
    amount,
    type: 'withdrawal',
    status: 'pending',
    chapaTxRef: `WD-${freelancerId}-${Date.now()}`,
  });

  // Notify admin for manual processing
  await Notification.create({
    userId: null, // Admin group or specific admin ID
    type: 'withdrawal_request',
    message: `Withdrawal request of ${amount} ${paymentMethod === 'mpesa' ? 'KES' : 'ETB'} by ${user.username} to ${paymentMethod}`,
    status: 'unread',
    metadata: { paymentId: payment._id, accountDetails },
  });

  res.status(200).json({ payment, msg: 'Withdrawal requested' });
});

// Get my withdrawals
export const getMyWithdrawals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const query = {
    type: 'withdrawal',
    freelancerId: req.user._id,
  };

  const withdrawals = await Payment.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Payment.countDocuments(query);

  res.status(200).json({ withdrawals, count, pages: Math.ceil(count / limit) });
});

// Process withdrawal (admin only)
export const processWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentMethod, accountDetails } = req.body;

  if (!['processing', 'completed', 'failed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  const payment = await Payment.findById(id);
  if (!payment || payment.type !== 'withdrawal') {
    res.status(404);
    throw new Error('Withdrawal not found');
  }

  if (payment.status === 'completed') {
    res.status(400);
    throw new Error('Withdrawal already completed');
  }

  payment.status = status;
  await payment.save();

  if (status === 'completed') {
    // Chapa payout (placeholder; adjust for actual API)
    const payoutPayload = {
      amount: payment.amount,
      currency: paymentMethod === 'mpesa' ? 'KES' : 'ETB',
      tx_ref: payment.chapaTxRef,
      account_details: accountDetails,
      payment_method: paymentMethod,
    };

    try {
      const response = await axios.post('https://api.chapa.co/v1/payout', payoutPayload, {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      });

      if (response.data.status !== 'success') {
        payment.status = 'failed';
        await payment.save();
        throw new Error('Payout failed');
      }

      // Deduct balance
      const freelancer = await User.findById(payment.freelancerId);
      freelancer.balance -= payment.amount;
      await freelancer.save();
    } catch (error) {
      payment.status = 'failed';
      await payment.save();
      res.status(500);
      throw new Error(`Payout failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Notify freelancer
  await Notification.create({
    userId: payment.freelancerId,
    type: 'withdrawal_update',
    message: `Withdrawal of ${payment.amount} ${paymentMethod === 'mpesa' ? 'KES' : 'ETB'} is ${status}`,
    status: 'unread',
  });

  res.status(200).json({ payment, msg: `Withdrawal ${status}` });
});

// Get all payments (admin only)
export const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const payments = await Payment.find({})
    .populate('contractId', 'title')
    .populate('clientId', 'username')
    .populate('freelancerId', 'username')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const count = await Payment.countDocuments({});

  res.status(200).json({ payments, count, pages: Math.ceil(count / limit) });
});