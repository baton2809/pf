export interface SlideAnalysis {
  slideNumber: number;
  title: string;
  thumbnail?: string; // base64 или URL превью слайда
  textContent: string;
  designScore: number; // 0-100
  contentScore: number; // 0-100
  readabilityScore: number; // 0-100
  issues: {
    design: string[];
    content: string[];
    readability: string[];
  };
  suggestions: string[];
}

export interface PresentationAnalysis {
  fileName: string;
  fileSize: number; // в байтах
  slideCount: number;
  overallDesignScore: number; // 0-100
  overallContentScore: number; // 0-100
  overallReadabilityScore: number; // 0-100
  slides: SlideAnalysis[];
  generalRecommendations: string[];
  structuralIssues: string[];
}

export interface SpeechAnalysis {
  // legacy mock data format
  tempo?: {
    score: number; // 0-100
    wordsPerMinute: number;
    assessment: string; // 'слишком быстро' | 'оптимально' | 'слишком медленно'
    feedback: string;
  };
  energy?: {
    score: number; // 0-100
    emotion: 'happiness' | 'sadness' | 'neutral';
    level: 'энергично' | 'умеренно' | 'монотонно';
    feedback: string;
  };
  confidence?: {
    score: number; // 0-100
    uncertainPhrases: string[];
    fillerWords: { word: string; count: number }[];
    awkwardPauses: number;
    feedback: string;
  };
  awareness?: {
    score: number; // 0-100
    excessWords: string[];
    repeatedWords: { word: string; count: number }[];
    avgSentenceLength: number;
    feedback: string;
  };
  clarity?: {
    score: number; // 0-100
    articulation: number; // 0-100
    pronunciation: string[];
    feedback: string;
  };
  // ML service data format
  speech_segments?: Array<{
    start: number;
    end: number;
    text: string;
    emotion_data: {
      emotion: string;
      score: string;
    };
  }>;
  temp_rate?: number;
}

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  duration: number; // в секундах
  overallScore?: number; // от 0 до 100
  score?: number; // alternative field for ML results
  speechAnalysis?: SpeechAnalysis | any; // allow any for ML results
  presentationAnalysis?: PresentationAnalysis;
  type: 'presentation' | 'interview' | 'sales' | 'public-speaking';
  status: 'completed' | 'in-progress' | 'scheduled';
}

export interface UserStats {
  totalSessions: number;
  averageScore: number;
  totalPracticeTime: number; // в минутах
  improvementRate: number; // в процентах
  streakDays: number;
  lastSessionDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
}

// Mock data removed - use real API data only

export const sessionTypeLabels = {
  'presentation': 'Презентация',
  'interview': 'Собеседование',
  'sales': 'Продажи',
  'public-speaking': 'Публичное выступление'
};

// Mock utility functions removed - use real API data only

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  averageScore: number;
  totalSessions: number;
  totalPracticeTime: number; // в минутах
  lastActive: string;
  rank: number;
  badges: string[];
}

// Mock leaderboard data removed - use real API data only

// Mock speech analysis function removed - use real ML data only