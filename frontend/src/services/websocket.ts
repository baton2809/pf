import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  userId?: string;
  data?: any;
  timestamp?: number;
}

export interface SessionStatusMessage extends WebSocketMessage {
  type: 'session_status';
  sessionId: string;
  status: 'active' | 'paused' | 'completed';
  progress: {
    timeRemaining: number;
    questionsAsked: number;
  };
}

export interface TutorQuestionMessage extends WebSocketMessage {
  type: 'tutor_question';
  sessionId: string;
  question: string;
  timestamp: number;
}

export interface HeartRateUpdateMessage extends WebSocketMessage {
  type: 'heart_rate_update';
  sessionId: string;
  heartRate: number;
  timestamp: number;
}

export interface AudioChunkMessage extends WebSocketMessage {
  type: 'audio_chunk';
  sessionId: string;
  userId: string;
  data: any;
  timestamp: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(`${WS_URL}`, {
          transports: ['websocket'],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
        });

        // handle incoming messages
        this.socket.onAny((event, data) => {
          if (event !== 'connect' && event !== 'disconnect') {
            this.handleMessage({ type: event, ...data });
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          // retry failed, will try again in next timeout
        });
      }, Math.pow(2, this.reconnectAttempts) * 1000); // exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnects_reached', {});
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  send(message: WebSocketMessage): boolean {
    if (this.socket && this.isConnected) {
      this.socket.emit(message.type, message);
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }

  // event handling
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    this.emit(message.type, message);
    this.emit('message', message); // generic message handler
  }

  // session-specific methods
  joinSession(sessionId: string): void {
    this.send({
      type: 'join_session',
      sessionId
    });
  }

  leaveSession(sessionId: string): void {
    this.send({
      type: 'leave_session',
      sessionId
    });
  }

  startPitch(sessionId: string, settings: any): void {
    this.send({
      type: 'start_pitch',
      sessionId,
      data: settings,
      timestamp: Date.now()
    });
  }

  sendHeartRate(sessionId: string, heartRate: number): void {
    this.send({
      type: 'heart_rate_update',
      sessionId,
      data: { heartRate },
      timestamp: Date.now()
    });
  }

  sendAudioChunk(sessionId: string, audioData: any): void {
    this.send({
      type: 'audio_chunk',
      sessionId,
      data: audioData,
      timestamp: Date.now()
    });
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// singleton instance
export const wsService = new WebSocketService();