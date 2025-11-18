/**
 * Meeting summary model interface for Firestore
 */
export interface MeetingSummary {
  id: string;
  meetingId: string;
  createdAt: string; // ISO-8601 format
  summary: string;
  keyPoints: string[];
  participants: string[]; // User IDs
  duration: number; // in seconds
  messageCount: number;
}

/**
 * Create summary data
 */
export interface CreateSummaryData {
  meetingId: string;
  participants: string[];
  duration: number;
}
