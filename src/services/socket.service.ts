import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import { logger } from '../utils/logger';
import * as chatService from './chat.service';
import * as meetingService from './meeting.service';
import { ChatMessage } from '../models/Chat';
import { WebRTCSignal, MediaControlEvent } from '../models/WebRTC';

/**
 * Register Socket.io event handlers
 * @param io - Socket.io server instance
 */
export function registerSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info(`User ${userId} connected with socket ${socket.id}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    /**
     * Join a meeting room
     */
    socket.on('join-meeting', async (data: { meetingId: string }) => {
      try {
        const { meetingId } = data;

        // Verify meeting exists and user can join
        await meetingService.joinMeeting(meetingId, userId);

        // Join the meeting room
        socket.join(`meeting:${meetingId}`);
        socket.meetingId = meetingId;

        logger.info(`User ${userId} joined meeting ${meetingId}`);

        // Notify other participants
        socket.to(`meeting:${meetingId}`).emit('user-joined', {
          userId,
          userName: socket.user?.email,
          timestamp: new Date().toISOString(),
        });

        // Send confirmation to user
        socket.emit('joined-meeting', {
          meetingId,
          timestamp: new Date().toISOString(),
        });

        // Send system message
        const systemMessage = await chatService.saveMessage({
          meetingId,
          userId: 'system',
          userName: 'System',
          message: `${socket.user?.email} joined the meeting`,
          type: 'system',
        });

        io.to(`meeting:${meetingId}`).emit('chat-message', systemMessage);
      } catch (error) {
        logger.error('Error joining meeting', error);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    /**
     * Leave a meeting room
     */
    socket.on('leave-meeting', async (data: { meetingId: string }) => {
      try {
        const { meetingId } = data;

        // Update meeting in database
        await meetingService.leaveMeeting(meetingId, userId);

        // Leave the meeting room
        socket.leave(`meeting:${meetingId}`);
        socket.meetingId = undefined;

        logger.info(`User ${userId} left meeting ${meetingId}`);

        // Notify other participants
        socket.to(`meeting:${meetingId}`).emit('user-left', {
          userId,
          userName: socket.user?.email,
          timestamp: new Date().toISOString(),
        });

        // Send system message
        const systemMessage = await chatService.saveMessage({
          meetingId,
          userId: 'system',
          userName: 'System',
          message: `${socket.user?.email} left the meeting`,
          type: 'system',
        });

        io.to(`meeting:${meetingId}`).emit('chat-message', systemMessage);
      } catch (error) {
        logger.error('Error leaving meeting', error);
      }
    });

    /**
     * Send chat message
     */
    socket.on('send-message', async (data: { meetingId: string; message: string }) => {
      try {
        const { meetingId, message } = data;

        if (!message || message.trim().length === 0) {
          return;
        }

        // Save message to Firestore
        const chatMessage: ChatMessage = await chatService.saveMessage({
          meetingId,
          userId,
          userName: socket.user?.email || 'Unknown',
          message: message.trim(),
          type: 'text',
        });

        // Broadcast to all users in the meeting
        io.to(`meeting:${meetingId}`).emit('chat-message', chatMessage);

        logger.info(`Message sent in meeting ${meetingId} by user ${userId}`);
      } catch (error) {
        logger.error('Error sending message', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', (data: { meetingId: string; isTyping: boolean }) => {
      const { meetingId, isTyping } = data;

      socket.to(`meeting:${meetingId}`).emit('user-typing', {
        userId,
        userName: socket.user?.email,
        meetingId,
        isTyping,
      });
    });

    /**
     * WebRTC Signaling - Send offer/answer/ice-candidate
     */
    socket.on('webrtc-signal', (data: WebRTCSignal) => {
      try {
        const { to, type, signal, mediaType } = data;

        // Forward signal to the target user
        io.to(`user:${to}`).emit('webrtc-signal', {
          type,
          from: userId,
          signal,
          mediaType,
        });

        logger.debug(`WebRTC ${type} forwarded from ${userId} to ${to}`);
      } catch (error) {
        logger.error('Error forwarding WebRTC signal', error);
      }
    });

    /**
     * Media control (mute/unmute audio/video)
     */
    socket.on('media-control', (data: MediaControlEvent) => {
      try {
        const { meetingId, type, enabled } = data;

        // Broadcast to other participants in the meeting
        socket.to(`meeting:${meetingId}`).emit('user-media-changed', {
          userId,
          type,
          enabled,
        });

        logger.info(`User ${userId} ${enabled ? 'enabled' : 'disabled'} ${type} in meeting ${meetingId}`);
      } catch (error) {
        logger.error('Error handling media control', error);
      }
    });

    /**
     * Request to get current participants in meeting
     */
    socket.on('get-participants', async (data: { meetingId: string }) => {
      try {
        const { meetingId } = data;
        const meeting = await meetingService.getMeetingById(meetingId);

        socket.emit('participants-list', {
          participants: meeting.participants,
        });
      } catch (error) {
        logger.error('Error getting participants', error);
        socket.emit('error', { message: 'Failed to get participants' });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', async () => {
      try {
        if (socket.meetingId) {
          // Leave meeting on disconnect
          await meetingService.leaveMeeting(socket.meetingId, userId);

          // Notify other participants
          socket.to(`meeting:${socket.meetingId}`).emit('user-left', {
            userId,
            userName: socket.user?.email,
            timestamp: new Date().toISOString(),
          });

          // Send system message
          const systemMessage = await chatService.saveMessage({
            meetingId: socket.meetingId,
            userId: 'system',
            userName: 'System',
            message: `${socket.user?.email} disconnected`,
            type: 'system',
          });

          io.to(`meeting:${socket.meetingId}`).emit('chat-message', systemMessage);
        }

        logger.info(`User ${userId} disconnected`);
      } catch (error) {
        logger.error('Error handling disconnect', error);
      }
    });
  });

  logger.info('Socket.io event handlers registered');
}
