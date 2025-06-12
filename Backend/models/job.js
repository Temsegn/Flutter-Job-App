import mongoose from 'mongoose';
import dotenv from 'dotenv';

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    period: {
        type: String,
         required: true,
    },
    contractType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'],
        required: true,
    },
   requirements: {
  type: [String],
  required: true,
  default: ['Basic communication skills', 'Team collaboration'], // ✅ default array
}
,
    imageUrl: {
        type: String,
        required: true,
        default: 'https://example.com/default-job-image.png', // Placeholder URL
    },
    salary: {
        type: Number,
        required: true,
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
}); 

const Job=mongoose.model('Job', jobSchema);

export default Job;