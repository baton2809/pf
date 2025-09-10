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

  const filteredTrainings = trainings.filter(training =>
    training.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
        История завершенных тренировок с результатами анализа
      </h3>
      
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* search and delete button */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '8px 12px',
            width: '300px',
            background: '#f8f9fa'
          }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по названию..."
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '14px',
                color: '#6c757d'
              }}
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={selectedTrainings.length === 0}
            style={{
              background: selectedTrainings.length > 0 ? '#ff6b6b' : '#dee2e6',
              color: selectedTrainings.length > 0 ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '14px',
              cursor: selectedTrainings.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Удалить ({selectedTrainings.length})
          </button>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredTrainings.length > 0 && selectedTrainings.length === filteredTrainings.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Название тренировки</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Дата завершения</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Длительность</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Тип</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Общая оценка</th>
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
                <tr
                  key={training.id}
                  style={{
                    borderBottom: '1px solid #e9ecef',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '12px' }}>
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
                  <td style={{ padding: '12px' }}>
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
                  <td style={{ padding: '12px', color: '#5f6368' }}>
                    {training.completedAt ? formatDate(training.completedAt) : 'Нет данных'}
                  </td>
                  <td style={{ padding: '12px', color: '#5f6368' }}>
                    {formatDuration(training.duration)}
                  </td>
                  <td style={{ padding: '12px', color: '#5f6368' }}>
                    {training.trainingType === 'presentation' ? 'Презентация' : 
                     training.trainingType === 'pitch' ? 'Питч' :
                     training.trainingType === 'interview' ? 'Интервью' :
                     training.trainingType === 'meeting' ? 'Встреча' :
                     training.trainingType === 'training' ? 'Тренировка' :
                     training.trainingType}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: training.status === 'completed' ? '#e8f5e8' : 
                                      training.status === 'processing' ? '#fff3cd' :
                                      training.status === 'failed' ? '#f8d7da' : '#e2e3e5',
                      color: training.status === 'completed' ? '#2d7d47' : 
                             training.status === 'processing' ? '#856404' :
                             training.status === 'failed' ? '#721c24' : '#6c757d',
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
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
      </div>
    </div>
  );
};