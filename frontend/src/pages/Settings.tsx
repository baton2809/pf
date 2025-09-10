import React from 'react';

export const Settings: React.FC = () => {
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
                value="Пользователь"
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
                value="user@example.com"
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
                ID пользователя
              </label>
              <input
                type="text"
                value="default-user"
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa',
                  fontFamily: 'monospace'
                }}
              />
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
              © 2024 PitchForge. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};