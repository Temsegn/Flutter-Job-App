import Bookmark from '../models/Bookmark.js';
import asyncHandler from 'express-async-handler';



// @desc    Create a new bookmark
// @route   POST /api/bookmarks
// @access  Private
const createBookmark = asyncHandler(async (req, res) => {
    const { job, title, imageUrl, company, location } = req.body;
    
    // Validate required fields
    if (!job || !title || !company || !location) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    // Check if bookmark already exists for user and job
    const bookmarkExists = await Bookmark.findOne({ 
        user: req.user._id, 
        job 
    });

    if (bookmarkExists) {
        res.status(400);
        throw new Error('Bookmark already exists');
    }

    const bookmark = await Bookmark.create({
        user: req.user._id,
        job,
        title,
        imageUrl: imageUrl || 'https://example.com/default-bookmark-image.png',
        company,
        location
    });

    res.status(201).json(bookmark);
});

// @desc    Get all bookmarks for a user
// @route   GET /api/bookmarks/user/:userId
// @access  Private
const getUserBookmarks = asyncHandler(async (req, res) => {
    const bookmarks = await Bookmark.find({ user: req.params.userId })
        .populate('job', 'title description') // Populate job details
        .sort({ createdAt: -1 }); // Sort by newest first

    res.json(bookmarks);
});

// @desc    Get a specific bookmark
// @route   GET /api/bookmarks/:id
// @access  Private
const getBookmarkById = asyncHandler(async (req, res) => {
    const bookmark = await Bookmark.findById(req.params.id)
        .populate('job', 'title description')
        .populate('user', 'name email');

    if (!bookmark) {
        res.status(404);
        throw new Error('Bookmark not found');
    }

    // Check if user is authorized to view Tertiary
    if (bookmark.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to access this bookmark');
    }

    res.json(bookmark);
});

// @desc    Update a bookmark
// @route   PUT /api/bookmarks/:id
// @access  Private
const updateBookmark = asyncHandler(async (req, res) => {
    const bookmark = await Bookmark.findById(req.params.id);

    if (!bookmark) {
        res.status(404);
        throw new Error('Bookmark not found');
    }

    // Check if user is authorized
    if (bookmark.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this bookmark');
    }

    const { title, imageUrl, company, location } = req.body;

    // Update fields
    bookmark.title = title || bookmark.title;
    bookmark.imageUrl = imageUrl || bookmark.imageUrl;
    bookmark.company = company || bookmark.company;
    bookmark.location = location || bookmark.location;

    const updatedBookmark = await bookmark.save();
    res.json(updatedBookmark);
});

// @desc    Delete a bookmark
// @route   DELETE /api/bookmarks/:id
// @access  Private
const deleteBookmark = asyncHandler(async (req, res) => {
    const bookmark = await Bookmark.findById(req.params.id);

    if (!bookmark) {
        res.status(404);
        throw new Error('Bookmark not found');
    }

    // Check if user is authorized
    if (bookmark.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to delete this bookmark');
    }

    await bookmark.remove();
    res.json({ message: 'Bookmark removed' });
});

export {
    createBookmark,
    getUserBookmarks,
    getBookmarkById,
    updateBookmark,
    deleteBookmark
};