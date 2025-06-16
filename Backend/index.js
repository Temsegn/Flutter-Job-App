import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import connectDB from './db/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import jobRoutes from './routes/job.js';
import bookmarkRoutes from './routes/bookmark.js';


const port=process.env.PORT || 3000;
dotenv.config();

const app=express();

app.use(express.json());
app.use(cookieParser())
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

app.listen(port, () => {
    connectDB();
    console.log( `Server is running on port ${port}`);
});

