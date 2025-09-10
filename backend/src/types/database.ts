export interface SessionUpdateFields {
  status?: 'recording' | 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';
  mlResults?: any;
  duration?: number;
  startTime?: Date;
  completedAt?: Date;
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