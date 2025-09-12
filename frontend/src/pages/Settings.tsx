import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { currentUser, isAuthenticated, isInitialized, isBackendAvailable } = useAuth();

  // loading state while auth is initializing
  if (!isInitialized) {
    return (
      <div>
        <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
          Настройки аккаунта
        </h3>
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ color: '#5f6368' }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  // not authenticated state
  if (!isAuthenticated || !currentUser) {
    return (
      <div>
        <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
          Настройки аккаунта
        </h3>
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ color: '#5f6368', marginBottom: '16px' }}>
            Необходима авторизация для доступа к настройкам
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>
            Пожалуйста, войдите в систему
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>
        Настройки аккаунта
      </h3>
      
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            Профиль пользователя
          </h4>
          
          {/* user avatar if available */}
          {currentUser.avatar_url && (
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <img
                src={currentUser.avatar_url}
                alt="Avatar"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #e5e7eb'
                }}
              />
            </div>
          )}
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#5f6368', 
                marginBottom: '8px' 
              }}>
                Имя
              </label>
              <input
                type="text"
                value={currentUser.name || 'Не указано'}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#5f6368', 
                marginBottom: '8px' 
              }}>
                Email
              </label>
              <input
                type="email"
                value={currentUser.email}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa'
                }}
              />
            </div>
          </div>
          
          {/* backend connection status */}
          <div style={{ marginTop: '24px', padding: '12px', backgroundColor: isBackendAvailable ? '#f0f9ff' : '#fef2f2', borderRadius: '8px', border: `1px solid ${isBackendAvailable ? '#bae6fd' : '#fecaca'}` }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: isBackendAvailable ? '#0c4a6e' : '#b91c1c', marginBottom: '4px' }}>
              Статус подключения
            </div>
            <div style={{ fontSize: '12px', color: isBackendAvailable ? '#0369a1' : '#dc2626' }}>
              {isBackendAvailable ? '✓ Подключено' : '⚠ Отсутствует подключение к серверу'}
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            Настройки приложения
          </h4>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  Автоматическая загрузка презентаций
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  Автоматически обрабатывать загруженные файлы
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block' }}>
                <input type="checkbox" defaultChecked style={{ display: 'none' }} />
                <span style={{
                  display: 'block',
                  width: '44px',
                  height: '24px',
                  backgroundColor: '#1a73e8',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '20px',
                    top: '2px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  Уведомления о новых функциях
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  Получать информацию об обновлениях
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block' }}>
                <input type="checkbox" defaultChecked style={{ display: 'none' }} />
                <span style={{
                  display: 'block',
                  width: '44px',
                  height: '24px',
                  backgroundColor: '#1a73e8',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '20px',
                    top: '2px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h4 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            О приложении
          </h4>
          <div style={{ fontSize: '14px', color: '#5f6368', lineHeight: 1.6 }}>
            <p>PitchForge v1.0.0</p>
            <p>Платформа для тренировки презентационных навыков с использованием AI</p>
            <p style={{ marginTop: '8px' }}>
              © 2025 PitchForge. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};