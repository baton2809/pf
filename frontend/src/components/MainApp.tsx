import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar, NavigationSection } from './Sidebar';
import { NewSession } from './NewSession';
import { SessionHistory } from './SessionHistory';
import { Leaderboard } from './Leaderboard';
import { Settings } from './Settings';
import { Analytics } from './Analytics';
import { RecordingInterface } from './RecordingInterface';
import { Notification } from './Notification';
import { useNotification } from '../hooks/useNotification';

export const MainApp: React.FC = () => {
  // const { isBackendAvailable } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [lastSessionResult, setLastSessionResult] = useState<any>(null);
  
  // determine active section from URL
  const getActiveSectionFromPath = (path: string): NavigationSection => {
    if (path.includes('/history')) return 'history';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/leaderboard')) return 'leaderboard';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/interview')) return 'new-session';
    return 'new-session';
  };
  
  const activeSection = getActiveSectionFromPath(location.pathname);

  const handleSectionChange = (section: NavigationSection) => {
    switch (section) {
      case 'new-session':
        navigate('/');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'leaderboard':
        navigate('/leaderboard');
        break;
      case 'settings':
      case 'settings-profile':
        navigate('/settings/profile');
        break;
      case 'settings-integrations':
        navigate('/settings/integrations');
        break;
    }
  };
  
  const handleStartInterview = (sessionType?: string) => {
    navigate('/interview', { state: { sessionType } });
  };
  
  const handleEndSession = () => {
    navigate('/');
  };
  
  const handleGoToQuestions = () => {
    // for now, just go back to main
    navigate('/');
    showNotification('Переход к вопросам...', 'info');
  };

  return (
    <>
      <Header />
      <div className="app-layout">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          isCollapsed={isSidebarCollapsed}
          onMouseEnter={() => setIsSidebarCollapsed(false)}
          onMouseLeave={() => setIsSidebarCollapsed(true)}
        />
        
        <div className="main-content">
          <div className="container">
            <Routes>
              <Route path="/" element={
                <NewSession 
                  lastSessionResult={lastSessionResult}
                  onStartSession={(data) => {
                    handleStartInterview(data.type as string);
                  }} 
                />
              } />
              <Route path="/interview" element={
                <RecordingInterface
                  sessionType={location.state?.sessionType || 'presentation'}
                  onGoToQuestions={handleGoToQuestions}
                  onEndSession={handleEndSession}
                  onRecordingStart={() => {
                    console.log('Recording started');
                  }}
                  onRecordingComplete={(result) => {
                    console.log('Recording completed:', result);
                    const sessionResult = {
                      sessionId: result.sessionId,
                      audioBlob: result.audioBlob,
                      mlResults: result.mlResults
                    };
                    setLastSessionResult(sessionResult);
                    console.log('Set lastSessionResult:', sessionResult);
                    // Navigate to history page where SessionHistory will handle showing details
                    navigate('/history');
                  }}
                />
              } />
              <Route path="/history" element={<SessionHistory lastSessionResult={lastSessionResult} />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/settings/profile" element={<Settings initialSection="profile" />} />
              <Route path="/settings/integrations" element={<Settings initialSection="integrations" />} />
              <Route path="/settings" element={<Settings initialSection="profile" />} />
            </Routes>
          </div>
        </div>
      </div>

      <Notification 
        message={notification.message}
        type={notification.type}
        show={notification.show}
        onHide={hideNotification}
      />
    </>
  );
};