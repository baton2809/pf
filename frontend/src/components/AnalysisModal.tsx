import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AnalysisModalProps {
  isOpen: boolean;
  sessionId: string;
  onComplete?: (sessionId: string) => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  sessionId,
  onComplete
}) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    // show upload progress animation and redirect to session details
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // redirect to session details after upload animation
          setTimeout(() => {
            if (onComplete) {
              onComplete(sessionId);
            } else {
              navigate(`/sessions/${sessionId}`);
            }
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => {
      clearInterval(progressInterval);
    };
  }, [isOpen, sessionId, navigate, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="analysis-modal">
        <div className="analysis-content">
          <div className="analysis-icon">
            {progress >= 100 ? '[OK]' : '[UPLOAD]'}
          </div>
          
          <h2>
            {progress >= 100 ? 'Загрузка завершена!' : 'Загружаем запись'}
          </h2>
          
          <p className="analysis-description">
            {progress >= 100 
              ? 'Переходим к анализу результатов...' 
              : 'Сохраняем вашу запись и начинаем анализ'}
          </p>
          
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">{progress}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};