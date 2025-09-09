import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// session interfaces
export interface Session {
  id: string;
  userId: string;
  title: string;
  description?: string;
  zoomMeetingId?: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'error';
  settings: SessionSettings;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // analytics summary
  summaryRating?: number;
  questionsAsked: number;
  avgResponseTime?: number;
  detectedEmotions?: Record<string, number>;
  biometricSummary?: any;
  improvementSuggestions: string[];
  strongAreas: string[];
  weakAreas: string[];
}

export interface SessionSettings {
  tutorRole: 'mentor' | 'coach' | 'expert';
  questionStyle: 'supportive' | 'challenging' | 'neutral';
  duration: number; // seconds (60-3600)
  language: 'ru' | 'en';
  presentationUrl?: string;
  enableBiometrics: boolean;
  enableEmotionAnalysis: boolean;
  enableRealtimeFeedback: boolean;
}

export interface CreateSessionRequest {
  title: string;
  description?: string;
  settings: SessionSettings;
}

export interface SpeechSegment {
  id: string;
  sessionId: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  emotion: string;
  score: number; // confidence 0.0-1.0
  createdAt: string;
}

export interface EmotionSummary {
  id: string;
  sessionId: string;
  dominantEmotion?: string;
  emotionDistribution: Record<string, number>;
  averageConfidence?: number;
  tempRate?: number; // words per minute
  createdAt: string;
  updatedAt: string;
}

// session API functions
export const sessionApi = {
  // core session CRUD
  async createSession(sessionData: CreateSessionRequest): Promise<Session> {
    const response = await api.post('/api/sessions', sessionData);
    return response.data;
  },

  async getSession(sessionId: string): Promise<Session> {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  },

  async getUserSessions(): Promise<Session[]> {
    const response = await api.get('/api/sessions');
    return response.data;
  },

  async updateSessionStatus(sessionId: string, status: Session['status']): Promise<Session> {
    const response = await api.put(`/api/sessions/${sessionId}/status`, { status });
    return response.data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/api/sessions/${sessionId}`);
  },

  // session state management
  async getSessionState(sessionId: string): Promise<any> {
    const response = await api.get(`/api/sessions/${sessionId}/state`);
    return response.data;
  },

  async sendSessionMessage(sessionId: string, message: string): Promise<any> {
    const response = await api.post(`/api/sessions/${sessionId}/message`, { message });
    return response.data;
  },

  // ML integration
  async processAudio(sessionId: string, audioFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await api.post(`/api/sessions/${sessionId}/process-audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // analytics & data
  async addSessionMetrics(sessionId: string, metrics: any): Promise<void> {
    await api.post(`/api/sessions/${sessionId}/metrics`, metrics);
  },

  async getSpeechSegments(sessionId: string): Promise<SpeechSegment[]> {
    const response = await api.get(`/api/sessions/${sessionId}/speech-segments`);
    return response.data;
  },

  async getEmotionSummary(sessionId: string): Promise<EmotionSummary> {
    const response = await api.get(`/api/sessions/${sessionId}/emotion-summary`);
    return response.data;
  },

  async getUserEmotionStatistics(userId: string): Promise<any> {
    const response = await api.get(`/api/users/${userId}/emotion-statistics`);
    return response.data;
  }
};

// error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);