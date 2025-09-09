import React from 'react';
import { TrainingSession } from '../data/mockData';

interface SessionTableProps {
  selectedSessions: string[];
  searchTerm: string;
  sessions: TrainingSession[];
  onSessionToggle: (sessionId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSessionTitleClick: (session: TrainingSession) => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({
  selectedSessions,
  searchTerm,
  sessions,
  onSessionToggle,
  onSelectAll,
  onSessionTitleClick
}) => {
  // фильтруем завершенные сессии по поисковому запросу
  const filteredSessions = sessions
    .filter(session => session.status === 'completed')
    .filter(session => session.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDuration = (totalSeconds: number) => {
    console.log('Formatting duration:', totalSeconds, 'seconds');
    
    if (totalSeconds === 0) {
      return '00:00';
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // функция для форматирования оценки в 10-балльной системе
  const formatScore = (score: number) => {
    return (score / 10).toFixed(1).replace('.', ',');
  };

  // функция для получения названия персонажа
  const getCharacterName = (type: TrainingSession['type']) => {
    const characters: {[key: string]: string} = {
      'presentation': 'Инвестор',
      'interview': 'HR специалист',
      'sales': 'Клиент',
      'public-speaking': 'Аудитория'
    };
    return characters[type] || 'Собеседник';
  };

  const isAllSelected = filteredSessions.length > 0 && selectedSessions.length === filteredSessions.length;
  const isPartiallySelected = selectedSessions.length > 0 && selectedSessions.length < filteredSessions.length;

  return (
    <>
      {/* таблица */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse'
      }}>
        <thead>
          <tr>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px',
              width: '40px'
            }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isPartiallySelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
            </th>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              Название
            </th>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'center',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              Дата создания
            </th>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'center',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              Длительность
            </th>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              Персонаж
            </th>
            <th style={{
              background: '#f8f9fa',
              padding: '16px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#495057',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              Общая оценка
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredSessions.map(session => (
            <tr 
              key={session.id}
              style={{
                borderBottom: '1px solid #f1f3f4'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <td style={{ padding: '16px' }}>
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => onSessionToggle(session.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
              </td>
              <td style={{ 
                padding: '16px',
                fontSize: '14px'
              }}>
                <button
                  onClick={() => onSessionTitleClick(session)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: 0,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {session.title}
                </button>
              </td>
              <td style={{ 
                padding: '16px',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {formatDate(session.date)}
              </td>
              <td style={{ 
                padding: '16px',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {formatDuration(session.duration)}
              </td>
              <td style={{ 
                padding: '16px',
                fontSize: '14px'
              }}>
                {getCharacterName(session.type)}
              </td>
              <td style={{ 
                padding: '16px',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                <span style={{
                  color: '#000000',
                  fontWeight: 500
                }}>
                  {formatScore(session.overallScore || 0)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* пустое состояние */}
      {filteredSessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6c757d'
        }}>
          {searchTerm ? 
            `Не найдено сессий по запросу "${searchTerm}"` : 
            'Нет завершенных сессий'
          }
        </div>
      )}
    </>
  );
};