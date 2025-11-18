import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as chatService from '../services/chat.service';
import { sendSuccess } from '../utils/responseFormatter';
import { BadRequestError, UnauthorizedError } from '../utils/customErrors';
import { logger } from '../utils/logger';

/**
 * Get chat messages for a meeting - Sprint 2
 * GET /api/chat/:meetingId
 */
export async function getChatMessages(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { meetingId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    if (!meetingId) {
      throw new BadRequestError('Meeting ID is required');
    }

    const messages = await chatService.getMessagesByMeetingId(meetingId, limit);

    return sendSuccess(res, 200, messages);
  } catch (error) {
    logger.error('Get chat messages error', error);
    throw error;
  }
}

/**
 * Delete chat messages for a meeting - Sprint 2
 * DELETE /api/chat/:meetingId
 */
export async function deleteChatMessages(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { meetingId } = req.params;

    if (!meetingId) {
      throw new BadRequestError('Meeting ID is required');
    }

    // Note: In production, you should verify that the user is the meeting creator
    await chatService.deleteMessagesByMeetingId(meetingId);

    return sendSuccess(res, 200, null, 'Chat messages deleted successfully');
  } catch (error) {
    logger.error('Delete chat messages error', error);
    throw error;
  }
}
