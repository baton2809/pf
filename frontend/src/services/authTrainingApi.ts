import { API_URL } from '../config.js';

// import existing types from trainingApi
export type {
  Training,
  Session,
  CreateTrainingRequest,
  CreateTrainingResponse,
  SessionInitResponse,
  SessionResultsResponse,
  ProgressEvent
} from './trainingApi';

class AuthTrainingApiService {
  private baseUrl = API_URL;
  private getAuthHeaders: (() => Record<string, string>) | null = null;

  // inject auth headers function from AuthContext
  setAuthHeadersProvider(getAuthHeaders: () => Record<string, string>) {
    this.getAuthHeaders = getAuthHeaders;
  }

  private getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const authHeaders = this.getAuthHeaders ? this.getAuthHeaders() : {};
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...authHeaders,
      ...additionalHeaders
    };
  }

  async createTraining(request: Omit<import('./trainingApi').CreateTrainingRequest, 'userId'>): Promise<import('./trainingApi').CreateTrainingResponse> {
    const response = await fetch(`${this.baseUrl}/api/training/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to create training');
    }

    return response.json();
  }

  async uploadPresentation(trainingId: string, file: File): Promise<{ message: string; hasPresentation: boolean }> {
    const authHeaders = this.getAuthHeaders ? this.getAuthHeaders() : {};
    const formData = new FormData();
    formData.append('presentation', file);

    const response = await fetch(`${this.baseUrl}/api/training/${trainingId}/presentation`, {
      method: 'POST',
      headers: authHeaders, // don't add content-type for FormData
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload presentation');
    }

    return response.json();
  }

  async initSession(trainingId: string): Promise<import('./trainingApi').SessionInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/training/${trainingId}/session/init`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to initialize session');
    }

    return response.json();
  }

  async startRecording(sessionId: string, timestamp: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ timestamp })
    });

    if (!response.ok) {
      throw new Error('Failed to start recording');
    }

    return response.json();
  }

  async uploadAudio(
    sessionId: string, 
    audioBlob: Blob, 
    duration: number, 
    audioFormat: string = 'audio/webm'
  ): Promise<{ sessionId: string; status: string; message: string }> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const authHeaders = this.getAuthHeaders ? this.getAuthHeaders() : {};
    
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/upload-audio`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/octet-stream',
        'X-Audio-Format': audioFormat,
        'X-Duration': duration.toString(),
        'Content-Length': uint8Array.length.toString()
      },
      body: uint8Array
    });

    if (!response.ok) {
      throw new Error('Failed to upload audio');
    }

    return response.json();
  }

  async getSessionResults(sessionId: string): Promise<import('./trainingApi').SessionResultsResponse | { status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/results`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get session results');
    }

    const result = await response.json();
    
    console.log(`[AuthTrainingApiService] getSessionResults HTTP ${response.status}:`, {
      sessionId,
      httpStatus: response.status,
      hasSessionKey: 'session' in result,
      hasStatusKey: 'status' in result,
      resultKeys: Object.keys(result)
    });

    return result;
  }

  async getSessionStatus(sessionId: string): Promise<{ id: string; status: string; progress: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/status`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get session status');
    }

    return response.json();
  }

  createSSEConnection(
    sessionId: string, 
    onMessage: (data: any) => void, 
    onError?: (error: Event) => void,
    options?: {
      retryAttempts?: number;
      retryDelay?: number;
    }
  ): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/training/session/${sessionId}/events`
    );

    let retryCount = 0;

    eventSource.onopen = () => {
      console.log('[AuthTrainingApiService] SSE connection opened successfully');
      retryCount = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[AuthTrainingApiService] SSE message received:', data);
        onMessage(data);
      } catch (error: any) {
        console.error('[AuthTrainingApiService] SSE parse error:', error);
        if (onError) onError(new Event('parse_error'));
      }
    };

    eventSource.onerror = (error) => {
      console.error('[AuthTrainingApiService] SSE connection error:', { 
        error, 
        readyState: eventSource.readyState,
        retryCount 
      });
      
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[AuthTrainingApiService] SSE connection closed by server');
      }
      
      if (onError) onError(error);
    };

    return eventSource;
  }

  async pollForCompletion(
    sessionId: string,
    onProgress?: (status: { status: string; progress: number; message: string }) => void,
    intervalMs: number = 2000,
    maxAttempts: number = 90
  ): Promise<void> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const status = await this.getSessionStatus(sessionId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            resolve();
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(status.message || 'Processing failed'));
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error('Processing timeout'));
          }
        } catch (error: any) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, intervalMs);
    });
  }

  async getTrainingHistory(): Promise<any[]> {
    const headers = this.getHeaders();
    console.log('[AuthTrainingApiService] getTrainingHistory - Request headers:', headers);
    console.log('[AuthTrainingApiService] getTrainingHistory - URL:', `${this.baseUrl}/api/training/history`);
    
    const response = await fetch(`${this.baseUrl}/api/training/history`, {
      headers
    });
    
    console.log('[AuthTrainingApiService] getTrainingHistory - Response status:', response.status);
    console.log('[AuthTrainingApiService] getTrainingHistory - Response headers:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const text = await response.text();
      console.error('[AuthTrainingApiService] getTrainingHistory - Error response:', text.substring(0, 200));
      throw new Error('Failed to fetch training history');
    }

    const data = await response.json();
    return data.trainings || [];
  }

  async getSessions(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/training/sessions`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch training sessions');
    }

    const data = await response.json();
    return data.sessions || [];
  }

  async getAnalytics(): Promise<any> {
    const headers = this.getHeaders();
    console.log('[AuthTrainingApiService] getAnalytics - Request headers:', headers);
    console.log('[AuthTrainingApiService] getAnalytics - URL:', `${this.baseUrl}/api/analytics`);
    
    const response = await fetch(`${this.baseUrl}/api/analytics`, {
      headers
    });
    
    console.log('[AuthTrainingApiService] getAnalytics - Response status:', response.status);
    console.log('[AuthTrainingApiService] getAnalytics - Response headers:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const text = await response.text();
      console.error('[AuthTrainingApiService] getAnalytics - Error response:', text.substring(0, 200));
      throw new Error('Failed to fetch analytics data');
    }

    const data = await response.json();
    return data.analytics;
  }
}

export const authTrainingApiService = new AuthTrainingApiService();