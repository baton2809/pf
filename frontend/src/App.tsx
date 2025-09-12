import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import AuthCallback from './pages/AuthCallback';
import { AppLayout } from './components/AppLayout';
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
  return (
    <Router>
      <Routes>
        {/* public routes */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* protected routes with AppLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout>
              <Navigate to="/new-training" replace />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/new-training" element={
          <ProtectedRoute>
            <AppLayout>
              <NewTrainingPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/training/:trainingId/record" element={
          <ProtectedRoute>
            <AppLayout>
              <RecordingInterface />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppLayout>
              <History />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/session/:sessionId" element={
          <ProtectedRoute>
            <AppLayout>
              <SessionDetails />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/sessions/:sessionId" element={
          <ProtectedRoute>
            <AppLayout>
              <SessionDetails />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <AppLayout>
              <Leaderboard />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
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