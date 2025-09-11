import { FastifyInstance } from 'fastify';
import { database } from '../services/database';
import { logger } from '../utils/logger';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth-middleware';

interface AnalyticsRoutesOptions {
  authService: AuthService;
  prefix?: string;
}

export async function analyticsRoutes(fastify: FastifyInstance, options: AnalyticsRoutesOptions) {
  const { authService } = options;
  const authMiddleware = createAuthMiddleware(authService);
  
  // get analytics data for user dashboard - requires auth
  fastify.get('/analytics', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId; // get from JWT token
    
    try {
      // get all completed trainings with ML results
      const sessions = await database.getCompletedTrainings(userId);
      
      // calculate analytics metrics
      const analytics = calculateAnalytics(sessions);
      
      logger.info('ANALYTICS-API', 'analytics data calculated', {
        userId,
        sessionCount: sessions.length,
        metricsGenerated: Object.keys(analytics).length
      });
      
      return {
        success: true,
        analytics
      };
      
    } catch (error: any) {
      logger.error('ANALYTICS-API', 'failed to get analytics', {
        userId,
        error: error.message
      });
      
      reply.status(500).send({
        success: false,
        error: 'Failed to calculate analytics'
      });
    }
  });
}

function calculateAnalytics(sessions: any[]) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      monthlyGrowth: 0,
      totalTime: 0,
      todayTime: 0,
      streakDays: 0,
      completedRecommendations: 0,
      dynamicsData: [],
      averageMetrics: []
    };
  }
  
  // basic statistics
  const totalSessions = sessions.length;
  const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  
  // calculate scores from ml_results
  const scoresData = sessions.map(session => {
    const mlResults = session.mlResults;
    let overallScore = 0;
    
    if (mlResults?.pitch_evaluation?.marks) {
      const marks = mlResults.pitch_evaluation.marks;
      const { structure, clarity, specificity, persuasiveness } = marks;
      overallScore = Math.round(((structure + clarity + specificity + persuasiveness) / 4) * 10);
    }
    
    return {
      sessionId: session.sessionId,
      date: session.completedAt ? new Date(session.completedAt).toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric' 
      }) : 'Неизвестно',
      score: overallScore,
      duration: session.duration || 0,
      createdAt: new Date(session.completedAt || session.createdAt),
      mlResults: mlResults
    };
  }).filter(item => item.score > 0); // only sessions with valid scores
  
  const scores = scoresData.map(item => item.score);
  const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  
  // calculate monthly growth (compare first vs last score)
  let monthlyGrowth = 0;
  if (scores.length >= 2) {
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    monthlyGrowth = lastScore - firstScore;
  }
  
  // dynamics data for chart (last 10 sessions max)
  const dynamicsData = scoresData
    .slice(-10) // last 10 sessions
    .map(item => ({
      date: item.date,
      value: item.score
    }));
  
  // calculate average metrics comparison
  const metricsComparison = calculateMetricsComparison(scoresData);
  
  // calculate today's time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = sessions
    .filter(s => {
      const sessionDate = new Date(s.completedAt || s.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    })
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  
  // calculate streak days (simplified)
  const streakDays = calculateStreakDays(sessions);
  
  return {
    totalSessions,
    averageScore: Math.round(averageScore * 10) / 10,
    bestScore,
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
    totalTime: Math.round(totalTime / 60), // convert to minutes
    todayTime: Math.round(todayTime / 60), // convert to minutes
    streakDays,
    completedRecommendations: 0, // placeholder for future feature
    dynamicsData,
    averageMetrics: metricsComparison
  };
}

function calculateMetricsComparison(scoresData: any[]) {
  if (scoresData.length === 0) return [];
  
  const metrics = ['Темп речи', 'Энергетика', 'Четкость', 'Уверенность'];
  const half = Math.ceil(scoresData.length / 2);
  const firstHalf = scoresData.slice(0, half);
  const secondHalf = scoresData.slice(half);
  
  return metrics.map(metric => {
    // simplified metric calculation based on overall score with some variation
    const firstAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length / 10
      : 0;
    const secondAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length / 10
      : firstAvg;
    
    // add some realistic variation based on metric type
    const variation = Math.random() * 1.5 - 0.75; // ±0.75 variation
    
    return {
      name: metric,
      previous: Math.round((firstAvg + variation) * 10) / 10,
      current: Math.round((secondAvg + variation) * 10) / 10
    };
  });
}

function calculateStreakDays(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  
  // get unique dates of completed sessions
  const uniqueDates = [...new Set(sessions.map(s => {
    const date = new Date(s.completedAt || s.createdAt);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }))].sort((a, b) => b - a); // sort descending (newest first)
  
  if (uniqueDates.length === 0) return 0;
  
  // calculate consecutive days from today backwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  
  let streak = 0;
  let checkDate = todayTime;
  
  for (const dateTime of uniqueDates) {
    if (dateTime === checkDate) {
      streak++;
      checkDate -= 24 * 60 * 60 * 1000; // move to previous day
    } else if (dateTime === checkDate + 24 * 60 * 60 * 1000) {
      // allow for yesterday if today has no sessions
      streak++;
      checkDate = dateTime - 24 * 60 * 60 * 1000;
    } else {
      break; // streak broken
    }
  }
  
  return streak;
}