// Extended ML Results interface
export interface ExtendedMLResults {
  // Audio Analysis
  speech_segments: AsrSegment[];
  metrics?: SpeechMetrics;
  
  // Text Analysis
  pitch_evaluation?: PitchEvaluation;
  advices?: Advice[];
  pitch_summary?: string;
  
  // Interactive Features
  questions?: string[];
  
  // Meta
  temp_rate: number;
  processing_time?: ProcessingTime;
}

export interface AsrSegment {
  start: number;
  end: number;
  text: string;
}

export interface SpeechMetrics {
  pace_rate: number;         // words per minute
  pace_mark: number;         // pace quality score (0-10)
  emotion_mark: number;      // emotional expression (0-10)
  avg_sentences_len: number; // average sentence length
}

export interface PitchEvaluation {
  marks: PitchMarks;
  missing_blocks: string[];
  pros: string[];
  cons: string[];
}

export interface PitchMarks {
  structure: number;      // 0-10
  clarity: number;        // 0-10
  specificity: number;    // 0-10
  persuasiveness: number; // 0-10
}

export interface Advice {
  title: string;
  importance: string;     // 'высокая' | 'средняя' | 'низкая'
  reason: string;
  todo: string;
  example: string;
}

export interface ProcessingTime {
  transcription?: number;
  parallel_processing?: number;  // total time for parallel stage
  metrics?: number;              // individual time within parallel stage
  pitch_analysis?: number;       // individual time within parallel stage
  questions?: number;            // individual time within parallel stage
  total?: number;
}

export interface AudioSession {
  id: string;
  filename: string;
  title?: string;
  sessionType?: string;
  userId?: string;
  status: 'recording' | 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';
  filePath: string;
  duration?: number; // duration in seconds
  mlResults?: ExtendedMLResults;
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