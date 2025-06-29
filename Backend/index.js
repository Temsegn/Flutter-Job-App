import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { initSocket } from './socketio/socket.js';
import roleMiddleware from './middleware/roleMiddleware.js';
import { generalRateLimit } from './middleware/rateLimitMiddleware.js';
import sanitizeMiddleware from './middleware/sanitizeMiddleware.js';
import corsMiddleware from './middleware/corsMiddleware.js';
import helmetMiddleware from './middleware/helmetMiddleware.js';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import jobRouter from './routes/jobRoute.js';
import adminRouter from './routes/adminRoute.js';
import notificationRouter from './routes/notificationRoute.js';
import bookmarkRouter from './routes/bookmarkRoute.js';
import contractRouter from './routes/contractRoute.js';
import messageRouter from './routes/messageRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import disputeRouter from './routes/disputeRoute.js';

dotenv.config();
const app = express();
const { server, io } = initSocket(app);

// Make io accessible to controllers
app.set('io', io);

// Global middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalRateLimit);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI,)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/admin', roleMiddleware(['admin']), adminRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/messages', messageRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/disputes', disputeRouter);

// Error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default server;