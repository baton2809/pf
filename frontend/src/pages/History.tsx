import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainingApiService } from '../services/trainingApi';

interface TrainingData {
  id: string;
  sessionId: string;
  title: string;
  trainingType: string;
  status: string;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  startTime?: string;
  mlResults?: any;
}

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<TrainingData[]>([]);
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const data = await trainingApiService.getTrainingHistory('default-user');
      setTrainings(data);
    } catch (error: any) {
      console.error('Failed to load training history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingToggle = (trainingId: string) => {
    setSelectedTrainings(prev => 
      prev.includes(trainingId) 
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrainings(filteredTrainings.map(t => t.id));
    } else {
      setSelectedTrainings([]);
    }
  };

  const handleDelete = async () => {
    // todo: implement delete for completed trainings
    alert('Удаление тренировок временно недоступно');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = (training: TrainingData) => {
    if (!training.mlResults?.pitch_evaluation?.marks) return null;
    
    const marks = training.mlResults.pitch_evaluation.marks;
    const { structure, clarity, specificity, persuasiveness } = marks;
    
    // calculate weighted average (out of 10, convert to 100)
    const totalScore = (structure + clarity + specificity + persuasiveness) / 4;
    return Math.round(totalScore * 10); // convert to 100-point scale
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'presentation': return 'Презентация';
      case 'pitch': return 'Питч';
      case 'interview': return 'Интервью';
      case 'meeting': return 'Встреча';
      case 'training': return 'Тренировка';
      default: return type;
    }
  };

  const getScoreStyle = (status: string) => {
    if (status === 'completed') return { backgroundColor: '#e8f5e8', color: '#2d7d47' };
    if (status === 'processing') return { backgroundColor: '#fff3cd', color: '#856404' };
    if (status === 'failed') return { backgroundColor: '#f8d7da', color: '#721c24' };
    return { backgroundColor: '#e2e3e5', color: '#6c757d' };
  };

  const filteredTrainings = trainings.filter(training =>
    training.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="history-container">
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
        История завершенных тренировок с результатами анализа
      </h3>
      
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* search and delete button */}
        <div className="history-header">
          <div className="history-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по названию..."
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={selectedTrainings.length === 0}
            className="history-delete-btn"
            style={{
              background: selectedTrainings.length > 0 ? '#ff6b6b' : '#dee2e6',
              color: selectedTrainings.length > 0 ? 'white' : '#6c757d',
              cursor: selectedTrainings.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            Удалить ({selectedTrainings.length})
          </button>
        </div>

        {/* desktop table view */}
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredTrainings.length > 0 && selectedTrainings.length === filteredTrainings.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Название тренировки</th>
                <th>Дата завершения</th>
                <th>Длительность</th>
                <th>Тип</th>
                <th>Общая оценка</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                    Загрузка...
                  </td>
                </tr>
              )}
              {!loading && filteredTrainings.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                    <p>Нет завершенных тренировок</p>
                    <p>Запишите свою первую тренировку и получите результаты анализа!</p>
                  </td>
                </tr>
              )}
              {!loading && filteredTrainings.map(training => (
                <tr key={training.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTrainings.includes(training.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleTrainingToggle(training.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/sessions/${training.sessionId}`)}
                      style={{
                        color: '#1a73e8',
                        textDecoration: 'none',
                        fontWeight: 500,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                        textAlign: 'left'
                      }}
                    >
                      {training.title}
                    </button>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                      Создана: {formatDate(training.createdAt)}
                    </div>
                  </td>
                  <td style={{ color: '#5f6368' }}>
                    {training.completedAt ? formatDate(training.completedAt) : 'Нет данных'}
                  </td>
                  <td style={{ color: '#5f6368' }}>
                    {formatDuration(training.duration)}
                  </td>
                  <td style={{ color: '#5f6368' }}>
                    {getTypeLabel(training.trainingType)}
                  </td>
                  <td>
                    <div className="history-card-score" style={getScoreStyle(training.status)}>
                      {training.status === 'completed' 
                        ? (calculateScore(training) !== null ? `${calculateScore(training)}/100` : 'Нет оценки')
                        : training.status === 'processing' ? 'В обработке'
                        : training.status === 'failed' ? 'Ошибка'
                        : 'Неизвестно'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile card view */}
        <div className="history-cards">
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              Загрузка...
            </div>
          )}
          {!loading && filteredTrainings.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <p>Нет завершенных тренировок</p>
              <p>Запишите свою первую тренировку и получите результаты анализа!</p>
            </div>
          )}
          {!loading && filteredTrainings.map(training => (
            <div 
              key={training.id} 
              className="history-card"
              onClick={() => navigate(`/sessions/${training.sessionId}`)}
            >
              <div className="history-card-header">
                <div style={{ flex: 1 }}>
                  <div className="history-card-title">
                    {training.title}
                  </div>
                  <div className="history-card-date">
                    {training.completedAt ? formatDate(training.completedAt) : 'Не завершено'}
                  </div>
                </div>
                <div className="history-card-score" style={getScoreStyle(training.status)}>
                  {training.status === 'completed' 
                    ? (calculateScore(training) !== null ? `${calculateScore(training)}/100` : 'Нет оценки')
                    : training.status === 'processing' ? 'В обработке'
                    : training.status === 'failed' ? 'Ошибка'
                    : 'Неизвестно'}
                </div>
              </div>
              <div className="history-card-details">
                <div className="history-card-detail">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatDuration(training.duration)}
                </div>
                <div className="history-card-detail">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                  {getTypeLabel(training.trainingType)}
                </div>
                <div className="history-card-detail">
                  <input
                    type="checkbox"
                    checked={selectedTrainings.includes(training.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleTrainingToggle(training.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};