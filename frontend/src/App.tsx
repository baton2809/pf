import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SideMenu } from './components/SideMenu';
import { NewTrainingPage } from './pages/NewTrainingPage';
import { RecordingInterface } from './components/RecordingInterface';
import { History } from './pages/History';
import { SessionDetails } from './pages/SessionDetails';
import { Analytics } from './pages/Analytics';
import { Leaderboard } from './pages/Leaderboard';
import { Settings } from './pages/Settings';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <SideMenu />
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
    </Router>
  );
}

export default App;