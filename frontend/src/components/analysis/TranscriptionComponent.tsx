import React from 'react';

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionComponentProps {
  segments: TranscriptionSegment[];
  isLoading?: boolean;
}

export const TranscriptionComponent: React.FC<TranscriptionComponentProps> = ({ 
  segments, 
  isLoading = false 
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (): string => {
    if (!segments || segments.length === 0) return '0:00';
    const lastSegment = segments[segments.length - 1];
    return formatTime(lastSegment.end);
  };

  const copyTranscription = () => {
    if (!segments || segments.length === 0) return;
    
    const text = segments.map((segment) => 
      `${formatTime(segment.start)} Вы: ${segment.text}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    // simple alert for now - could be replaced with toast notification
    alert('Транскрипт скопирован в буфер обмена!');
  };

  if (isLoading) {
    return (
      <div className="card" style={{
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '500px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#212529',
          marginBottom: '16px'
        }}>
          Транскрипт + таймкоды
        </h3>
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <p>Загружаем данные расшифровки...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      padding: '20px 24px',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      height: '500px'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '12px',
            color: '#6c757d'
          }}>
            Длительность: {getTotalDuration()}
          </span>
          <button
            onClick={copyTranscription}
            disabled={!segments || segments.length === 0}
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
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {segments && segments.length > 0 ? (
          segments.map((segment, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer'
              }}
              onClick={() => {
                // future: navigate to audio timestamp
                console.log(`Navigate to ${formatTime(segment.start)}`);
              }}
            >
              <div style={{
                color: '#6366f1',
                fontSize: '14px',
                fontWeight: 500,
                minWidth: '45px',
                fontFamily: 'SF Mono, Monaco, monospace'
              }}>
                {formatTime(segment.start)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600,
                  color: '#212529',
                  marginBottom: '2px',
                  fontSize: '14px'
                }}>
                  Вы
                </div>
                <div style={{
                  color: '#495057',
                  fontSize: '14px',
                  lineHeight: 1.4
                }}>
                  {segment.text}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#6c757d',
            padding: '40px 20px'
          }}>
            <p>Ожидаем расшифровку речи...</p>
          </div>
        )}
      </div>
    </div>
  );
};