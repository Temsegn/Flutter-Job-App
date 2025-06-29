import cors from 'cors';

const corsMiddleware = cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export default corsMiddleware;