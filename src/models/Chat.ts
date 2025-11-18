/**
 * Chat message model interface for Firestore
 */
export interface ChatMessage {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string; // ISO-8601 format
  type: 'text' | 'system';
}

/**
 * Create chat message data
 */
export interface CreateChatMessageData {
  meetingId: string;
  userId: string;
  userName: string;
  message: string;
  type?: 'text' | 'system';
}

/**
 * Typing indicator data
 */
export interface TypingIndicator {
  userId: string;
  userName: string;
  meetingId: string;
  isTyping: boolean;
}
