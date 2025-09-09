// shared types for recording interface components

export type RecordingStatus = 'idle' | 'countdown' | 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';

export interface RecordingState {
  status: RecordingStatus;
  hasStarted: boolean;
  countdown: number;
  actualRecordingTime: number;
  showAnalysisModal: boolean;
  analysisProgress: number;
  statusOpacity: number;
}

export interface AudioRecordingData {
  audioBlob: Blob;
  sessionId: string;
  mlResults?: any;
}

export interface AudioRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  onRecordingStart?: () => void;
  onRecordingComplete?: (data: AudioRecordingData) => void;
  onStatusChange: (status: RecordingStatus) => void;
  onTimeUpdate: (time: number) => void;
  sessionType?: string;
}

export interface ProgressTrackerProps {
  sessionId: string | null;
  onProgressUpdate: (progress: number) => void;
  onStatusChange: (status: RecordingStatus) => void;
  onAnalysisComplete: (data: AudioRecordingData) => void;
  onError: (error: string) => void;
}

export interface AnalysisModalProps {
  isVisible: boolean;
  progress: number;
  onClose: () => void;
}

export interface RecordingInterfaceProps {
  isRecording?: boolean; // deprecated, kept for backward compatibility
  recordingTime?: number; // deprecated, kept for backward compatibility
  onGoToQuestions: () => void;
  onEndSession: () => void;
  onRecordingStart?: () => void;
  onRecordingComplete?: (data: AudioRecordingData) => void;
  sessionType?: string;
}

export interface RecordingContextType {
  state: RecordingState;
  actions: {
    setStatus: (status: RecordingStatus) => void;
    setHasStarted: (hasStarted: boolean) => void;
    setCountdown: (countdown: number | ((prev: number) => number)) => void;
    setActualRecordingTime: (time: number | ((prev: number) => number)) => void;
    setShowAnalysisModal: (show: boolean) => void;
    setAnalysisProgress: (progress: number) => void;
    setStatusOpacity: (opacity: number) => void;
    resetState: () => void;
  };
}