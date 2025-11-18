/**
 * WebRTC signal types
 */
export type SignalType = 'offer' | 'answer' | 'ice-candidate';

/**
 * WebRTC signaling data
 */
export interface WebRTCSignal {
  type: SignalType;
  from: string; // User ID
  to: string; // User ID
  meetingId: string;
  signal: unknown; // WebRTC signal data
  mediaType: 'audio' | 'video' | 'both';
}

/**
 * Peer connection data
 */
export interface PeerConnection {
  userId: string;
  peerId: string;
  meetingId: string;
  connectedAt: string;
  mediaType: 'audio' | 'video' | 'both';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

/**
 * Media control event
 */
export interface MediaControlEvent {
  userId: string;
  meetingId: string;
  type: 'audio' | 'video';
  enabled: boolean;
}
