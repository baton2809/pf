import React, { useState } from 'react';

type SortBy = 'score' | 'sessions' | 'time';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  averageScore: number;
  totalSessions: number;
  totalPracticeTime: number;
  lastActive: string;
}

export const Leaderboard: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const allUsers: LeaderboardUser[] = []; // Mock data removed - use real API data only
  
  const sortUsers = (users: LeaderboardUser[], sortBy: SortBy): LeaderboardUser[] => {
    const sorted = [...users];
    
    switch (sortBy) {
      case 'score':
        return sorted.sort((a, b) => b.averageScore - a.averageScore);
      case 'sessions':
        return sorted.sort((a, b) => b.totalSessions - a.totalSessions);
      case 'time':
        return sorted.sort((a, b) => b.totalPracticeTime - a.totalPracticeTime);
      default:
        return sorted;
    }
  };

  const sortedUsers = sortUsers(allUsers, sortBy);
  const currentUserRank = 0;

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
    }
    return `${mins}м`;
  };

  const formatLastActive = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '#1';
      case 2: return '#2';
      case 3: return '#3';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="leaderboard-container">
      <div className="page-header">
        <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
          Соревнуйтесь с коллегами и отслеживайте свой прогресс
        </h3>
      </div>

      <div className="current-user-card">
        <div className="current-user-info">
          <div className="user-details">
            <h3>Ваша позиция</h3>
            <div className="rank-display">
              <span className="rank-number">#{currentUserRank} из {allUsers.length} участников</span>
            </div>
          </div>
        </div>
        <div className="user-stats">
          <div className="stat">
            <span className="stat-value">82</span>
            <span className="stat-label">Средний балл</span>
          </div>
          <div className="stat">
            <span className="stat-value">12</span>
            <span className="stat-label">Тренировок</span>
          </div>
          <div className="stat">
            <span className="stat-value">4ч</span>
            <span className="stat-label">Времени</span>
          </div>
        </div>
      </div>

      <div className="leaderboard-controls">
        <div className="sort-buttons">
          <button 
            className={`sort-btn ${sortBy === 'score' ? 'active' : ''}`}
            onClick={() => setSortBy('score')}
          >
            По баллам
          </button>
          <button 
            className={`sort-btn ${sortBy === 'sessions' ? 'active' : ''}`}
            onClick={() => setSortBy('sessions')}
          >
            По тренировкам
          </button>
          <button 
            className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`}
            onClick={() => setSortBy('time')}
          >
            По времени
          </button>
        </div>
      </div>

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="header-rank">МЕСТО</div>
          <div className="header-user">ПОЛЬЗОВАТЕЛЬ</div>
          <div className="header-score">СРЕДНИЙ БАЛЛ</div>
          <div className="header-sessions">ТРЕНИРОВОК</div>
          <div className="header-time">ВРЕМЯ</div>
          <div className="header-last-active">АКТИВНОСТЬ</div>
        </div>

        <div className="table-body">
          {sortedUsers.length === 0 && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              Данные лидерборда пока недоступны
            </div>
          )}
          {sortedUsers.map((user, index) => {
            const displayRank = sortBy === 'score' ? user.rank : index + 1;
            const isCurrentUser = user.id === 'current';
            
            return (
              <div 
                key={user.id} 
                className={`table-row ${isCurrentUser ? 'current-user-row' : ''}`}
              >
                <div className="cell-rank">
                  <span className="rank-badge">
                    {getRankIcon(displayRank)}
                  </span>
                </div>
                
                <div className="cell-user">
                  <div className="user-info">
                    <div className="user-name-badges">
                      <span className="user-name">{user.name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="cell-score">
                  <span className="score-value">{user.averageScore}</span>
                </div>
                
                <div className="cell-sessions">
                  <span className="sessions-value">{user.totalSessions}</span>
                </div>
                
                <div className="cell-time">
                  <span className="time-value">{formatTime(user.totalPracticeTime)}</span>
                </div>
                
                <div className="cell-last-active">
                  <span className="last-active-value">{formatLastActive(user.lastActive)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="leaderboard-info">
        <div className="info-card">
          <h3>Как попасть в топ?</h3>
          <ul>
            <li>Регулярно проводите тренировки</li>
            <li>Работайте над улучшением всех навыков</li>
            <li>Практикуйте разные типы выступлений</li>
            <li>Анализируйте свои результаты</li>
          </ul>
        </div>
      </div>
    </div>
  );
};