import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getChatMessages, deleteChatMessages } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/chat/:meetingId
 * @desc    Get chat messages for a meeting
 * @access  Protected
 */
router.get('/:meetingId', asyncHandler(getChatMessages));

/**
 * @route   DELETE /api/chat/:meetingId
 * @desc    Delete chat messages for a meeting
 * @access  Protected
 */
router.delete('/:meetingId', asyncHandler(deleteChatMessages));

export default router;
