import React, { useState, useRef, useCallback } from 'react';

interface AudioRecordingProps {
  disabled?: boolean;
  onRecordingComplete?: (sessionId: string, audioBlob: Blob) => void;
  isRecording?: boolean;
}

export const VideoCallIntegration: React.FC<AudioRecordingProps> = ({
  disabled = false,
  onRecordingComplete,
  isRecording: externalIsRecording = false
}) => {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing' | 'completed' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // start recording with MediaRecorder API
  const startRecording = useCallback(async () => {
    try {
      setRecordingStatus('recording');
      setIsRecording(true);
      setRecordingTime(0);
      chunksRef.current = [];

      // request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        
        // cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // start recording
      mediaRecorder.start(100); // collect data every 100ms

      // start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('failed to start recording:', error);
      setRecordingStatus('error');
      setIsRecording(false);
      alert('не удалось получить доступ к микрофону. проверьте разрешения.');
    }
  }, []);

  // stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsRecording(false);
      setRecordingStatus('processing');
      setIsProcessing(true);
      
      // stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
    }
  }, []);

  // upload recorded audio to backend
  const uploadAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      formData.append('audio', audioFile);

      const response = await fetch(`${baseUrl}/api/audio/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setRecordingStatus('completed');
        
        if (onRecordingComplete) {
          onRecordingComplete(data.sessionId, audioBlob);
        }
        
        console.log('audio upload successful:', data.message);
      } else {
        throw new Error('upload failed');
      }
    } catch (error) {
      console.error('failed to upload audio:', error);
      setRecordingStatus('error');
      alert('ошибка загрузки аудио. попробуйте еще раз.');
    } finally {
      setIsProcessing(false);
    }
  }, [baseUrl, onRecordingComplete]);

  // format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // handle start/stop recording button click
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // reset recording state
  const resetRecording = () => {
    setRecordingStatus('idle');
    setRecordingTime(0);
    setSessionId(null);
    setIsProcessing(false);
    
    // cleanup if recording is active
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
  };

  // get status text based on current state
  const getStatusText = (): string => {
    switch (recordingStatus) {
      case 'recording':
        return `запись... ${formatTime(recordingTime)}`;
      case 'processing':
        return 'обработка аудио...';
      case 'completed':
        return 'запись завершена успешно';
      case 'error':
        return 'ошибка записи';
      default:
        return 'готов к записи';
    }
  };

  // get button text based on current state
  const getButtonText = (): string => {
    if (isProcessing) return 'обработка...';
    if (isRecording) return 'завершить запись';
    return 'начать запись';
  };

  return (
    <div className="audio-recording-card" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#fff'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <svg style={{ width: '24px', height: '24px', marginRight: '12px', color: '#1976d2' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1976d2' }}>Аудиозапись</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
            {getStatusText()}
          </p>
        </div>
        {recordingStatus === 'completed' && (
          <div style={{ marginLeft: 'auto' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px', color: '#4caf50' }}>
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleRecordingToggle}
          disabled={disabled || isProcessing}
          style={{
            backgroundColor: isRecording ? '#f44336' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 24px',
            fontSize: '14px',
            cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
            opacity: disabled || isProcessing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            minWidth: '160px'
          }}
        >
          {isProcessing ? (
            <svg style={{ width: '16px', height: '16px', marginRight: '8px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="31.416" strokeDashoffset="31.416" style={{ animation: 'spin 2s linear infinite' }}>
                <animate attributeName="stroke-dashoffset" dur="2s" values="31.416;0;31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : isRecording ? (
            <svg style={{ width: '16px', height: '16px', marginRight: '8px' }} viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg style={{ width: '16px', height: '16px', marginRight: '8px' }} viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          )}
          {getButtonText()}
        </button>
      </div>

      {recordingStatus === 'completed' && sessionId && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #c8e6c8',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#2d5a2d'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Запись успешно загружена</div>
          <div>ID сессии: {sessionId}</div>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={resetRecording}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #4caf50',
                color: '#4caf50',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Записать еще раз
            </button>
          </div>
        </div>
      )}

      {recordingStatus === 'error' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#ffeaea',
          border: '1px solid #ffcdd2',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#c62828'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ошибка записи</div>
          <div>Проверьте разрешения микрофона и попробуйте еще раз</div>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={resetRecording}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #f44336',
                color: '#f44336',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      )}
    </div>
  );
};