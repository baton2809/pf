import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import AuthCallback from './pages/AuthCallback';
import { SideMenu } from './components/SideMenu';
import { NewTrainingPage } from './pages/NewTrainingPage';
import { RecordingInterface } from './components/RecordingInterface';
import { History } from './pages/History';
import { SessionDetails } from './pages/SessionDetails';
import { Analytics } from './pages/Analytics';
import { Leaderboard } from './pages/Leaderboard';
import { Settings } from './pages/Settings';
import './styles/globals.css';

// protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
};

// main app content
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* AuthCallback must be BEFORE ProtectedRoute to avoid being caught by /* */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-container">
              {isAuthenticated && <SideMenu />}
              <div className="main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/new-training" replace />} />
                  <Route path="/new-training" element={<NewTrainingPage />} />
                  <Route path="/training/:trainingId/record" element={<RecordingInterface />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/session/:sessionId" element={<SessionDetails />} />
                  <Route path="/sessions/:sessionId" element={<SessionDetails />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;