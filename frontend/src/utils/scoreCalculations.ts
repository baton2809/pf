// utility functions for ML results analysis and score calculations

export interface MLResults {
  speech_segments?: Array<{start: number, end: number, text: string}>;
  metrics?: {
    pace_rate: number;        // words per minute
    pace_mark: number;        // pace quality score (0-10)
    emotion_mark: number;     // emotional expression (0-10)
    avg_sentences_len: number; // average sentence length
  };
  pitch_evaluation?: {
    marks: {
      structure: number;      // 0-10
      clarity: number;        // 0-10
      specificity: number;    // 0-10
      persuasiveness: number; // 0-10
    };
    unclarity_moments?: string[];
    hesitant_phrases?: string[];
    filler_words?: Array<{word: string, count: number}>;
  };
}

/**
 * calculate overall score from ML results
 * combines pitch evaluation marks into 0-100 scale
 */
export const calculateOverallScore = (results: MLResults): number => {
  if (!results?.pitch_evaluation?.marks) {
    return 0;
  }

  const { structure, clarity, specificity, persuasiveness } = results.pitch_evaluation.marks;
  
  // average of the four main criteria, scaled to 0-100
  const averageScore = (structure + clarity + specificity + persuasiveness) / 4;
  return Math.round(averageScore * 10); // convert from 0-10 to 0-100
};

/**
 * get color for score display based on score value and type
 */
export const getScoreColor = (score: number, type: 'pace' | 'energy' | 'clarity' | 'confidence' | 'overall'): string => {
  switch(type) {
    case 'pace':
      // pace has special logic - ideal range is 120-180 wpm
      if (score >= 120 && score <= 180) return '#22c55e'; // green
      return '#ef4444'; // red
      
    case 'overall':
      if (score >= 80) return '#22c55e';
      if (score >= 60) return '#f59e0b'; 
      if (score >= 40) return '#ff8f00';
      return '#ef4444';
      
    case 'energy':
    case 'clarity':
    case 'confidence':
    default:
      // standard 0-10 scale coloring
      if (score >= 7) return '#22c55e';
      if (score >= 4) return '#f59e0b'; 
      return '#ef4444';
  }
};

/**
 * determine if transcription is ready from SSE progress
 */
export const isTranscriptionReady = (progress: number, step?: string): boolean => {
  return progress >= 35 || step === 'transcription_completed';
};

/**
 * determine if metrics are ready from SSE progress
 */
export const areMetricsReady = (progress: number, step?: string): boolean => {
  return progress >= 85 || step === 'parallel_processing_completed';
};

/**
 * determine if analysis is complete from SSE progress
 */
export const isAnalysisComplete = (progress: number, status?: string): boolean => {
  return progress === 100 || status === 'completed';
};

/**
 * extract filler words percentage from ML results
 */
export const calculateFillerWordsPercentage = (
  fillerWords: Array<{word: string, count: number}>,
  totalWords: number
): number => {
  if (!fillerWords || fillerWords.length === 0 || !totalWords) return 0;
  
  const totalFillers = fillerWords.reduce((sum, item) => sum + item.count, 0);
  return (totalFillers / totalWords) * 100;
};

/**
 * estimate total words from speech segments
 */
export const estimateTotalWords = (segments: Array<{text: string}>): number => {
  if (!segments || segments.length === 0) return 0;
  
  return segments.reduce((total, segment) => {
    const words = segment.text.trim().split(/\s+/).filter(word => word.length > 0);
    return total + words.length;
  }, 0);
};

/**
 * format duration from seconds to minutes:seconds
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * get total presentation duration from speech segments
 */
export const getTotalDuration = (segments: Array<{start: number, end: number, text: string}>): number => {
  if (!segments || segments.length === 0) return 0;
  const lastSegment = segments[segments.length - 1];
  return lastSegment.end;
};