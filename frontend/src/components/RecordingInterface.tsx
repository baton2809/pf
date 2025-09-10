import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trainingApiService } from '../services/trainingApi';
import { getTrainingTypeLabel } from '../utils/trainingTypes';

interface RecordingInterfaceProps {}

export const RecordingInterface: React.FC<RecordingInterfaceProps> = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<'loading' | 'waiting' | 'countdown' | 'recording' | 'finalizing'>('loading');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [training, setTraining] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startingRecordingRef = useRef<boolean>(false);

  // initialize session on component mount - moved before useEffect
  const initializeSession = useCallback(async () => {
    try {
      const data = await trainingApiService.initSession(trainingId!);
      setSessionId(data.sessionId);
      setTraining(data.training);
      setStage('waiting');
    } catch (error: any) {
      console.error('Failed to initialize session:', error);
      alert('Ошибка при инициализации сессии');
      navigate('/new-training');
    }
  }, [trainingId, navigate]);

  // initialize session on component mount
  useEffect(() => {
    if (trainingId) {
      initializeSession();
    }
  }, [trainingId, initializeSession]);

  const startCountdown = async () => {
    try {
      // cleanup any existing streams first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
        streamRef.current = null;
      }
      
      // request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // create MediaRecorder
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
      
      try {
        mediaRecorderRef.current = selectedType 
          ? new MediaRecorder(stream, { 
              mimeType: selectedType,
              audioBitsPerSecond: 128000
            })
          : new MediaRecorder(stream);
      } catch (error: any) {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      setStage('countdown');
      setCountdown(3);
      
      // clear any existing countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setTimeout(() => {
              startRecording();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Failed to access microphone:', error);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.');
    }
  };

  const startRecording = async () => {
    if (!sessionId || !mediaRecorderRef.current || stage === 'recording' || startingRecordingRef.current) return;
    
    try {
      // prevent duplicate start requests
      startingRecordingRef.current = true;
      
      // notify backend about recording start
      await trainingApiService.startRecording(sessionId, new Date().toISOString());
      
      const audioChunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        // create audio blob and upload
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
      };
      
      setStage('recording');
      setRecordingTime(0);
      
      if (mediaRecorderRef.current.state === 'inactive') {
        mediaRecorderRef.current.start();
      }
      
      // clear any existing recording interval to prevent duplicates
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev: number) => {
          const newTime = prev + 1;
          if (newTime >= 600) { // auto-stop after 10 minutes
            stopRecording();
            return newTime;
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      alert('Не удалось начать запись');
      setStage('waiting');
    } finally {
      // reset flag regardless of success or failure
      startingRecordingRef.current = false;
    }
  };

  const stopRecording = useCallback(async () => {
    setStage('finalizing');
    
    // clear countdown interval if still running
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // cleanup audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // clear recording timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const uploadAudio = async (audioBlob: Blob) => {
    if (!sessionId) return;
    
    try {
      console.log('Starting audio upload for session:', sessionId);
      
      // wait for upload to complete first
      const uploadResponse = await trainingApiService.uploadAudio(sessionId, audioBlob, recordingTime, 'audio/webm');
      
      console.log('Audio uploaded successfully:', uploadResponse);
      
      // small delay to ensure backend status is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // now navigate to session page
      navigate(`/session/${sessionId}`);
    } catch (error: any) {
      console.error('Failed to upload audio:', error);
      // still navigate to session page to show error
      navigate(`/session/${sessionId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  if (stage === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dadce0',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{training?.title || 'Тренировка'}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#5f6368' }}>
              Тип: {getTrainingTypeLabel(training?.type)}
            </p>
          </div>
          
          {stage === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ea4335',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Идет запись</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>
                {formatTime(recordingTime)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* main content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '24px'
      }}>
        {stage === 'waiting' && (
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#1a73e8',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 16px auto'
              }}>
                
              </div>
              <h3 style={{ margin: '0 0 8px 0' }}>Готовы начать?</h3>
              <p style={{ margin: 0, color: '#5f6368' }}>
                Нажмите кнопку ниже, чтобы начать запись презентации
              </p>
            </div>
            
            <button
              onClick={startCountdown}
              style={{
                padding: '16px 32px',
                backgroundColor: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'white'
              }}></div>
              Начать запись
            </button>
          </div>
        )}

        {stage === 'countdown' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '120px',
              fontWeight: 600,
              color: '#ea4335',
              lineHeight: 1,
              marginBottom: '16px'
            }}>
              {countdown > 0 ? countdown : ''}
            </div>
            <div style={{ fontSize: '18px', color: '#5f6368' }}>
              {countdown > 0 ? 'Приготовьтесь...' : 'Говорите!'}
            </div>
          </div>
        )}

        {stage === 'recording' && (
          <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#ea4335',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                margin: '0 auto 24px auto',
                animation: 'pulse 2s infinite'
              }}>
                
              </div>
              
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Проводите презентацию</h3>
                <p style={{ margin: 0, color: '#5f6368' }}>
                  Говорите естественно, как перед реальной аудиторией. 
                  Запись автоматически остановится через 10 минут.
                </p>
              </div>
            </div>
            
            <button
              onClick={stopRecording}
              style={{
                padding: '16px 32px',
                backgroundColor: '#34a853',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Остановить запись
            </button>
          </div>
        )}

        {stage === 'finalizing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #1a73e8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px auto'
              }}></div>
              <h3 style={{ margin: '0 0 8px 0' }}>Обработка записи</h3>
              <p style={{ margin: 0, color: '#5f6368' }}>
                Загружаем аудио и запускаем анализ...
              </p>
            </div>
          </div>
        )}
      </div>


      {/* add CSS animations */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};