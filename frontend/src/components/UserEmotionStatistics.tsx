import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { formatDuration } from '../utils/formatting';

// types for user emotion statistics
interface EmotionTrend {
  sessionId: string;
  date: string;
  averageConfidence: number;
  speakingRate: number;
  dominantEmotion: string;
  sessionDuration: number;
}

interface UserEmotionStatsData {
  userId: string;
  totalSessions: number;
  totalDuration: number; // in seconds
  averageConfidence: number;
  averageSpeakingRate: number;
  topEmotions: { emotion: string; frequency: number; percentage: number }[];
  overallEmotionDistribution: { [emotion: string]: number };
  emotionTrends: EmotionTrend[];
  improvementAreas: string[];
  strengths: string[];
}

interface UserEmotionStatisticsProps {
  userId: string;
}

// simple line chart component using SVG
const SimpleLineChart: React.FC<{ 
  data: { date: string; value: number }[]; 
  title: string;
  color?: string;
}> = ({ data, title, color = '#1976d2' }) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">нет данных для отображения</Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // create points for the line
  const points = data.map((d, index) => ({
    x: (index / (data.length - 1)) * 280 + 20, // 20px padding on each side
    y: 160 - ((d.value - minValue) / range) * 120 + 20 // inverted Y, 20px padding
  }));

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom color="text.secondary">
        {title}
      </Typography>
      <svg width="320" height="200" style={{ overflow: 'visible' }}>
        {/* grid lines */}
        {[0, 25, 50, 75, 100].map(percent => (
          <g key={percent}>
            <line 
              x1="20" 
              y1={20 + (percent / 100) * 120} 
              x2="300" 
              y2={20 + (percent / 100) * 120}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
            <text 
              x="15" 
              y={25 + (percent / 100) * 120}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {(maxValue - (percent / 100) * range).toFixed(0)}
            </text>
          </g>
        ))}
        
        {/* line */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* points */}
        {points.map((point, index) => (
          <circle 
            key={index}
            cx={point.x} 
            cy={point.y} 
            r="4" 
            fill={color}
          />
        ))}
        
        {/* x-axis labels */}
        {data.map((d, index) => (
          <text
            key={index}
            x={points[index].x}
            y="185"
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
          </text>
        ))}
      </svg>
    </Box>
  );
};

const UserEmotionStatistics: React.FC<UserEmotionStatisticsProps> = ({ userId }) => {
  const [stats, setStats] = useState<UserEmotionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // helper function to get auth token
  const getAuthToken = () => localStorage.getItem('authToken');

  // fetch user emotion statistics
  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('токен аутентификации отсутствует');
      }

      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/users/${userId}/emotion-statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // no data yet, create mock data for development
          setStats(createMockUserStats());
          return;
        }
        throw new Error(`ошибка получения статистики: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);

    } catch (err: any) {
      console.error('error fetching user emotion statistics:', err);
      setError(err.message || 'произошла ошибка при загрузке статистики');
    } finally {
      setLoading(false);
    }
  };

  // create mock data for development
  const createMockUserStats = (): UserEmotionStatsData => {
    return {
      userId,
      totalSessions: 12,
      totalDuration: 2845, // seconds
      averageConfidence: 89.3,
      averageSpeakingRate: 132.8,
      topEmotions: [
        { emotion: 'эмоциональная речь', frequency: 45, percentage: 62.5 },
        { emotion: 'уверенная речь', frequency: 18, percentage: 25.0 },
        { emotion: 'спокойная речь', frequency: 7, percentage: 9.7 },
        { emotion: 'робкая речь', frequency: 2, percentage: 2.8 }
      ],
      overallEmotionDistribution: {
        'эмоциональная речь': 62.5,
        'уверенная речь': 25.0,
        'спокойная речь': 9.7,
        'робкая речь': 2.8
      },
      emotionTrends: [
        { sessionId: '1', date: '2024-01-15', averageConfidence: 85.2, speakingRate: 128.5, dominantEmotion: 'эмоциональная речь', sessionDuration: 240 },
        { sessionId: '2', date: '2024-01-18', averageConfidence: 87.1, speakingRate: 130.2, dominantEmotion: 'уверенная речь', sessionDuration: 220 },
        { sessionId: '3', date: '2024-01-22', averageConfidence: 89.5, speakingRate: 133.8, dominantEmotion: 'эмоциональная речь', sessionDuration: 260 },
        { sessionId: '4', date: '2024-01-25', averageConfidence: 91.2, speakingRate: 135.1, dominantEmotion: 'эмоциональная речь', sessionDuration: 275 },
        { sessionId: '5', date: '2024-01-29', averageConfidence: 90.8, speakingRate: 134.5, dominantEmotion: 'уверенная речь', sessionDuration: 250 }
      ],
      improvementAreas: ['работа с паузами', 'снижение нервозности'],
      strengths: ['эмоциональность', 'уверенность в изложении']
    };
  };

  useEffect(() => {
    if (userId) {
      fetchUserStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          статистика эмоционального анализа
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={250} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="text" height={60} />
              <Skeleton variant="text" height={60} />
              <Skeleton variant="text" height={60} />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        статистика для этого пользователя отсутствует
      </Alert>
    );
  }

  // prepare data for charts
  const confidenceData = stats.emotionTrends.map(trend => ({
    date: trend.date,
    value: trend.averageConfidence
  }));

  const speakingRateData = stats.emotionTrends.map(trend => ({
    date: trend.date,
    value: trend.speakingRate
  }));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        статистика эмоционального анализа
      </Typography>

      <Grid container spacing={3}>
        {/* key metrics */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* average confidence */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  средняя уверенность анализа
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats.averageConfidence.toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.averageConfidence} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>

            {/* average speaking rate */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  средний темп речи
                </Typography>
                <Typography variant="h4" color="secondary" gutterBottom>
                  {Math.round(stats.averageSpeakingRate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  слов в минуту
                </Typography>
              </CardContent>
            </Card>

            {/* total sessions */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  всего сессий
                </Typography>
                <Typography variant="h4" gutterBottom>
                  {stats.totalSessions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  общая длительность: {formatDuration(0, stats.totalDuration)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* trend charts */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* confidence trend */}
            {stats.emotionTrends.length > 0 && (
              <Card>
                <CardContent>
                  <SimpleLineChart 
                    data={confidenceData}
                    title="динамика уверенности анализа"
                    color="#1976d2"
                  />
                </CardContent>
              </Card>
            )}

            {/* speaking rate trend */}
            {stats.emotionTrends.length > 0 && (
              <Card>
                <CardContent>
                  <SimpleLineChart 
                    data={speakingRateData}
                    title="динамика темпа речи"
                    color="#d32f2f"
                  />
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>

        {/* emotion distribution breakdown */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                распределение эмоций по всем сессиям
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(stats.overallEmotionDistribution).map(([emotion, percentage]) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={emotion}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Chip
                        label={emotion}
                        variant="outlined"
                        size="small"
                        sx={{ mb: 1, textTransform: 'capitalize' }}
                      />
                      <Typography variant="h6" color="primary">
                        {percentage.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ mt: 1, height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* top emotions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                топ эмоций
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {stats.topEmotions.slice(0, 5).map((emotion, index) => (
                  <Box key={emotion.emotion}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {emotion.emotion}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {emotion.frequency} раз ({emotion.percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={emotion.percentage}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* strengths and improvements */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                анализ и рекомендации
              </Typography>
              
              <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ mt: 2 }}>
                сильные стороны
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {stats.strengths.map((strength, index) => (
                  <Chip
                    key={index}
                    label={strength}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                области для улучшения
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {stats.improvementAreas.map((area, index) => (
                  <Chip
                    key={index}
                    label={area}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default UserEmotionStatistics;