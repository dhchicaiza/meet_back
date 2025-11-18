import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { verifyToken, JWTPayload } from '../middleware/auth';

let io: SocketIOServer | null = null;

/**
 * Extended Socket interface with user data
 */
export interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
  meetingId?: string;
}

/**
 * Initialize Socket.io server
 * @param httpServer - HTTP server instance
 * @returns Socket.io server instance
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token as string;

      if (!token) {
        logger.warn('Socket connection attempted without token');
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      socket.user = decoded;

      logger.info(`Socket authenticated for user: ${decoded.userId}`);
      next();
    } catch (error) {
      logger.error('Socket authentication error', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.userId})`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io server initialized');

  return io;
}

/**
 * Get Socket.io server instance
 * @returns Socket.io server instance
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO() first.');
  }
  return io;
}

/**
 * Emit event to a specific meeting room
 * @param meetingId - Meeting ID
 * @param event - Event name
 * @param data - Event data
 */
export function emitToMeeting(meetingId: string, event: string, data: unknown): void {
  const io = getSocketIO();
  io.to(`meeting:${meetingId}`).emit(event, data);
  logger.debug(`Emitted ${event} to meeting ${meetingId}`);
}

/**
 * Emit event to a specific user
 * @param userId - User ID
 * @param event - Event name
 * @param data - Event data
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  const io = getSocketIO();
  io.to(`user:${userId}`).emit(event, data);
  logger.debug(`Emitted ${event} to user ${userId}`);
}
