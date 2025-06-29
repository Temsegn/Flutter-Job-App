import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'freelancer', 'client'],
    required: [true, 'Role is required'],
    default: 'freelancer',
  },
  skills: {
    type: [String],
    default: [],
  },
  testPass: {
    type: String,
    required: [true, 'Test password is required'],
  },
  profilePicture: {
    type: String,
    default: 'https://example.com/default-profile-picture.png',
  },
  verificationCode: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative'],
  },
  portfolio: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    url: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
  }],
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please provide a valid phone number'],
    default: null,
  },
  bankAccount: {
    type: String,
    trim: true,
    default: null,
  },
}, {
  timestamps: true,
});
 
export default mongoose.model('User', userSchema);