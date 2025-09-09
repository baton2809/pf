import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RecordingInterfaceProps, AudioRecordingData } from '../types/recording';
import { RecordingProvider, useRecording } from '../contexts/RecordingContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useStatusAnimation } from '../hooks/useStatusAnimation';
import { AnalysisModal } from './AnalysisModal';

// main recording interface component (now much smaller)
const RecordingInterfaceContent: React.FC<RecordingInterfaceProps> = ({
  onGoToQuestions,
  onEndSession,
  onRecordingStart,
  onRecordingComplete,
  sessionType = 'presentation'
}) => {
  const navigate = useNavigate();
  const { state } = useRecording();
  
  // use status animation hook
  useStatusAnimation();
  
  // handle recording complete callback
  const handleRecordingComplete = (data: AudioRecordingData) => {
    if (onRecordingComplete) {
      onRecordingComplete(data);
    }
  };
  
  // use audio recorder hook
  const { startCountdown, stopRecording } = useAudioRecorder({
    onRecordingStart,
    onRecordingComplete: handleRecordingComplete,
    sessionType
  });

  // utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoToQuestions = async () => {
    await stopRecording();
    if (onGoToQuestions) {
      onGoToQuestions();
    }
  };

  const handleEndSession = async () => {
    console.log('Ending session, current status:', state.status);
    
    // if recording is active, stop it first
    if (state.status === 'recording') {
      await stopRecording();
      // don't navigate immediately - let user see the processing status
      // navigation will happen after analysis completes
    } else if (state.status === 'completed' || state.status === 'idle') {
      // only navigate if analysis is complete or nothing is happening
      if (onEndSession) {
        onEndSession();
      }
    }
  };

  return (
    <div className="recording-interface-overlay">
      <div className="recording-interface-container">
        <div className="developer-avatar">
        </div>
        
        <h1 className="recording-interface-title">Тренировка {sessionType === 'presentation' ? 'презентации' : sessionType === 'interview' ? 'собеседования' : sessionType === 'pitch' ? 'питча' : 'выступления'}</h1>
        
        {state.status !== 'countdown' && (
          <div 
            className="recording-interface-status" 
            style={{ 
              opacity: state.statusOpacity,
              fontSize: state.status === 'processing' || state.status === 'analyzing' ? '20px' : '16px',
              fontWeight: state.status === 'processing' || state.status === 'analyzing' ? 'bold' : 'normal',
              color: state.status === 'processing' || state.status === 'analyzing' ? '#ff9800' : 'inherit'
            }}
          >
            {!state.hasStarted ? 'Готов к записи' : 
             state.status === 'recording' ? `Идёт запись (${formatTime(state.actualRecordingTime)})` : 
             state.status === 'processing' ? 'Сохранение записи...' : 
             state.status === 'analyzing' ? 'Анализ речи с помощью ИИ...' : 
             state.status === 'completed' ? 'Анализ завершён!' :
             'Подготовка...'}
          </div>
        )}
        
        <div style={{ marginBottom: '32px' }}>
          {!state.hasStarted ? (
            <button
              onClick={startCountdown}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                margin: '0 auto',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#45a049';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#4CAF50';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Начать запись
            </button>
          ) : state.status === 'countdown' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              <div style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: state.countdown > 0 ? '#ff4444' : '#4CAF50',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                animation: 'pulse 1s ease-in-out'
              }}>
                {state.countdown > 0 ? state.countdown : 'Начинайте!'}
              </div>
              <style dangerouslySetInnerHTML={{
                __html: `
                  @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                  }
                `
              }} />
            </div>
          ) : (
            <p className="recording-interface-message-text">
              Говорите свою речь. Когда будете готовы — перейдём к вопросам.
            </p>
          )}
        </div>
        
        {state.hasStarted && state.status !== 'completed' && (
          <div className="recording-interface-buttons">
            <button 
              className="recording-interface-btn recording-interface-btn-primary" 
              onClick={handleGoToQuestions}
            >
              Перейдём к вопросам
            </button>
            <button 
              className="recording-interface-btn recording-interface-btn-secondary" 
              onClick={handleEndSession}
            >
              {state.status === 'recording' ? 'Завершить запись' : 'Завершить сессию'}
            </button>
          </div>
        )}

        {state.status === 'completed' && (
          <div className="recording-interface-buttons">
            <button 
              className="recording-interface-btn recording-interface-btn-primary" 
              onClick={() => navigate('/history')}
            >
              Перейти к результатам
            </button>
            <button 
              className="recording-interface-btn recording-interface-btn-secondary" 
              onClick={onEndSession}
            >
              Главная страница
            </button>
          </div>
        )}
        
        <div className="recording-interface-advice">
          <span className="recording-interface-advice-label">Совет:</span> говорите уверенно, используйте паузы для акцентов, поддерживайте зрительный контакт
        </div>
      </div>
      
      {/* Analysis Modal */}
      <AnalysisModal 
        isVisible={state.showAnalysisModal}
        progress={state.analysisProgress}
        onClose={() => {}} // modal closes automatically when analysis completes
      />
    </div>
  );
};

// wrapper component that provides context
export const RecordingInterface: React.FC<RecordingInterfaceProps> = (props) => {
  return (
    <RecordingProvider>
      <RecordingInterfaceContent {...props} />
    </RecordingProvider>
  );
};