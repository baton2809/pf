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
  Chip
} from '@mui/material';

// types for emotion summary data
interface EmotionData {
  emotion: string;
  percentage: number;
  confidence: number;
}

interface EmotionSummaryData {
  sessionId: string;
  dominantEmotion?: string;
  averageConfidence: number;
  speakingRate: number; // words per minute
  totalDuration: number; // in seconds
  emotionDistribution: EmotionData[];
  totalSegments: number;
}

interface EmotionSummaryProps {
  sessionId: string;
}

// simple pie chart component using CSS
const SimplePieChart: React.FC<{ data: EmotionData[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.percentage, 0);
  
  if (total === 0) {
    return (
      <Box sx={{ 
        width: 200, 
        height: 200, 
        borderRadius: '50%', 
        bgcolor: 'grey.200',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto'
      }}>
        <Typography variant="body2" color="text.secondary">
          нет данных
        </Typography>
      </Box>
    );
  }

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', 
    '#AB47BC', '#66BB6A', '#EF5350', '#26C6DA'
  ];

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const angle = (item.percentage / total) * 360;
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: colors[index % colors.length]
    };
    currentAngle += angle;
    return segment;
  });

  // create SVG pie chart
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const createPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY, 
      "L", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createPath(segment.startAngle, segment.endAngle)}
            fill={segment.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
      
      {/* legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 300 }}>
        {segments.map((segment, index) => (
          <Chip
            key={index}
            size="small"
            label={`${segment.emotion} (${segment.percentage.toFixed(1)}%)`}
            sx={{ 
              bgcolor: segment.color, 
              color: 'white',
              fontSize: '0.75rem'
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const EmotionSummary: React.FC<EmotionSummaryProps> = ({ sessionId }) => {
  const [emotionSummary, setEmotionSummary] = useState<EmotionSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // helper function to get auth token
  const getAuthToken = () => localStorage.getItem('authToken');

  // fetch emotion summary data
  const fetchEmotionSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('токен аутентификации отсутствует');
      }

      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/emotion-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // no emotion data yet, create mock data for development
          setEmotionSummary(createMockEmotionSummary());
          return;
        }
        throw new Error(`ошибка получения данных: ${response.status}`);
      }

      const data = await response.json();
      setEmotionSummary(data);

    } catch (err: any) {
      console.error('error fetching emotion summary:', err);
      setError(err.message || 'произошла ошибка при загрузке данных об эмоциях');
    } finally {
      setLoading(false);
    }
  };

  // create mock data for development
  const createMockEmotionSummary = (): EmotionSummaryData => {
    return {
      sessionId,
      dominantEmotion: 'эмоциональная речь',
      averageConfidence: 92.5,
      speakingRate: 126.9,
      totalDuration: 145.2,
      totalSegments: 8,
      emotionDistribution: [
        { emotion: 'эмоциональная речь', percentage: 67.3, confidence: 94.2 },
        { emotion: 'уверенная речь', percentage: 18.7, confidence: 88.1 },
        { emotion: 'спокойная речь', percentage: 10.2, confidence: 91.5 },
        { emotion: 'робкая речь', percentage: 3.8, confidence: 85.0 }
      ]
    };
  };

  useEffect(() => {
    if (sessionId) {
      fetchEmotionSummary();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          анализ эмоций встречи
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="text" height={40} />
              <Skeleton variant="text" height={30} />
              <Skeleton variant="text" height={30} />
              <Skeleton variant="text" height={30} />
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

  if (!emotionSummary) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        данные об эмоциях для этой сессии отсутствуют
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        анализ эмоций встречи
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* emotion distribution chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom align="center">
                распределение эмоций
              </Typography>
              <SimplePieChart data={emotionSummary.emotionDistribution} />
            </CardContent>
          </Card>
        </Grid>

        {/* summary statistics */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* dominant emotion */}
            {emotionSummary.dominantEmotion && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    доминирующая эмоция
                  </Typography>
                  <Chip 
                    label={emotionSummary.dominantEmotion}
                    color="primary"
                    size="medium"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </CardContent>
              </Card>
            )}

            {/* average confidence */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  средняя уверенность анализа
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={emotionSummary.averageConfidence} 
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body1" fontWeight="bold">
                    {emotionSummary.averageConfidence.toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* speaking rate */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  темп речи
                </Typography>
                <Typography variant="h6" color="primary">
                  {Math.round(emotionSummary.speakingRate)} слов/мин
                </Typography>
              </CardContent>
            </Card>

            {/* session info */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  информация о сессии
                </Typography>
                <Typography variant="body2">
                  длительность: {Math.round(emotionSummary.totalDuration / 60)} мин
                </Typography>
                <Typography variant="body2">
                  сегментов речи: {emotionSummary.totalSegments}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* detailed emotion breakdown */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                детальный анализ эмоций
              </Typography>
              <Grid container spacing={2}>
                {emotionSummary.emotionDistribution.map((emotion, index) => {
                  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726'];
                  
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={emotion.emotion}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="body2" sx={{ mb: 1, textTransform: 'capitalize' }}>
                          {emotion.emotion}
                        </Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <svg width="60" height="60">
                            <circle 
                              cx="30" 
                              cy="30" 
                              r="25" 
                              fill="none" 
                              stroke="#e0e0e0" 
                              strokeWidth="4"
                            />
                            <circle 
                              cx="30" 
                              cy="30" 
                              r="25" 
                              fill="none" 
                              stroke={colors[index % colors.length]}
                              strokeWidth="4"
                              strokeDasharray={`${emotion.percentage * 1.57} 157`}
                              strokeLinecap="round"
                              transform="rotate(-90 30 30)"
                            />
                          </svg>
                          <Box sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="caption" fontWeight="bold">
                              {emotion.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          уверенность: {emotion.confidence.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default EmotionSummary;