import { v4 as uuidv4 } from 'uuid';
import { getFirestore, COLLECTIONS } from '../config/firebase';
import { ChatMessage, CreateChatMessageData } from '../models/Chat';
import { logger } from '../utils/logger';

/**
 * Save a chat message to Firestore
 * @param messageData - Message data to save
 * @returns Saved chat message
 */
export async function saveMessage(messageData: CreateChatMessageData): Promise<ChatMessage> {
  try {
    const db = getFirestore();
    const messageId = uuidv4();

    const chatMessage: ChatMessage = {
      id: messageId,
      meetingId: messageData.meetingId,
      userId: messageData.userId,
      userName: messageData.userName,
      message: messageData.message,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text',
    };

    // Save to Firestore
    await db.collection(COLLECTIONS.CHAT).doc(messageId).set(chatMessage);

    logger.info(`Chat message saved: ${messageId} in meeting: ${messageData.meetingId}`);

    return chatMessage;
  } catch (error) {
    logger.error('Error saving chat message', error);
    throw error;
  }
}

/**
 * Get chat messages for a meeting
 * @param meetingId - Meeting ID
 * @param limit - Number of messages to retrieve
 * @returns Array of chat messages
 */
export async function getMessagesByMeetingId(
  meetingId: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  try {
    const db = getFirestore();
    const messagesRef = db.collection(COLLECTIONS.CHAT);

    const snapshot = await messagesRef
      .where('meetingId', '==', meetingId)
      .orderBy('timestamp', 'asc')
      .limit(limit)
      .get();

    const messages = snapshot.docs.map((doc) => doc.data() as ChatMessage);

    return messages;
  } catch (error) {
    logger.error('Error getting chat messages', error);
    throw error;
  }
}

/**
 * Delete all chat messages for a meeting
 * @param meetingId - Meeting ID
 */
export async function deleteMessagesByMeetingId(meetingId: string): Promise<void> {
  try {
    const db = getFirestore();
    const messagesRef = db.collection(COLLECTIONS.CHAT);

    const snapshot = await messagesRef.where('meetingId', '==', meetingId).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Deleted all chat messages for meeting: ${meetingId}`);
  } catch (error) {
    logger.error('Error deleting chat messages', error);
    throw error;
  }
}

/**
 * Get message count for a meeting
 * @param meetingId - Meeting ID
 * @returns Number of messages
 */
export async function getMessageCount(meetingId: string): Promise<number> {
  try {
    const db = getFirestore();
    const messagesRef = db.collection(COLLECTIONS.CHAT);

    const snapshot = await messagesRef.where('meetingId', '==', meetingId).get();

    return snapshot.size;
  } catch (error) {
    logger.error('Error getting message count', error);
    throw error;
  }
}
