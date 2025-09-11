export interface SessionUpdateFields {
  status?: 'recording' | 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';
  mlResults?: any;
  duration?: number;
  startTime?: Date;
  completedAt?: Date;
  transcriptionText?: string;
  mlProcessingStatus?: 'pending' | 'in_progress' | 'completed' | 'partial' | 'failed';
}

export interface MLOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: 'NETWORK_ERROR' | 'SERVICE_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';
    message: string;
    httpStatus?: number;
    retryable: boolean;
  };
}

export class DatabaseError extends Error {
  constructor(
    message: string, 
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}