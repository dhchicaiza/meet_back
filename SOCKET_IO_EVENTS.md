# Socket.io Events Documentation

This document describes all Socket.io events supported by the backend for real-time communication (Sprints 2, 3, and 4).

## Connection

### Authentication
All Socket.io connections require authentication via JWT token:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

## Sprint 2: Chat Events

### Client → Server Events

#### `join-meeting`
Join a meeting room to start receiving real-time updates.

**Payload:**
```javascript
{
  meetingId: string  // Meeting ID to join
}
```

**Response Events:**
- `joined-meeting` - Confirmation of successful join
- `user-joined` - Broadcast to other participants
- `chat-message` - System message about user joining
- `error` - If join fails

---

#### `leave-meeting`
Leave a meeting room.

**Payload:**
```javascript
{
  meetingId: string  // Meeting ID to leave
}
```

**Response Events:**
- `user-left` - Broadcast to other participants
- `chat-message` - System message about user leaving

---

#### `send-message`
Send a chat message to the meeting.

**Payload:**
```javascript
{
  meetingId: string,  // Meeting ID
  message: string     // Message content
}
```

**Response Events:**
- `chat-message` - Broadcast to all participants (including sender)
- `error` - If message fails to send

---

#### `typing`
Indicate that user is typing.

**Payload:**
```javascript
{
  meetingId: string,   // Meeting ID
  isTyping: boolean    // true when typing, false when stopped
}
```

**Response Events:**
- `user-typing` - Broadcast to other participants (not sender)

---

#### `get-participants`
Request current list of participants in a meeting.

**Payload:**
```javascript
{
  meetingId: string  // Meeting ID
}
```

**Response Events:**
- `participants-list` - List of current participants

---

### Server → Client Events

#### `joined-meeting`
Confirmation that you've successfully joined a meeting.

**Payload:**
```javascript
{
  meetingId: string,
  timestamp: string  // ISO-8601
}
```

---

#### `user-joined`
Another user joined the meeting.

**Payload:**
```javascript
{
  userId: string,
  userName: string,
  timestamp: string  // ISO-8601
}
```

---

#### `user-left`
Another user left the meeting.

**Payload:**
```javascript
{
  userId: string,
  userName: string,
  timestamp: string  // ISO-8601
}
```

---

#### `chat-message`
New chat message received.

**Payload:**
```javascript
{
  id: string,
  meetingId: string,
  userId: string,
  userName: string,
  message: string,
  timestamp: string,  // ISO-8601
  type: 'text' | 'system'
}
```

---

#### `user-typing`
Another user is typing.

**Payload:**
```javascript
{
  userId: string,
  userName: string,
  meetingId: string,
  isTyping: boolean
}
```

---

#### `participants-list`
List of current meeting participants.

**Payload:**
```javascript
{
  participants: [{
    userId: string,
    joinedAt: string,  // ISO-8601
    active: boolean
  }]
}
```

---

## Sprint 3 & 4: WebRTC Events

### Client → Server Events

#### `webrtc-signal`
Send WebRTC signaling data (offer/answer/ICE candidates) to another peer.

**Payload:**
```javascript
{
  type: 'offer' | 'answer' | 'ice-candidate',
  from: string,      // Your user ID
  to: string,        // Target user ID
  meetingId: string,
  signal: any,       // WebRTC signal data
  mediaType: 'audio' | 'video' | 'both'
}
```

**Response Events:**
- Signal forwarded to target user

---

#### `media-control`
Toggle audio/video on or off.

**Payload:**
```javascript
{
  meetingId: string,
  type: 'audio' | 'video',
  enabled: boolean
}
```

**Response Events:**
- `user-media-changed` - Broadcast to other participants

---

### Server → Client Events

#### `webrtc-signal`
Receive WebRTC signaling data from another peer.

**Payload:**
```javascript
{
  type: 'offer' | 'answer' | 'ice-candidate',
  from: string,      // Sender user ID
  signal: any,       // WebRTC signal data
  mediaType: 'audio' | 'video' | 'both'
}
```

---

#### `user-media-changed`
Another user toggled their audio/video.

**Payload:**
```javascript
{
  userId: string,
  type: 'audio' | 'video',
  enabled: boolean
}
```

---

### Error Event

#### `error`
Error occurred during Socket.io operation.

**Payload:**
```javascript
{
  message: string  // Error description
}
```

---

## Example Frontend Implementation

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useSocket(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io('http://localhost:3000', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return socket;
}
```

### Join Meeting Example

```typescript
const joinMeeting = (socket: Socket, meetingId: string) => {
  socket.emit('join-meeting', { meetingId });

  socket.on('joined-meeting', (data) => {
    console.log('Joined meeting:', data);
  });

  socket.on('user-joined', (data) => {
    console.log('User joined:', data);
  });

  socket.on('chat-message', (message) => {
    console.log('New message:', message);
  });
};
```

### Send Chat Message Example

```typescript
const sendMessage = (socket: Socket, meetingId: string, message: string) => {
  socket.emit('send-message', { meetingId, message });
};
```

### WebRTC Connection Example

```typescript
const initiateWebRTC = (socket: Socket, targetUserId: string, meetingId: string) => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  // Create and send offer
  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-signal', {
      type: 'offer',
      to: targetUserId,
      meetingId,
      signal: offer,
      mediaType: 'both'
    });
  });

  // Handle incoming signals
  socket.on('webrtc-signal', (data) => {
    if (data.type === 'offer') {
      peerConnection.setRemoteDescription(data.signal);
      peerConnection.createAnswer().then(answer => {
        peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-signal', {
          type: 'answer',
          to: data.from,
          meetingId,
          signal: answer,
          mediaType: 'both'
        });
      });
    } else if (data.type === 'answer') {
      peerConnection.setRemoteDescription(data.signal);
    } else if (data.type === 'ice-candidate') {
      peerConnection.addIceCandidate(data.signal);
    }
  });

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-signal', {
        type: 'ice-candidate',
        to: targetUserId,
        meetingId,
        signal: event.candidate,
        mediaType: 'both'
      });
    }
  };
};
```

---

## STUN/TURN Server Configuration

For production deployments, configure your own STUN/TURN servers in the environment variables:

```env
STUN_SERVER_1_HOST=0.0.0.0
STUN_SERVER_1_PORT=3478
STUN_SERVER_2_HOST=0.0.0.0
STUN_SERVER_2_PORT=3479

TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential
```

Use these in your RTCPeerConnection configuration:

```typescript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    {
      urls: `stun:${STUN_SERVER_1_HOST}:${STUN_SERVER_1_PORT}`
    },
    {
      urls: TURN_SERVER_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL
    }
  ]
});
```

---

## Notes

- All events are real-time and do not require HTTP requests
- Messages are persisted to Firestore for history
- WebRTC uses peer-to-peer connections for media streams
- Socket.io automatically handles reconnection
- Always handle errors gracefully on the client side
