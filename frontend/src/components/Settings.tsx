import React, { useState, useEffect } from 'react';

type SettingsSection = 'profile' | 'integrations' | 'assistant' | 'avatar';

interface SettingsProps {
  initialSection?: SettingsSection;
}

export const Settings: React.FC<SettingsProps> = ({ initialSection = 'profile' }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);
  
  const [notifications, setNotifications] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState('ru');

  // Mock data for integrations
  const [integrations, setIntegrations] = useState({
    zoom: { connected: true },
    googleMeet: { connected: false },
    googleCalendar: { connected: true },
    saluteJazz: { connected: false },
    yandexTelemost: { connected: true },
    konturTolk: { connected: false }
  });

  // Avatar settings
  const [avatarSettings, setAvatarSettings] = useState({
    selectedAvatar: 'professional-woman',
    behaviorMode: 'professional',
    voiceType: 'female-calm',
    speechSpeed: 'normal',
    autoJoinMeetings: true,
    appearInRecordings: false,
    customization: {
      skinTone: 'medium',
      hairStyle: 'professional',
      clothing: 'business-casual',
      accessories: 'none'
    }
  });

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  return (
    <div className="settings">
      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Основной контент без боковой навигации */}
        <div style={{ width: '100%' }}>
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );

  function renderActiveSection() {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'integrations':
        return renderIntegrationsSection();
      case 'avatar':
        return renderAvatarSection();
      default:
        return renderProfileSection();
    }
  }

  function renderProfileSection() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'stretch' }}>
        {/* Left Column - Profile */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%'
          }}>
            <h3>Профиль</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                  Имя
                </label>
                <input
                  type="text"
                  defaultValue="Артем Бутомов"
                  className="training-name-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  defaultValue="artem@example.com"
                  className="training-name-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - General Settings */}
        <div>
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            marginBottom: 0
          }}>
            <h3>Общие настройки</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Уведомления</div>
                  <div style={{ fontSize: '12px', color: '#5f6368' }}>
                    Получать уведомления о запланированных тренировках
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '40px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: notifications ? '#1a73e8' : '#dadce0',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: notifications ? '22px' : '2px',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Автосохранение</div>
                  <div style={{ fontSize: '12px', color: '#5f6368' }}>
                    Автоматически сохранять прогресс тренировок
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '40px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: autoSave ? '#1a73e8' : '#dadce0',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: autoSave ? '22px' : '2px',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                  Язык интерфейса
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="training-type-select"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderIntegrationsSection() {
    const toggleIntegration = (key: keyof typeof integrations) => {
      setIntegrations(prev => ({
        ...prev,
        [key]: {
          connected: !prev[key].connected
        }
      }));
    };

    const integrationsList = [
      {
        key: 'zoom' as const,
        name: 'Zoom',
        description: 'Автоматический анализ встреч и записей',
        available: true,
        logo: (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#2D8CFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }}>
            Zoom
          </div>
        )
      },
      {
        key: 'yandexTelemost' as const,
        name: 'Я.Телемост',
        description: 'Яндекс видеоконференции и совещания',
        available: false,
        logo: (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '7px',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            lineHeight: '1.0',
            padding: '2px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2)',
            opacity: 0.6
          }}>
            <div>
              <div style={{ 
                fontSize: '14px', 
                color: '#FC3F1D',
                fontWeight: '800', 
                letterSpacing: '0px',
                marginBottom: '1px'
              }}>Я</div>
              <div style={{ 
                fontSize: '5px', 
                color: '#ffffff',
                marginTop: '1px',
                letterSpacing: '0px'
              }}>ТЕЛЕМОСТ</div>
            </div>
          </div>
        )
      },
      {
        key: 'googleCalendar' as const,
        name: 'Google Calendar',
        description: 'Синхронизация календаря и напоминаний',
        available: true,
        logo: (
          <img 
            src="https://fonts.gstatic.com/s/i/productlogos/calendar_2020q4/v10/web-512dp/logo_calendar_2020q4_color_2x_web_512dp.png"
            alt="Google Calendar"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
        )
      },
      {
        key: 'saluteJazz' as const,
        name: 'SaluteJazz',
        description: 'Интеграция с платформой SberDevices',
        available: false,
        logo: (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #24272a 0%, #1a1d1f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '8px',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            lineHeight: '1.1',
            padding: '2px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            opacity: 0.6
          }}>
            <div>
              <div style={{ fontSize: '9px', color: '#21A038', fontWeight: '800' }}>SALUTE</div>
              <div style={{ fontSize: '7px', color: '#ffffff', marginTop: '-1px' }}>JAZZ</div>
            </div>
          </div>
        )
      },
      {
        key: 'googleMeet' as const,
        name: 'Google Meet',
        description: 'Видеоконференции и онлайн-встречи',
        available: false,
        logo: (
          <img 
            src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png"
            alt="Google Meet"
            style={{ width: '40px', height: '40px', objectFit: 'contain', opacity: 0.6 }}
          />
        )
      },
      {
        key: 'konturTolk' as const,
        name: 'Контур.Толк',
        description: 'Корпоративные коммуникации и встречи',
        available: false,
        logo: (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2ea3f2 0%, #1e8bd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '7px',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            lineHeight: '1.0',
            padding: '2px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
            opacity: 0.6
          }}>
            <div>
              <div style={{ fontSize: '8px', color: '#ffffff', fontWeight: '800', letterSpacing: '0.1px' }}>КОНТУР</div>
              <div style={{ fontSize: '7px', color: '#e3f2fd', marginTop: '2px', letterSpacing: '0.3px' }}>ТОЛК</div>
            </div>
          </div>
        )
      }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ marginBottom: '20px', marginLeft: '40px', fontSize: '1.5rem' }}>Подключайте внешние инструменты к PitchForge</h3>
        <div className="card">
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px' 
          }}>
            {integrationsList.map(integration => (
              <div 
                key={integration.key}
                style={{ 
                  padding: '20px', 
                  border: '1px solid #e9ecef', 
                  borderRadius: '12px',
                  backgroundColor: integration.available ? 'white' : '#fafafa',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'box-shadow 0.2s ease',
                  opacity: integration.available ? 1 : 0.8
                }}
                onMouseEnter={(e) => {
                  if (integration.available) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                }}
              >
                {/* Logo */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: integration.available ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 6px rgba(0, 0, 0, 0.06)',
                  flexShrink: 0
                }}>
                  {integration.logo}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {integration.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368', lineHeight: '1.4' }}>
                    {integration.description}
                  </div>
                </div>

                {/* Button */}
                <button 
                  onClick={() => integration.available && toggleIntegration(integration.key)}
                  disabled={!integration.available}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: integration.available 
                      ? `1px solid ${integrations[integration.key].connected ? '#dc2626' : '#1a73e8'}`
                      : '1px solid #d1d5db',
                    backgroundColor: integration.available 
                      ? (integrations[integration.key].connected ? '#fef2f2' : '#f0f8ff')
                      : '#f9fafb',
                    color: integration.available 
                      ? (integrations[integration.key].connected ? '#dc2626' : '#1a73e8')
                      : '#9ca3af',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: integration.available ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (integration.available) {
                      const isConnected = integrations[integration.key].connected;
                      e.currentTarget.style.backgroundColor = isConnected ? '#fee2e2' : '#e0f2fe';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (integration.available) {
                      const isConnected = integrations[integration.key].connected;
                      e.currentTarget.style.backgroundColor = isConnected ? '#fef2f2' : '#f0f8ff';
                    }
                  }}
                >
                  {integration.available 
                    ? (integrations[integration.key].connected ? 'Отключить' : 'Подключить')
                    : 'Скоро'
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  function renderAvatarSection() {
    const avatarOptions = [
      { id: 'professional-woman', name: 'Профессиональная женщина', preview: 'ПЖ' },
      { id: 'professional-man', name: 'Профессиональный мужчина', preview: 'ПМ' },
      { id: 'friendly-woman', name: 'Дружелюбная женщина', preview: 'ДЖ' },
      { id: 'friendly-man', name: 'Дружелюбный мужчина', preview: 'ДМ' }
    ];

    const behaviorModes = [
      { id: 'professional', name: 'Профессиональный', description: 'Деловой стиль, четкие ответы' },
      { id: 'friendly', name: 'Дружелюбный', description: 'Теплое общение, поддержка' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Avatar Selection */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Выбор аватара</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              border: '3px solid #1a73e8'
            }}>
              {avatarOptions.find(a => a.id === avatarSettings.selectedAvatar)?.preview}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                {avatarOptions.find(a => a.id === avatarSettings.selectedAvatar)?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#5f6368' }}>
                Текущий активный аватар
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {avatarOptions.map(avatar => (
              <div key={avatar.id} style={{ textAlign: 'center' }}>
                <div
                  onClick={() => setAvatarSettings(prev => ({ ...prev, selectedAvatar: avatar.id }))}
                  style={{
                    width: '120px',
                    height: '120px',
                    border: `3px solid ${avatarSettings.selectedAvatar === avatar.id ? '#1a73e8' : '#dadce0'}`,
                    borderRadius: '12px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    position: 'relative',
                    backgroundImage: `linear-gradient(135deg, ${avatar.id.includes('woman') ? '#e8f5e8' : '#e3f2fd'}, ${avatar.id.includes('woman') ? '#c8e6c9' : '#bbdefb'})`,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#1a73e8',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white',
                    marginBottom: '8px'
                  }}>
                    {avatar.preview}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#333',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {avatar.name}
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (playingAudio === avatar.id) {
                      setPlayingAudio(null);
                    } else {
                      setPlayingAudio(avatar.id);
                      setTimeout(() => setPlayingAudio(null), 3000);
                    }
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    border: '1px solid #dadce0',
                    borderRadius: '16px',
                    backgroundColor: playingAudio === avatar.id ? '#1a73e8' : 'white',
                    color: playingAudio === avatar.id ? 'white' : '#5f6368',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {playingAudio === avatar.id ? '⏸' : '▶'}
                  {playingAudio === avatar.id ? 'Пауза' : 'Голос'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Behavior Modes */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Режимы поведения</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {behaviorModes.map(mode => (
              <div
                key={mode.id}
                onClick={() => setAvatarSettings(prev => ({ ...prev, behaviorMode: mode.id }))}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${avatarSettings.behaviorMode === mode.id ? '#1a73e8' : '#e9ecef'}`,
                  backgroundColor: avatarSettings.behaviorMode === mode.id ? '#e8f0fe' : 'white',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  {mode.name}
                </div>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                  {mode.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Голос и речь</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Тип голоса
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={avatarSettings.voiceType}
                  onChange={(e) => setAvatarSettings(prev => ({ ...prev, voiceType: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dadce0',
                    fontSize: '14px'
                  }}
                >
                  <option value="female-calm">Женский спокойный</option>
                  <option value="female-energetic">Женский энергичный</option>
                  <option value="male-professional">Мужской профессиональный</option>
                  <option value="male-friendly">Мужской дружелюбный</option>
                </select>
                <button
                  onClick={() => {
                    if (playingAudio === 'voice-sample') {
                      setPlayingAudio(null);
                    } else {
                      setPlayingAudio('voice-sample');
                      setTimeout(() => setPlayingAudio(null), 4000);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    backgroundColor: playingAudio === 'voice-sample' ? '#1a73e8' : 'white',
                    color: playingAudio === 'voice-sample' ? 'white' : '#5f6368',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {playingAudio === 'voice-sample' ? '⏸' : '▶'}
                  Образец
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Скорость речи
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={avatarSettings.speechSpeed}
                  onChange={(e) => setAvatarSettings(prev => ({ ...prev, speechSpeed: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dadce0',
                    fontSize: '14px'
                  }}
                >
                  <option value="slow">Медленная (100 сл/мин)</option>
                  <option value="normal">Нормальная (130 сл/мин)</option>
                  <option value="fast">Быстрая (160 сл/мин)</option>
                </select>
                <button
                  onClick={() => {
                    if (playingAudio === 'speed-sample') {
                      setPlayingAudio(null);
                    } else {
                      setPlayingAudio('speed-sample');
                      setTimeout(() => setPlayingAudio(null), 5000);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    backgroundColor: playingAudio === 'speed-sample' ? '#1a73e8' : 'white',
                    color: playingAudio === 'speed-sample' ? 'white' : '#5f6368',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {playingAudio === 'speed-sample' ? '⏸' : '▶'}
                  Демо
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Meeting Integration */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Интеграция с встречами</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>Автоподключение к встречам</div>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                  Аватар автоматически присоединяется к тренировкам
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avatarSettings.autoJoinMeetings}
                  onChange={(e) => setAvatarSettings(prev => ({ ...prev, autoJoinMeetings: e.target.checked }))}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '40px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: avatarSettings.autoJoinMeetings ? '#1a73e8' : '#dadce0',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: avatarSettings.autoJoinMeetings ? '22px' : '2px',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>Отображение в записях</div>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                  Включать аватара в видеозаписи встреч
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avatarSettings.appearInRecordings}
                  onChange={(e) => setAvatarSettings(prev => ({ ...prev, appearInRecordings: e.target.checked }))}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '40px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: avatarSettings.appearInRecordings ? '#1a73e8' : '#dadce0',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: avatarSettings.appearInRecordings ? '22px' : '2px',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </label>
            </div>
          </div>
        </div>

        <button style={{
          padding: '12px 24px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#1a73e8',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          alignSelf: 'flex-start'
        }}>
          Сохранить настройки аватара
        </button>
      </div>
    );
  }
};