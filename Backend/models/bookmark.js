import mongoose, { mongo } from 'mongoose';
 

const bookmarkSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
        required: true,
        default: 'https://example.com/default-bookmark-image.png', // Placeholder URL
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;