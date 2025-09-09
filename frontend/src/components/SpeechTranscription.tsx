import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Paper, Skeleton, Alert } from '@mui/material';
import { formatTime } from '../utils/formatting';

// types for speech transcription data
interface SpeechSegment {
  id: string;
  sessionId: string;
  start: number;
  end: number;
  text: string;
  emotion: string;
  score: number;
  createdAt: string;
}

interface SpeechTranscriptionProps {
  sessionId: string;
}

// emotion color mapping
const getEmotionColor = (emotion: string): { backgroundColor: string; color: string } => {
  const emotionColors: Record<string, { backgroundColor: string; color: string }> = {
    confident: { backgroundColor: '#e8f5e8', color: '#2d7d47' },
    nervous: { backgroundColor: '#ffebee', color: '#c62828' },
    excited: { backgroundColor: '#fff3e0', color: '#f57c00' },
    calm: { backgroundColor: '#e3f2fd', color: '#1565c0' },
    uncertain: { backgroundColor: '#fce4ec', color: '#ad1457' },
    enthusiastic: { backgroundColor: '#f3e5f5', color: '#7b1fa2' },
    relaxed: { backgroundColor: '#e0f2f1', color: '#00695c' },
    focused: { backgroundColor: '#f1f8e9', color: '#388e3c' },
    default: { backgroundColor: '#f5f5f5', color: '#666666' }
  };
  
  return emotionColors[emotion.toLowerCase()] || emotionColors.default;
};

// Mock speech segments removed - use only real API data

export const SpeechTranscription: React.FC<SpeechTranscriptionProps> = ({ sessionId }) => {
  const [segments, setSegments] = useState<SpeechSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSpeechSegments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/sessions/${sessionId}/speech-segments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            // session not found or no speech segments yet, show empty array
            console.log('Session not found or no speech segments, showing empty state');
            setSegments([]);
            return;
          }
          throw new Error(`Failed to fetch speech segments: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setSegments(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching speech segments:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSpeechSegments();
  }, [sessionId]);

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Расшифровка речи с анализом эмоций
        </Typography>
        <Box sx={{ mt: 2 }}>
          {[...Array(5)].map((_, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Skeleton variant="text" width={100} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
              <Skeleton variant="text" width="100%" height={60} />
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Расшифровка речи с анализом эмоций
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  if (segments.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Расшифровка речи с анализом эмоций
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Пока нет данных расшифровки речи для этой сессии
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Расшифровка речи с анализом эмоций
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Всего сегментов: {segments.length}
      </Typography>

      <List sx={{ maxHeight: 500, overflow: 'auto' }}>
        {segments.map((segment, index) => {
          const emotionStyle = getEmotionColor(segment.emotion);
          const duration = segment.end - segment.start;
          
          return (
            <ListItem 
              key={segment.id}
              sx={{ 
                mb: 1,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                flexDirection: 'column',
                alignItems: 'stretch',
                p: 2
              }}
            >
              {/* segment header with time and emotion */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 1,
                width: '100%'
              }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(segment.start)} - {formatTime(segment.end)} 
                  ({duration.toFixed(1)}с)
                </Typography>
                
                <Chip
                  label={`${segment.emotion} (${Math.round(segment.score * 100)}%)`}
                  size="small"
                  sx={{
                    backgroundColor: emotionStyle.backgroundColor,
                    color: emotionStyle.color,
                    fontWeight: 500
                  }}
                />
              </Box>

              {/* transcribed text */}
              <ListItemText
                primary={segment.text}
                primaryTypographyProps={{
                  sx: { 
                    fontSize: '16px',
                    lineHeight: 1.5,
                    color: '#333'
                  }
                }}
              />

              {/* segment number */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Сегмент #{index + 1}
                </Typography>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};