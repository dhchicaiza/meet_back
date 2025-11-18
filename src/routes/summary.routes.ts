import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { generateSummary, getSummary } from '../controllers/summary.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All summary routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/summaries/:meetingId
 * @desc    Generate AI summary for a meeting
 * @access  Protected
 */
router.post('/:meetingId', asyncHandler(generateSummary));

/**
 * @route   GET /api/summaries/:meetingId
 * @desc    Get meeting summary
 * @access  Protected
 */
router.get('/:meetingId', asyncHandler(getSummary));

export default router;
