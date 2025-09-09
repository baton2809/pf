import React, { useState } from 'react';
import { sessionTypeLabels, TrainingSession } from '../data/mockData';
import { RecordingButtons } from './RecordingButtons';

interface NewSessionProps {
  onStartSession?: (sessionData: Partial<TrainingSession>) => void;
  lastSessionResult?: any;
}

export const NewSession: React.FC<NewSessionProps> = ({ onStartSession, lastSessionResult }) => {
  const [sessionType, setSessionType] = useState<TrainingSession['type']>('presentation');
  const [title, setTitle] = useState('');
  const [recordingData, setRecordingData] = useState<any>(null);
  const [uploadedRecording, setUploadedRecording] = useState<File | null>(null);
  const [uploadedPresentation, setUploadedPresentation] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordingStart = () => {
    // instead of showing overlay, trigger the onStartSession callback
    if (onStartSession) {
      onStartSession({
        title: title || 'Новая тренировка',
        type: sessionType
      });
    }
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    console.log('Запись остановлена');
    return recordingData;
  };

  const handleRecordingComplete = (audioData: any) => {
    setRecordingData(audioData);
    setIsRecording(false);
    console.log('Запись завершена:', audioData);
  };


  const handleUploadComplete = (file: File, presentationFile?: File) => {
    setUploadedRecording(file);
    if (presentationFile) {
      setUploadedPresentation(presentationFile);
    }
    console.log('Файл загружен:', file.name);
    if (presentationFile) {
      console.log('Презентация загружена:', presentationFile.name);
    }
  };




  return (
    <div className="new-session">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '32px', 
        alignItems: 'stretch',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Левая колонка - форма */}
        <div>
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            minHeight: '500px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Параметры сессии</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                Название тренировки
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Презентация квартального отчета"
                className="training-name-input"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                Тип тренировки
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as TrainingSession['type'])}
                className="training-type-select"
              >
                {Object.entries(sessionTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <RecordingButtons
              disabled={false}
              isRecording={isRecording}
              recordingTime={0}
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              onRecordingComplete={handleRecordingComplete}
              onUploadComplete={handleUploadComplete}
            />

            {lastSessionResult && (
              <div style={{ 
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#e8f5e8',
                border: '1px solid #c8e6c8',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#2d5a2d', marginBottom: '8px' }}>
                  ✓ Последняя сессия завершена
                </div>
                <div style={{ color: '#2d7d47', fontSize: '12px' }}>
                  <div>Формат: {lastSessionResult.format || 'WAV'}</div>
                  <div>Длительность: ~{lastSessionResult.duration || 0} сек.</div>
                  <div>Размер файла: {Math.round((lastSessionResult.size || 0) / 1024)} KB</div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                    ID сессии: {lastSessionResult.sessionId}
                  </div>
                </div>
              </div>
            )}
            
            {recordingData && recordingData.fileName && (
              <div style={{ 
                marginBottom: '16px',
                fontSize: '12px', 
                color: '#2d7d47',
                backgroundColor: '#e8f5e8',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                Запись готова: {recordingData.fileName} ({recordingData.duration || 0} сек.)
              </div>
            )}
            {uploadedRecording && (
              <div style={{ 
                marginBottom: '16px',
                fontSize: '12px', 
                color: '#2d7d47',
                backgroundColor: '#e8f5e8',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                Файл загружен: {uploadedRecording.name}
                {uploadedPresentation && (
                  <div style={{ marginTop: '4px' }}>
                    Презентация: {uploadedPresentation.name}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Правая колонка - советы */}
        <div>
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            minHeight: '500px',
            overflow: 'auto' 
          }}>

            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              marginBottom: '20px'
            }}>
              <div style={{
                color: '#6c757d',
                fontSize: '16px',
                textAlign: 'center'
              }}>
                здесь что-то будет
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};