import React, { useState, useEffect, useCallback } from 'react';
import { TrainingSession, sessionTypeLabels } from '../data/mockData';
import { TabNav } from './TabNav';
import { SessionTable } from './SessionTable';
import { SessionDetails } from './SessionDetails';
import { apiServiceManager } from '../services/api';
import { apiLogger } from '../utils/logger';

interface SessionHistoryProps {
  lastSessionResult?: any;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ lastSessionResult }) => {
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('sessions');
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<TrainingSession | null>(null);
  const [realSessions, setRealSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false); // prevent infinite loops

  // функция для расчета общей оценки на основе ML результатов
  const calculateOverallScore = useCallback((mlResults: any): number => {
    if (!mlResults || !mlResults.speech_segments) return 75;
    
    // простая оценка на основе количества эмоциональных сегментов
    const segments = mlResults.speech_segments;
    const positiveEmotions = segments.filter((seg: any) => 
      ['happy', 'confident', 'calm'].includes(seg.emotion_data?.emotion?.toLowerCase())
    ).length;
    
    const totalSegments = segments.length;
    const emotionScore = totalSegments > 0 ? (positiveEmotions / totalSegments) * 100 : 75;
    
    // учитываем скорость речи
    const tempRate = mlResults.temp_rate || 150;
    const speedScore = tempRate >= 120 && tempRate <= 180 ? 90 : 70;
    
    return Math.round((emotionScore * 0.7 + speedScore * 0.3));
  }, []);

  // функция для трансформации API сессии в TrainingSession
  const transformApiSessionToTrainingSession = useCallback((apiSession: any): TrainingSession => {
    // используем длительность из базы данных (в секундах) или вычисляем из транскрипции
    let realDurationInSeconds = 0; // начинаем с 0
    
    console.log('API Session duration:', apiSession.duration, 'mlResults:', !!apiSession.mlResults);
    
    if (apiSession.duration !== undefined && apiSession.duration !== null && apiSession.duration > 0) {
      // используем сохраненную длительность из базы данных (уже в секундах)
      realDurationInSeconds = apiSession.duration;
      console.log('Using database duration:', realDurationInSeconds, 'seconds');
    } else if (apiSession.mlResults?.speech_segments && apiSession.mlResults.speech_segments.length > 0) {
      // fallback: вычисляем на основе транскрипции
      const lastSegment = apiSession.mlResults.speech_segments[apiSession.mlResults.speech_segments.length - 1];
      if (lastSegment && lastSegment.end) {
        realDurationInSeconds = Math.ceil(lastSegment.end);
        console.log('Using transcription duration:', realDurationInSeconds, 'seconds');
      }
    }
    
    console.log('Final session duration:', realDurationInSeconds, 'seconds');
    
    return {
      id: apiSession.id,
      title: apiSession.title || apiSession.filename || 'Неизвестная сессия',
      type: apiSession.sessionType || 'presentation',
      duration: realDurationInSeconds, // длительность в секундах для точного отображения
      date: new Date(apiSession.createdAt).toISOString(),
      status: apiSession.status === 'completed' ? 'completed' : 'in-progress',
      score: calculateOverallScore(apiSession.mlResults),
      overallScore: calculateOverallScore(apiSession.mlResults),
      speechAnalysis: apiSession.mlResults
    };
  }, [calculateOverallScore]);

  // функция для загрузки сессий
  const loadSessions = useCallback(async () => {
    if (loadingRef.current) {
      console.log('loadSessions: already loading, skipping');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    try {
      const apiService = await apiServiceManager.getApiService();
      const sessions = await apiService.getSessions('default-user');
      
      apiLogger.info('Loaded sessions from API', { count: sessions.length });
      setRealSessions(sessions);
      
      // Не устанавливаем selectedSessionForDetails здесь, чтобы избежать циклов
      // Это будет обработано в отдельном useEffect
    } catch (error) {
      apiLogger.error('Failed to load sessions', error);
      setRealSessions([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // No dependencies - loadSessions is stable


  // TEMPORARILY DISABLED - this was causing infinite loop spam
  // обновляем сессии когда приходит результат последней записи
  // React.useEffect(() => {
  //   if (lastSessionResult && lastSessionResult.sessionId) {
  //     // перезагружаем список сессий из API чтобы получить новую запись
  //     loadSessions();
  //     setActiveTab('details');
  //   }
  // }, [lastSessionResult, loadSessions]); // loadSessions теперь стабильна

  // загружаем данные при инициализации
  useEffect(() => {
    loadSessions();
  }, [loadSessions]); // loadSessions стабильна, запустится один раз
  
  // выбираем сессию после загрузки
  useEffect(() => {
    if (realSessions.length > 0) {
      // если есть lastSessionResult, находим и выбираем эту сессию
      if (lastSessionResult && lastSessionResult.sessionId) {
        const targetSession = realSessions.find(session => session.id === lastSessionResult.sessionId);
        if (targetSession) {
          setSelectedSessionForDetails(transformApiSessionToTrainingSession(targetSession));
          return;
        }
      }
      
      // если нет selectedSessionForDetails, выбираем первую
      if (!selectedSessionForDetails) {
        const latestSession = realSessions[0];
        setSelectedSessionForDetails(transformApiSessionToTrainingSession(latestSession));
      }
    }
  }, [realSessions, lastSessionResult]); // removed transformApiSessionToTrainingSession to prevent circular deps
  


  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const displaySessions = realSessions.length > 0 
        ? realSessions.map(transformApiSessionToTrainingSession)
        : [];
      setSelectedSessions(displaySessions.map(session => session.id));
    } else {
      setSelectedSessions([]);
    }
  };

  const handleDelete = async () => {
    if (selectedSessions.length === 0) return;

    const confirmDelete = window.confirm(
      `Вы уверены, что хотите удалить ${selectedSessions.length} сессий? Это действие нельзя отменить.`
    );

    if (!confirmDelete) return;

    try {
      const apiService = await apiServiceManager.getApiService();
      
      // удаляем каждую выбранную сессию
      const deletePromises = selectedSessions.map(sessionId => 
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/audio/session/${sessionId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);
      
      // очищаем выбранные сессии
      setSelectedSessions([]);
      
      // перезагружаем список сессий
      await loadSessions();
      
      apiLogger.info('Sessions deleted successfully', { count: selectedSessions.length });
      alert(`Успешно удалено ${selectedSessions.length} сессий`);
      
    } catch (error) {
      apiLogger.error('Failed to delete sessions', error);
      alert('Ошибка при удалении сессий. Попробуйте еще раз.');
    }
  };

  const handleSessionTitleClick = (session: TrainingSession) => {
    setSelectedSessionForDetails(session);
    setActiveTab('details');
  };

  const handleSessionChange = (session: TrainingSession) => {
    setSelectedSessionForDetails(session);
  };


  const tabs = [
    { key: 'sessions', label: 'Список сессий' },
    { key: 'details', label: 'Детальная аналитика' }
  ];

  // показываем только реальные сессии из API
  const displaySessions = realSessions.map(transformApiSessionToTrainingSession);

  const filteredSessions = displaySessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* заголовок страницы */}
      <h3 style={{ 
        marginBottom: '20px', 
        fontSize: '1.5rem' 
      }}>
        Управляйте своими записями тренировок и просматривайте результаты
      </h3>
      
      
      {/* навигация по вкладкам */}
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* содержимое вкладок */}
      {activeTab === 'sessions' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* поиск и кнопка удаления внутри карточки */}
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
              background: '#f8f9fa',
              transition: 'border-color 0.2s ease'
            }}>
              <span style={{
                color: '#6c757d',
                marginRight: '8px',
                fontSize: '22px'
              }}>
                ⌕
              </span>
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
              disabled={selectedSessions.length === 0}
              style={{
                background: selectedSessions.length > 0 ? '#ff6b6b' : '#dee2e6',
                color: selectedSessions.length > 0 ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '14px',
                cursor: selectedSessions.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Удалить ({selectedSessions.length})
            </button>
          </div>
          <SessionTable
            sessions={filteredSessions}
            selectedSessions={selectedSessions}
            searchTerm={searchTerm}
            onSessionToggle={handleSessionToggle}
            onSelectAll={handleSelectAll}
            onSessionTitleClick={handleSessionTitleClick}
          />
          
          {!loading && filteredSessions.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <p>Нет сессий для отображения</p>
              <p>Попробуйте записать свою первую тренировку!</p>
            </div>
          )}
        </div>
      ) : (
        <SessionDetails
          selectedSession={selectedSessionForDetails}
          onSessionChange={handleSessionChange}
        />
      )}
    </div>
  );
};