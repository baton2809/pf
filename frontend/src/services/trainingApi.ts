export interface Training {
  id: string;
  title: string;
  type: string;
  userId: string;
  status: string;
  presentationPath?: string;
  presentationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  trainingId: string;
  status: string;
  audioPath?: string;
  duration?: number;
  mlResults?: any;
  startTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingRequest {
  title: string;
  type: string;
  userId: string;
}

export interface CreateTrainingResponse {
  trainingId: string;
  status: string;
}

export interface SessionInitResponse {
  sessionId: string;
  training: {
    title: string;
    type: string;
    hasPresentation: boolean;
  };
}

export interface SessionResultsResponse {
  session: {
    id: string;
    status: string;
    duration?: number;
    completedAt?: string;
    results?: any;
  };
  training: {
    title: string;
    type: string;
  };
}

export interface ProgressEvent {
  progress: number;
  stage: string;
  sessionId: string;
  data?: any;
  message?: string;
}

class TrainingApiService {
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  async createTraining(request: CreateTrainingRequest): Promise<CreateTrainingResponse> {
    const response = await fetch(`${this.baseUrl}/api/training/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to create training');
    }

    return response.json();
  }

  async uploadPresentation(trainingId: string, file: File): Promise<{ message: string; hasPresentation: boolean }> {
    const formData = new FormData();
    formData.append('presentation', file);

    const response = await fetch(`${this.baseUrl}/api/training/${trainingId}/presentation`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload presentation');
    }

    return response.json();
  }

  async initSession(trainingId: string): Promise<SessionInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/training/${trainingId}/session/init`);

    if (!response.ok) {
      throw new Error('Failed to initialize session');
    }

    return response.json();
  }

  async startRecording(sessionId: string, timestamp: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/upload-audio`, {
      method: 'POST',
      headers: {
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

  async getSessionResults(sessionId: string): Promise<SessionResultsResponse | { status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/results`);

    if (!response.ok) {
      throw new Error('Failed to get session results');
    }

    const result = await response.json();
    
    // log HTTP status for debugging
    console.log(`[TrainingApiService] getSessionResults HTTP ${response.status}:`, {
      sessionId,
      httpStatus: response.status,
      hasSessionKey: 'session' in result,
      hasStatusKey: 'status' in result,
      resultKeys: Object.keys(result)
    });

    return result;
  }

  // get session status for polling
  async getSessionStatus(sessionId: string): Promise<{ id: string; status: string; progress: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/training/session/${sessionId}/status`);

    if (!response.ok) {
      throw new Error('Failed to get session status');
    }

    return response.json();
  }

  // create SSE connection for real-time updates with enhanced lifecycle management
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const maxRetries = options?.retryAttempts || 3;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const retryDelay = options?.retryDelay || 2000;

    eventSource.onopen = () => {
      console.log('[TrainingApiService] SSE connection opened successfully');
      retryCount = 0; // reset retry count on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[TrainingApiService] SSE message received:', data);
        onMessage(data);
      } catch (error: any) {
        console.error('[TrainingApiService] SSE parse error:', error);
        if (onError) onError(new Event('parse_error'));
      }
    };

    eventSource.onerror = (error) => {
      console.error('[TrainingApiService] SSE connection error:', { 
        error, 
        readyState: eventSource.readyState,
        retryCount 
      });
      
      // connection states: CONNECTING = 0, OPEN = 1, CLOSED = 2
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[TrainingApiService] SSE connection closed by server');
      }
      
      if (onError) onError(error);
    };

    return eventSource;
  }

  // poll for session completion
  async pollForCompletion(
    sessionId: string,
    onProgress?: (status: { status: string; progress: number; message: string }) => void,
    intervalMs: number = 2000,
    maxAttempts: number = 90 // 3 minutes max with 2 second intervals
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

  async getTrainingHistory(userId?: string): Promise<any[]> {
    const url = userId 
      ? `${this.baseUrl}/api/training/history?userId=${userId}`
      : `${this.baseUrl}/api/training/history`;
      
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch training history');
    }

    const data = await response.json();
    return data.trainings || [];
  }

  async getSessions(userId?: string): Promise<any[]> {
    const url = userId 
      ? `${this.baseUrl}/api/training/sessions?userId=${userId}`
      : `${this.baseUrl}/api/training/sessions`;
      
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch training sessions');
    }

    const data = await response.json();
    return data.sessions || [];
  }
}

export const trainingApiService = new TrainingApiService();