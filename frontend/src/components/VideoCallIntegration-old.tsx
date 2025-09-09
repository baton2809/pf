import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface VideoCallIntegrationProps {
  disabled?: boolean;
  onConnect?: (url: string, platform: string) => void;
  isConnecting?: boolean;
}

interface ZoomIntegrationStatus {
  isConnected: boolean;
  hasValidTokens: boolean;
  userEmail?: string;
  connectionType?: string;
}

type Platform = 'zoom' | 'teams' | 'meet' | 'other';
type ConnectionOption = 'manual' | 'auto';

interface ZoomSessionData {
  meetingId: string;
  status: 'active' | 'ended' | 'error';
  participants?: number;
  startTime?: string;
}

export const VideoCallIntegration: React.FC<VideoCallIntegrationProps> = ({
  disabled = false,
  onConnect,
  isConnecting = false
}) => {
  const { isAuthenticated, isBackendAvailable } = useAuth();
  const baseUrl = process.env.REACT_APP_API_URL || '';
  const [meetingUrl, setMeetingUrl] = useState('');
  const [zoomStatus, setZoomStatus] = useState<ZoomIntegrationStatus>({
    isConnected: false,
    hasValidTokens: false
  });
  const [isCheckingZoomStatus, setIsCheckingZoomStatus] = useState(false);
  const [isConnectingZoom, setIsConnectingZoom] = useState(false);
  const [isDisconnectingZoom, setIsDisconnectingZoom] = useState(false);
  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionOption>('manual');
  const [sessionData, setSessionData] = useState<ZoomSessionData | null>(null);
  const [isConnectingAI, setIsConnectingAI] = useState(false);
  const [ngrokCache, setNgrokCache] = useState<{url?: string, timestamp?: number}>({});
  const selectedPlatform: Platform = 'zoom';

  const zoomPlaceholder = 'https://zoom.us/j/123456789';

  // check zoom connection status when component mounts
  useEffect(() => {
    if (isAuthenticated && isBackendAvailable) {
      checkZoomStatus();
    }
  }, [isAuthenticated, isBackendAvailable]);

  // handle OAuth callback results from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const zoomAuth = urlParams.get('zoom_auth');
    const error = urlParams.get('error');

    if (zoomAuth === 'success') {
      // OAuth successful, refresh status and show success message
      setIsConnectingZoom(false);
      setTimeout(() => {
        checkZoomStatus();
        alert('Zoom успешно подключен!');
      }, 500);
      
      // clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
    } else if (zoomAuth === 'error') {
      // OAuth failed, show error message
      const errorMessage = error ? decodeURIComponent(error) : 'неизвестная ошибка';
      alert(`Ошибка подключения к Zoom: ${errorMessage}`);
      setIsConnectingZoom(false);
      
      // clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // helper function to get auth token (fixed duplicate token issue)
  const getAuthToken = () => localStorage.getItem('authToken');

  // cached ngrok URL fetcher to reduce API calls
  const getCachedNgrokInfo = async () => {
    const CACHE_DURATION = 60000; // 1 minute cache
    const now = Date.now();
    
    // use cached data if it's fresh
    if (ngrokCache.url && ngrokCache.timestamp && (now - ngrokCache.timestamp) < CACHE_DURATION) {
      return { success: true, publicUrl: ngrokCache.url };
    }

    const token = getAuthToken();
    if (!token) throw new Error('authentication required');

    const response = await fetch(`${baseUrl}/api/zoom-integration/ngrok-info`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`ngrok info failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success) {
      // cache the result
      setNgrokCache({ url: data.publicUrl, timestamp: now });
    }
    
    return data;
  };

  const checkZoomStatus = async () => {
    setIsCheckingZoomStatus(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      if (!isBackendAvailable) {
        console.log('backend unavailable, cannot check zoom status');
        return;
      }

      const response = await fetch(`${baseUrl}/api/auth-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('auth status response:', JSON.stringify(data, null, 2));
        const zoomIntegration = data.auth?.integrations?.zoom;
        console.log('zoom integration data:', zoomIntegration);
        console.log('full integrations object:', data.auth?.integrations);
        
        setZoomStatus({
          isConnected: zoomIntegration?.connected || false,
          hasValidTokens: zoomIntegration?.hasValidTokens || false,
          userEmail: data.auth?.integrations?.google?.email,
          connectionType: zoomIntegration?.connectionType || 'manual'
        });
        
        // set connection type based on backend preference
        if (zoomIntegration?.connectionType) {
          setSelectedConnectionType(zoomIntegration.connectionType === 'webhook' ? 'auto' : 'manual');
        }
        
        // fetch session data if connected
        if (zoomIntegration?.connected) {
          await fetchSessionData();
        }
      }
    } catch (error) {
      console.error('failed to check zoom status:', error);
    } finally {
      setIsCheckingZoomStatus(false);
    }
  };

  const handleConnectZoom = async () => {
    // prevent multiple simultaneous connection attempts
    if (isConnectingZoom) {
      console.log('zoom connection already in progress, ignoring duplicate request');
      return;
    }
    
    setIsConnectingZoom(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('пожалуйста, войдите в систему');
        setIsConnectingZoom(false);
        return;
      }

      if (!isBackendAvailable) {
        alert('backend недоступен. попробуйте позже');
        setIsConnectingZoom(false);
        return;
      }

      // get dynamic ngrok URLs from backend with user ID for state generation (cached)
      const ngrokData = await getCachedNgrokInfo();
      
      if (!ngrokData.success) {
        alert('ngrok туннель недоступен. проверьте настройки.');
        setIsConnectingZoom(false);
        return;
      }

      // use standard OAuth URL (marketplace URL loses parameters)
      const useMarketplace = sessionStorage.getItem('zoomAuthMode') === 'marketplace';
      const oauthUrl = useMarketplace 
        ? ngrokData.marketplaceOauthUrl
        : ngrokData.oauthUrl;
      
      // store current token for later use
      sessionStorage.setItem('tempAuthToken', token);
      
      // redirect to Zoom OAuth with correct ngrok URL
      window.location.href = oauthUrl;
      
    } catch (error) {
      console.error('failed to initiate zoom OAuth:', error);
      alert('ошибка подключения к Zoom');
      setIsConnectingZoom(false);
    }
  };

  const handleDisconnectZoom = async () => {
    setIsDisconnectingZoom(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('пожалуйста, войдите в систему');
        return;
      }

      if (!isBackendAvailable) {
        alert('backend недоступен. попробуйте позже');
        setIsDisconnectingZoom(false);
        return;
      }

      const response = await fetch(`${baseUrl}/api/disconnect-zoom`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // update local state to reflect disconnection
        setZoomStatus({
          isConnected: false,
          hasValidTokens: false,
          userEmail: undefined
        });
        // clear meeting URL when disconnecting
        setMeetingUrl('');
        alert('Zoom аккаунт отключен');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'ошибка отключения от Zoom');
      }
    } catch (error) {
      console.error('failed to disconnect zoom:', error);
      alert('ошибка отключения от Zoom');
    } finally {
      setIsDisconnectingZoom(false);
    }
  };

  const handleJoinMeeting = () => {
    const url = meetingUrl.trim();
    
    if (!url) {
      alert('пожалуйста, введите ссылку на встречу Zoom');
      return;
    }

    if (!isValidZoomUrl(url)) {
      alert('пожалуйста, введите корректную ссылку Zoom');
      return;
    }

    if (onConnect) {
      onConnect(url, selectedPlatform);
    }
  };

  const fetchSessionData = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${baseUrl}/api/zoom-integration/session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionData(data);
      }
    } catch (error) {
      console.error('failed to fetch session data:', error);
    }
  };

  const handleConnectAI = async () => {
    if (!zoomStatus.isConnected) {
      alert('для подключения AI необходимо сначала подключить Zoom аккаунт');
      return;
    }

    if (!meetingUrl.trim()) {
      alert('пожалуйста, введите ссылку на встречу Zoom');
      return;
    }

    if (!isBackendAvailable) {
      alert('backend недоступен. попробуйте позже');
      return;
    }

    setIsConnectingAI(true);
    try {
      const token = getAuthToken();
      const meetingId = extractMeetingId(meetingUrl);
      
      if (!meetingId) {
        alert('не удалось извлечь ID встречи из ссылки');
        return;
      }

      const response = await fetch(`${baseUrl}/api/zoom-integration/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingUrl: meetingUrl,
          meetingId: meetingId
        })
      });

      if (response.ok) {
        await response.json();
        alert('AI успешно подключен к встрече!');
        await fetchSessionData();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'неизвестная ошибка' }));
        alert(`ошибка подключения AI: ${errorData.message}`);
      }
    } catch (error) {
      console.error('failed to connect AI:', error);
      alert('ошибка подключения AI к встрече');
    } finally {
      setIsConnectingAI(false);
    }
  };

  const handleStartRecording = async () => {
    if (!zoomStatus.isConnected) {
      alert('для начала записи необходимо подключить Zoom аккаунт');
      return;
    }

    if (!meetingUrl.trim()) {
      alert('пожалуйста, сначала укажите ссылку на встречу');
      return;
    }

    if (!isBackendAvailable) {
      alert('backend недоступен. попробуйте позже');
      return;
    }

    try {
      const token = getAuthToken();
      const meetingId = extractMeetingId(meetingUrl);
      
      if (!meetingId) {
        alert('не удалось извлечь ID встречи из ссылки');
        return;
      }

      const response = await fetch(`${baseUrl}/api/zoom-config/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const config = await response.json();
        console.log('meeting config:', config);
        alert('запись начата. AI-ментор подключен к встрече.');
      } else {
        alert('ошибка настройки записи встречи');
      }
    } catch (error) {
      console.error('failed to start recording:', error);
      alert('ошибка запуска записи');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (zoomStatus.isConnected && zoomStatus.hasValidTokens) {
        handleJoinMeeting();
      }
    }
  };

  const isValidZoomUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('zoom.us') && 
             (urlObj.pathname.includes('/j/') || urlObj.pathname.includes('/meeting/'));
    } catch (_) {
      return false;
    }
  };

  const extractMeetingId = (url: string): string | null => {
    try {
      const match = url.match(/\/j\/(\d+)/);
      return match ? match[1] : null;
    } catch (_) {
      return null;
    }
  };

  return (
    <div className="video-integration-card">
      <div className="video-integration-header">
        <svg className="video-integration-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
        </svg>
        <div className="video-integration-header-content">
          <h3>Интеграция с Zoom</h3>
          <p>
            {isCheckingZoomStatus ? 'проверяем статус...' :
             zoomStatus.isConnected ? 'подключено к Zoom' : 'подключите AI-ментора к Zoom'}
          </p>
        </div>
        {zoomStatus.isConnected && (
          <div className="zoom-status-indicator">
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#34a853' }}>
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
          войдите в систему для подключения к Zoom
        </div>
      ) : !isBackendAvailable ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#dc2626' }}>
          backend недоступен. функции Zoom временно отключены.
        </div>
      ) : !zoomStatus.isConnected ? (
        <div className="zoom-connect-section">
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            для использования функций записи и AI-ментора необходимо подключить Zoom аккаунт
          </p>
          <button 
            className={`zoom-auth-btn ${isConnectingZoom ? 'loading' : ''}`}
            onClick={() => {
              console.log('🖱️ [UI] Connect Zoom button clicked');
              handleConnectZoom();
            }}
            disabled={disabled || isConnectingZoom || !isBackendAvailable}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
              <path d="M22.8 12c0-1.5-.7-2.8-1.8-3.7v-.1c0-1.7-1.4-3.2-3.1-3.2s-3.1 1.4-3.1 3.2c0 .6.2 1.2.5 1.7L12 12.4c-.6-.3-1.3-.4-2-.4-2.2 0-4 1.8-4 4s1.8 4 4 4c.7 0 1.4-.2 2-.4l3.3 2.5c-.3.5-.5 1.1-.5 1.7 0 1.7 1.4 3.2 3.1 3.2s3.1-1.4 3.1-3.2v-.1c1.1-.9 1.8-2.2 1.8-3.7z"/>
            </svg>
            {isConnectingZoom ? 'подключение...' : 'подключить Zoom'}
          </button>
        </div>
      ) : zoomStatus.isConnected && selectedConnectionType === 'auto' ? (
        <div className="zoom-webhook-section">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              fontSize: '14px', 
              color: '#34a853',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                Zoom подключен - автоматическое присоединение {zoomStatus.userEmail && `(${zoomStatus.userEmail})`}
              </div>
              <button
                onClick={() => {
                  console.log('🖱️ [UI] Disconnect Zoom button clicked (auto mode)');
                  handleDisconnectZoom();
                }}
                disabled={isDisconnectingZoom}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #dc3545',
                  color: '#dc3545',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isDisconnectingZoom ? 'default' : 'pointer',
                  opacity: isDisconnectingZoom ? 0.6 : 1
                }}
                title="отключить Zoom аккаунт"
              >
                {isDisconnectingZoom ? 'отключение...' : 'отключить'}
              </button>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#495057'
            }}>
              AI-ментор автоматически присоединится ко всем вашим встречам через webhook.
              <br />Начните встречу в Zoom, и AI подключится автоматически.
            </div>
            
            {sessionData && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e7f5e7',
                border: '1px solid #c3e6c3',
                borderRadius: '6px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2d5a2d' }}>Текущая сессия</h4>
                <div style={{ fontSize: '12px', color: '#2d5a2d' }}>
                  <div>Встреча: {sessionData.meetingId}</div>
                  <div>Статус: {sessionData.status === 'active' ? 'активна' : sessionData.status === 'ended' ? 'завершена' : 'ошибка'}</div>
                  {sessionData.participants && <div>Участники: {sessionData.participants}</div>}
                  {sessionData.startTime && <div>Начало: {new Date(sessionData.startTime).toLocaleString('ru-RU')}</div>}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => setSelectedConnectionType('manual')}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #007bff',
                color: '#007bff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              переключиться на ручное подключение
            </button>
          </div>
        </div>
      ) : (
        <div className="video-integration-input-section">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              fontSize: '14px', 
              color: '#34a853',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                Zoom подключен - ручное подключение {zoomStatus.userEmail && `(${zoomStatus.userEmail})`}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedConnectionType('auto')}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #28a745',
                    color: '#28a745',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="переключиться на автоматическое подключение"
                >
                  авто-режим
                </button>
                <button
                  onClick={() => {
                    console.log('🖱️ [UI] Disconnect Zoom button clicked (manual mode)');
                    handleDisconnectZoom();
                  }}
                  disabled={isDisconnectingZoom}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: isDisconnectingZoom ? 'default' : 'pointer',
                    opacity: isDisconnectingZoom ? 0.6 : 1
                  }}
                  title="отключить Zoom аккаунт"
                >
                  {isDisconnectingZoom ? 'отключение...' : 'отключить'}
                </button>
              </div>
            </div>
          </div>

          <div className="video-integration-input-group">
            <input 
              type="url" 
              className="video-integration-url-input" 
              placeholder={zoomPlaceholder}
              value={meetingUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                console.log('📝 [UI] Meeting URL input changed:', e.target.value);
                setMeetingUrl(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              disabled={disabled}
            />
          </div>

          <div className="video-integration-buttons">
            <button 
              className={`video-integration-connect-btn ${(!zoomStatus.hasValidTokens || isConnectingAI) ? 'disabled' : ''}`}
              onClick={() => {
                console.log('🖱️ [UI] Connect AI button clicked');
                handleConnectAI();
              }}
              disabled={disabled || !zoomStatus.hasValidTokens || !meetingUrl.trim() || isConnectingAI}
              title={!zoomStatus.hasValidTokens ? 'необходимо обновить токены Zoom' : 'подключить AI к встрече'}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              {isConnectingAI ? 'подключение AI...' : 'подключить AI'}
            </button>
            
            <button 
              className={`video-integration-connect-btn ${!zoomStatus.hasValidTokens ? 'disabled' : ''}`}
              onClick={handleJoinMeeting}
              disabled={disabled || !zoomStatus.hasValidTokens || !meetingUrl.trim()}
              title={!zoomStatus.hasValidTokens ? 'необходимо обновить токены Zoom' : 'присоединиться к встрече'}
            >
              <svg className="video-integration-link-icon" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              присоединиться к встрече
            </button>
          </div>
          
          {sessionData && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#e7f5e7',
              border: '1px solid #c3e6c3',
              borderRadius: '6px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2d5a2d' }}>Текущая сессия</h4>
              <div style={{ fontSize: '12px', color: '#2d5a2d' }}>
                <div>Встреча: {sessionData.meetingId}</div>
                <div>Статус: {sessionData.status === 'active' ? 'активна' : sessionData.status === 'ended' ? 'завершена' : 'ошибка'}</div>
                {sessionData.participants && <div>Участники: {sessionData.participants}</div>}
                {sessionData.startTime && <div>Начало: {new Date(sessionData.startTime).toLocaleString('ru-RU')}</div>}
              </div>
            </div>
          )}

          {!zoomStatus.isConnected && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#dc2626'
            }}>
              функции AI недоступны. необходимо подключить Zoom аккаунт.
            </div>
          )}
          
          {zoomStatus.isConnected && !zoomStatus.hasValidTokens && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              backgroundColor: '#fef7e0',
              border: '1px solid #f9c74f',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#b45309'
            }}>
              Токены Zoom истекли. переподключите аккаунт для использования функций записи.
            </div>
          )}
        </div>
      )}
    </div>
  );
};