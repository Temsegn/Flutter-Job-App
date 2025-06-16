import express from 'express';
import { 
    createBookmark, 
    getUserBookmarks, 
    getBookmarkById, 
    updateBookmark, 
    deleteBookmark 
} from '../controller/bookmarkController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new bookmark
router.post('/', authMiddleware, createBookmark);

// Get all bookmarks for a user
router.get('/user/:userId', authMiddleware, getUserBookmarks);

// Get a specific bookmark by ID
router.get('/:id', authMiddleware, getBookmarkById);

// Update a bookmark
router.put('/:id', authMiddleware, updateBookmark);

// Delete a bookmark
router.delete('/:id', authMiddleware, deleteBookmark);

export default router;