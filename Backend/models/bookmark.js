import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    default: 'https://example.com/default-bookmark-image.png',
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
}, {
  timestamps: true,
});

bookmarkSchema.index({ user: 1, job: 1 });

export default mongoose.model('Bookmark', bookmarkSchema);