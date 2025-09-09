import React, { useState } from 'react';
import { UploadModal } from './UploadModal';

interface RecordingButtonsProps {
  disabled?: boolean;
  isRecording?: boolean;
  recordingTime?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: () => any;
  onRecordingComplete?: (mockAudioData: any) => void;
  onUploadComplete?: (file: File, presentationFile?: File) => void;
}

export const RecordingButtons: React.FC<RecordingButtonsProps> = ({
  disabled = false,
  isRecording: externalIsRecording = false,
  recordingTime: externalRecordingTime = 0,
  onRecordingStart,
  onRecordingStop,
  onRecordingComplete,
  onUploadComplete
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Используем внешнее состояние записи
  const isRecording = externalIsRecording;
  const recordingTime = externalRecordingTime;

  const handleStartStopRecording = () => {
    if (!isRecording) {
      // Начать запись
      if (onRecordingStart) {
        onRecordingStart();
      }
    } else {
      // Остановить запись
      if (onRecordingStop) {
        const audioData = onRecordingStop();
        
        // Показываем уведомление
        alert(`Запись завершена! Длительность: ${recordingTime} сек.`);
        
        if (onRecordingComplete) {
          onRecordingComplete(audioData);
        }
        
        console.log('Запись остановлена', audioData);
      }
    }
  };

  const handleUploadRecording = React.useCallback(() => {
    setShowUploadModal(true);
  }, []);

  const handleUploadModalClose = React.useCallback(() => {
    setShowUploadModal(false);
  }, []);

  const handleUploadModalUpload = React.useCallback((audioFile: File, presentationFile?: File) => {
    console.log('Файл загружен:', audioFile.name);
    if (presentationFile) {
      console.log('Презентация загружена:', presentationFile.name);
    }
    
    // Имитируем загрузку и анализ
    alert(`Файл "${audioFile.name}" загружен и готов к анализу!`);
    
    if (onUploadComplete) {
      onUploadComplete(audioFile, presentationFile);
    }
  }, [onUploadComplete]);

  const formatTime = React.useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="recording-buttons">
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button
            className={`recording-btn start-recording ${isRecording ? 'recording' : ''}`}
            onClick={handleStartStopRecording}
            disabled={disabled}
          >
            <svg className="recording-icon mic-icon" viewBox="0 0 24 24">
              {!isRecording ? (
                <>
                  <path fill="currentColor" d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2z"/>
                  <path fill="currentColor" d="M19 10v2c0 3.87-3.13 7-7 7s-7-3.13-7-7v-2h2v2c0 2.76 2.24 5 5 5s5-2.24 5-5v-2h2z"/>
                  <rect fill="currentColor" x="11" y="20" width="2" height="3"/>
                </>
              ) : (
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
              )}
            </svg>
            <span>
              {!isRecording ? 'Начать запись' : `Остановить запись (${formatTime(recordingTime)})`}
            </span>
          </button>

          <button
            className="recording-btn upload-recording"
            onClick={handleUploadRecording}
            disabled={disabled || isRecording}
          >
            <svg className="recording-icon upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 4v8"/>
              <polyline points="8,9 12,13 16,9"/>
              <rect x="5" y="15" width="14" height="4" rx="1"/>
              <circle cx="12" cy="4" r="1"/>
            </svg>
            <span>Загрузить запись</span>
          </button>
        </div>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={handleUploadModalClose}
        onUpload={handleUploadModalUpload}
      />
    </div>
  );
};