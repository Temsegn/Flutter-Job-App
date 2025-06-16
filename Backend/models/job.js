import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  period: {
    type: String,
    required: [true, 'Period is required'],
    trim: true,
  },
  contractType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'],
    required: [true, 'Contract type is required'],
  },
  requirements: {
    type: [String],
    required: [true, 'Requirements are required'],
    default: ['Basic communication skills', 'Team collaboration'],
  },
  skills: {
    type: [String],
    default: [],
  },
  imageUrl: {
    type: String,
    default: 'https://example.com/default-job-image.png',
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary cannot be negative'],
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required'],
  },
}, {
  timestamps: true,
});

// Indexes for search
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ skills: 1 });
jobSchema.index({ location: 1 });

export default mongoose.model('Job', jobSchema);