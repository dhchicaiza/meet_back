import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as summaryService from '../services/summary.service';
import { sendSuccess } from '../utils/responseFormatter';
import { BadRequestError, UnauthorizedError } from '../utils/customErrors';
import { logger } from '../utils/logger';

/**
 * Generate meeting summary - Sprint 3
 * POST /api/summaries/:meetingId
 */
export async function generateSummary(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { meetingId } = req.params;
    const { participants, duration } = req.body;

    if (!meetingId) {
      throw new BadRequestError('Meeting ID is required');
    }

    if (!participants || !Array.isArray(participants)) {
      throw new BadRequestError('Participants array is required');
    }

    if (!duration || typeof duration !== 'number') {
      throw new BadRequestError('Duration is required and must be a number');
    }

    const summary = await summaryService.createSummary({
      meetingId,
      participants,
      duration,
    });

    return sendSuccess(res, 201, summary, 'Summary generated successfully');
  } catch (error) {
    logger.error('Generate summary error', error);
    throw error;
  }
}

/**
 * Get meeting summary - Sprint 3
 * GET /api/summaries/:meetingId
 */
export async function getSummary(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { meetingId } = req.params;

    if (!meetingId) {
      throw new BadRequestError('Meeting ID is required');
    }

    const summary = await summaryService.getSummaryByMeetingId(meetingId);

    if (!summary) {
      return sendSuccess(res, 200, null, 'No summary found for this meeting');
    }

    return sendSuccess(res, 200, summary);
  } catch (error) {
    logger.error('Get summary error', error);
    throw error;
  }
}
