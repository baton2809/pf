export interface AudioSession {
  id: string;
  filename: string;
  title?: string;
  sessionType?: string;
  userId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath: string;
  duration?: number; // duration in seconds
  mlResults?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioUploadSuccess {
  sessionId: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
}

export type AudioUploadResponse = AudioUploadSuccess | ErrorResponse;

export interface SessionStatusSuccess {
  session: AudioSession;
}

export type SessionStatusResponse = SessionStatusSuccess | ErrorResponse;