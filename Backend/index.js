import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import jobRouter from './routes/jobRoute.js';
import adminRouter from './routes/adminRoute.js';
import notificationRouter from './routes/notificationRoute.js';
import bookmarkRouter from './routes/bookmarkRoute.js';
import contractRouter from './routes/contractRoute.js';
// import paymentRouter from './routes/paymentRoute.js';
import messageRouter from './routes/messageRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import disputeRouter from './routes/disputeRoute.js';

dotenv.config();
const app = express();

app.use(cookieParser);

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/contracts', contractRouter);
// app.use('/api/payments', paymentRouter);
app.use('/api/messages', messageRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/disputes', disputeRouter);

// Error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ msg: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));