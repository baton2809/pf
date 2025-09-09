// proper database types to replace 'any'
export interface DatabaseSession {
  id: string;
  filename: string;
  title?: string;
  session_type?: string;
  user_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path: string;
  duration?: number; // duration in seconds
  ml_results: any; // this can be typed more strictly based on ML service response
  created_at: Date;
  updated_at: Date;
}

export interface SessionUpdateFields {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  mlResults?: any;
  duration?: number;
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