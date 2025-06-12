import express from 'express';
import { getUserById, updateUserById ,deleteUserById,getUsers} from '../controller/userController.js';

import authMiddleware from '../middleware/authMiddleware.js';
import verifyAdmin from '../middleware/verifyAdmin.js';
const router = express.Router();

router.get('/',authMiddleware,verifyAdmin,getUsers);
router.get('/:id', authMiddleware, getUserById);
router.patch('/:id', authMiddleware, updateUserById);
router.delete('/:id', authMiddleware, deleteUserById); // Assuming you want to use the same updateUser function for deletion

export default router;