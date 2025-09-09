import React, { useEffect } from 'react';
import { TrainingSession } from '../data/mockData';

interface TranscriptItem {
  time: string;
  speaker: string;
  text: string;
  isAI: boolean;
}

interface SlideAnalysisItem {
  slideNumber: number;
  title: string;
  status: 'ai-understands' | 'weak-points' | 'potential-questions';
  statusText: string;
}

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ isOpen, onClose, session }) => {
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

  // функция для извлечения реального транскрипта из ML данных
  const generateTranscript = (session: TrainingSession): TranscriptItem[] => {
    // показываем только реальные ML данные
    if (session.speechAnalysis && (session.speechAnalysis as any).speech_segments) {
      return (session.speechAnalysis as any).speech_segments.map((segment: any, index: number) => ({
        time: `${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, '0')}`,
        speaker: 'Вы',
        text: segment.text || 'Неразборчиво',
        isAI: false
      }));
    }
    
    return []; // если нет ML данных - возвращаем пустой массив
  };

  // функция копирования транскрипта
  const copyTranscript = () => {
    if (!session) return;
    
    const transcript = generateTranscript(session);
    const text = transcript.map(item => 
      `${item.time} ${item.speaker}: ${item.text}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Транскрипт скопирован в буфер обмена!');
    });
  };

  // закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const transcript = generateTranscript(session);
  const slideAnalysis = generateSlideAnalysis(session);

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
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* заголовок модального окна */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#212529',
              margin: 0,
              marginBottom: '4px'
            }}>
              {session.title}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6c757d',
              margin: 0
            }}>
              Детальный анализ сессии
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={copyTranscript}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#495057',
                cursor: 'pointer'
              }}
            >
              Copy transcript
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#6c757d',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* основное содержимое с двумя блоками */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(90vh - 100px)',
          maxHeight: '600px'
        }}>
          {/* верхний блок - транскрипт */}
          <div style={{
            flex: 1,
            padding: '20px 24px',
            borderBottom: '1px solid #e9ecef',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#212529',
              margin: '0 0 16px 0'
            }}>
              Транскрипт + таймкоды
            </h3>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {transcript.map((item, index) => (
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
              ))}
            </div>
          </div>

          {/* нижний блок - анализ презентации */}
          {slideAnalysis.length > 0 && (
            <div style={{
              flex: 1,
              padding: '20px 24px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
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
                  {session.presentationAnalysis?.fileName || 'presentation.pptx'}
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
      </div>
    </div>
  );
};