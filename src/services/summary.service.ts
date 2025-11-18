import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { getFirestore, COLLECTIONS } from '../config/firebase';
import { MeetingSummary, CreateSummaryData } from '../models/Summary';
import { getMessagesByMeetingId, getMessageCount } from './chat.service';
import { logger } from '../utils/logger';

let openai: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
function initializeOpenAI(): void {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }
}

/**
 * Generate AI summary of meeting chat
 * @param meetingId - Meeting ID
 * @returns Generated summary text
 */
async function generateAISummary(meetingId: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    initializeOpenAI();

    if (!openai) {
      logger.warn('OpenAI not configured, returning default summary');
      return {
        summary: 'Meeting summary not available (OpenAI not configured)',
        keyPoints: [],
      };
    }

    // Get chat messages
    const messages = await getMessagesByMeetingId(meetingId, 500);

    if (messages.length === 0) {
      return {
        summary: 'No messages in this meeting',
        keyPoints: [],
      };
    }

    // Format messages for AI
    const chatHistory = messages
      .filter((msg) => msg.type === 'text')
      .map((msg) => `${msg.userName}: ${msg.message}`)
      .join('\n');

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a meeting assistant. Analyze the following chat conversation and provide: 1) A concise summary (2-3 sentences), 2) A list of key points discussed (max 5 bullet points). Format your response as JSON with keys "summary" and "keyPoints" (array).',
        },
        {
          role: 'user',
          content: `Chat conversation:\n\n${chatHistory}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(response);

    return {
      summary: parsed.summary || 'Summary not available',
      keyPoints: parsed.keyPoints || [],
    };
  } catch (error) {
    logger.error('Error generating AI summary', error);
    return {
      summary: 'Error generating summary',
      keyPoints: [],
    };
  }
}

/**
 * Create and save meeting summary
 * @param summaryData - Summary creation data
 * @returns Created summary
 */
export async function createSummary(summaryData: CreateSummaryData): Promise<MeetingSummary> {
  try {
    const db = getFirestore();
    const summaryId = uuidv4();

    // Generate AI summary
    const { summary, keyPoints } = await generateAISummary(summaryData.meetingId);

    // Get message count
    const messageCount = await getMessageCount(summaryData.meetingId);

    const meetingSummary: MeetingSummary = {
      id: summaryId,
      meetingId: summaryData.meetingId,
      createdAt: new Date().toISOString(),
      summary,
      keyPoints,
      participants: summaryData.participants,
      duration: summaryData.duration,
      messageCount,
    };

    // Save to Firestore
    await db.collection(COLLECTIONS.SUMMARIES).doc(summaryId).set(meetingSummary);

    logger.info(`Meeting summary created: ${summaryId} for meeting: ${summaryData.meetingId}`);

    return meetingSummary;
  } catch (error) {
    logger.error('Error creating summary', error);
    throw error;
  }
}

/**
 * Get summary by meeting ID
 * @param meetingId - Meeting ID
 * @returns Meeting summary or null
 */
export async function getSummaryByMeetingId(meetingId: string): Promise<MeetingSummary | null> {
  try {
    const db = getFirestore();
    const summariesRef = db.collection(COLLECTIONS.SUMMARIES);

    const snapshot = await summariesRef.where('meetingId', '==', meetingId).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const summaryDoc = snapshot.docs[0];
    return summaryDoc?.data() as MeetingSummary;
  } catch (error) {
    logger.error('Error getting summary', error);
    throw error;
  }
}
