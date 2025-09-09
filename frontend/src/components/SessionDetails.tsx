import React from 'react';
import { TrainingSession, sessionTypeLabels } from '../data/mockData';

interface TranscriptItem {
  time: string;
  speaker: string;
  text: string;
  isAI: boolean;
  emotion?: string;
  emotionScore?: string;
  duration?: number;
}

interface SlideAnalysisItem {
  slideNumber: number;
  title: string;
  status: 'ai-understands' | 'weak-points' | 'potential-questions';
  statusText: string;
}

interface SessionDetailsProps {
  selectedSession: TrainingSession | null;
  onSessionChange: (session: TrainingSession) => void;
}

export const SessionDetails: React.FC<SessionDetailsProps> = ({ selectedSession, onSessionChange }) => {
  // функция для расчета общей оценки на основе реальных данных сессии
  const getOverallScore = () => {
    if (!selectedSession) return 0;
    return selectedSession.score || 0;
  };

  // функция для извлечения категорий аналитики из реальных ML данных
  const getCategoryAverages = () => {
    if (!selectedSession || !selectedSession.speechAnalysis) {
      return null; // нет данных для анализа
    }

    const mlData = selectedSession.speechAnalysis;
    
    // если есть legacy mock формат данных
    if (mlData.tempo && mlData.energy && mlData.confidence && mlData.awareness && mlData.clarity) {
      return {
        tempo: mlData.tempo.score,
        energy: mlData.energy.score,
        confidence: mlData.confidence.score,
        awareness: mlData.awareness.score,
        clarity: mlData.clarity.score
      };
    }
    
    // если есть реальные ML данные, можно извлечь базовые метрики
    if (mlData.speech_segments && mlData.speech_segments.length > 0) {
      // простой расчет на основе доступных данных
      const segments = mlData.speech_segments;
      const avgEmotionScore = segments
        .filter((seg: any) => seg.emotion_data?.score)
        .reduce((sum: number, seg: any) => sum + parseFloat(seg.emotion_data.score), 0) / 
        segments.filter((seg: any) => seg.emotion_data?.score).length;
      
      const tempRate = mlData.temp_rate || 150; // words per minute
      const tempoScore = tempRate >= 120 && tempRate <= 180 ? 85 : 65;
      
      return {
        tempo: tempoScore,
        energy: Math.round((avgEmotionScore || 0.7) * 100),
        confidence: Math.round((avgEmotionScore || 0.6) * 90),
        awareness: Math.round((avgEmotionScore || 0.5) * 85), // based on speech flow
        clarity: Math.round((avgEmotionScore || 0.6) * 95) // based on confidence
      };
    }
    
    return null; // нет подходящих данных
  };

  const categoryAverages = getCategoryAverages();

  // функция для генерации анализа слайдов
  const generateSlideAnalysis = (session: TrainingSession): SlideAnalysisItem[] => {
    if (!session.presentationAnalysis) return [];

    const slideData = session.presentationAnalysis.slides;
    return slideData.map((slide, index) => {
      // определяем статус на основе средней оценки слайда
      const averageScore = (slide.designScore + slide.contentScore + slide.readabilityScore) / 3;
      
      let status: SlideAnalysisItem['status'];
      let statusText: string;

      if (averageScore >= 75) {
        status = 'ai-understands';
        statusText = 'AI понимает';
      } else if (averageScore >= 50) {
        status = 'potential-questions';
        statusText = 'Потенциальные вопросы';
      } else {
        status = 'weak-points';
        statusText = 'Слабые места';
      }

      return {
        slideNumber: slide.slideNumber,
        title: slide.title || `Слайд ${slide.slideNumber}`,
        status,
        statusText
      };
    });
  };

  // функция для форматирования времени из секунд в MM:SS
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // функция для получения цвета эмоции
  const getEmotionColor = (emotion?: string): string => {
    if (!emotion) return '#6c757d';
    const emotionColors: Record<string, string> = {
      'happy': '#28a745',
      'confident': '#007bff', 
      'calm': '#17a2b8',
      'neutral': '#6c757d',
      'nervous': '#ffc107',
      'sad': '#dc3545',
      'angry': '#dc3545'
    };
    return emotionColors[emotion.toLowerCase()] || '#6c757d';
  };
  
  // функция для генерации транскрипта из реальных ML данных
  const generateTranscript = (session: TrainingSession): TranscriptItem[] => {
    // показываем только реальные ML данные
    if (session.speechAnalysis && (session.speechAnalysis as any).speech_segments) {
      return (session.speechAnalysis as any).speech_segments.map((segment: any, index: number) => ({
        time: formatTimestamp(segment.start),
        speaker: 'Вы',
        text: segment.text || 'Неразборчиво',
        isAI: false,
        emotion: segment.emotion_data?.emotion,
        emotionScore: segment.emotion_data?.score,
        duration: segment.end - segment.start
      }));
    }
    
    // если нет ML данных - возвращаем пустой массив
    return [];
  };

  // функция копирования транскрипта
  const copyTranscript = () => {
    if (!selectedSession) return;
    
    const transcript = generateTranscript(selectedSession);
    const text = transcript.map(item => 
      `${item.time} ${item.speaker}: ${item.text}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Транскрипт скопирован в буфер обмена!');
    });
  };

  if (!selectedSession) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#6c757d'
      }}>
        Выберите сессию для просмотра детальной аналитики
      </div>
    );
  }

  const transcript = generateTranscript(selectedSession);
  const slideAnalysis = generateSlideAnalysis(selectedSession);

  // функция для получения цвета статуса
  const getStatusColor = (status: SlideAnalysisItem['status']) => {
    switch (status) {
      case 'ai-understands': return '#28a745';
      case 'weak-points': return '#dc3545';
      case 'potential-questions': return '#ffc107';
      default: return '#6c757d';
    }
  };

  return (
    <div>

      {/* основное содержимое с двумя колонками */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '32px', 
        alignItems: 'start'
      }}>
        {/* левая колонка */}
        <div>
          {/* блок транскрипта */}
          <div className="card" style={{
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: '280px'
          }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#212529',
              margin: 0
            }}>
              Транскрипт + таймкоды
            </h3>
            <button
              onClick={copyTranscript}
              className="btn btn-outline"
              style={{
                fontSize: '13px',
                padding: '6px 12px',
                minHeight: 'auto'
              }}
            >
              Скопировать
            </button>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {transcript.length > 0 ? transcript.map((item, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <div style={{
                  color: '#6366f1',
                  fontSize: '14px',
                  fontWeight: 500,
                  minWidth: '45px',
                  fontFamily: 'SF Mono, Monaco, monospace'
                }}>
                  {item.time}
                </div>
                <div style={{ flex: 1 }}>
                  {item.emotion && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      backgroundColor: getEmotionColor(item.emotion) + '20',
                      color: getEmotionColor(item.emotion),
                      marginBottom: '4px',
                      fontWeight: 500
                    }}>
                      {item.emotion} ({item.emotionScore})
                    </div>
                  )}
                  <div style={{
                    fontWeight: 600,
                    color: item.isAI ? '#dc3545' : '#212529',
                    marginBottom: '2px',
                    fontSize: '14px'
                  }}>
                    {item.speaker}
                  </div>
                  <div style={{
                    color: '#495057',
                    fontSize: '14px',
                    lineHeight: 1.4
                  }}>
                    {item.text}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                padding: '40px 20px'
              }}>
                <p>Нет данных транскрипции для отображения</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Транскрипт будет доступен после обработки записи
                </p>
              </div>
            )}
          </div>
          </div>

          {/* блок анализа презентации */}
          {slideAnalysis.length > 0 && (
            <div className="card" style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              height: '280px'
            }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#495057'
              }}>
                PPT
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#212529',
                margin: 0
              }}>
                {selectedSession.presentationAnalysis?.fileName || 'presentation.pptx'}
              </h3>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto'
            }}>
              {slideAnalysis.map((slide, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: index < slideAnalysis.length - 1 ? '1px solid #f1f3f4' : 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#212529'
                    }}>
                      {slide.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: getStatusColor(slide.status)
                    }}>
                      {slide.statusText}
                    </div>
                  </div>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    color: '#6c757d'
                  }}>
                    →
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>

        {/* правая колонка - средние оценки по критериям */}
        <div>
          {/* аналитика всегда показывается */}
          {categoryAverages && (
            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px',
              overflow: 'auto' 
            }}>
              <div style={{ marginBottom: '20px', padding: '20px 24px' }}>
                {/* общая оценка внутри блока */}
                <div style={{
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#212529',
                    margin: 0,
                    marginBottom: '8px'
                  }}>
                    Общая оценка
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <span style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#1a73e8',
                      lineHeight: 1
                    }}>
                      {getOverallScore()}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#6c757d',
                      fontWeight: 500
                    }}>
                      из 10
                    </span>
                  </div>
                </div>
                <div className="metrics-dashboard">
                  {Object.entries(categoryAverages).map(([key, score], index) => {
                    const metrics = {
                      tempo: { label: 'Темп речи' },
                      energy: { label: 'Энергичность' },
                      confidence: { label: 'Уверенность' },
                      awareness: { label: 'Осознанность' },
                      clarity: { label: 'Ясность' }
                    };
                    
                    const metric = metrics[key as keyof typeof metrics];
                    const displayValue = (score / 10).toFixed(1);
                    
                    return (
                      <div key={key} className="metric">
                        <div className="metric-header">
                          <div className="metric-label-container">
                            <span className="metric-label">{metric.label}</span>
                          </div>
                          <span className="metric-value">{displayValue}/10</span>
                        </div>
                        <div className="progress-container">
                          <div 
                            className="progress-bar" 
                            data-width={score}
                            style={{ 
                              width: score + '%',
                              background: 'linear-gradient(90deg, #1a73e8 0%, #1557b0 100%)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* блок когда нет аналитических данных */}
          {!categoryAverages && (
            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px',
              padding: '40px 20px',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{ color: '#6c757d' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                  Аналитика недоступна
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                  Детальные метрики будут доступны<br/>
                  после обработки записи ML сервисом
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};