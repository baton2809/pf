import React from 'react';
import { AnalysisModalProps } from '../types/recording';

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  isVisible, 
  progress,
  onClose 
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px'
        }}>
          Анализируем запись
        </div>
        
        <div style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '32px',
          lineHeight: '1.5'
        }}>
          Извлекаем ключевые моменты, считаем метрики и готовим отчёт
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
            transition: 'width 0.3s ease',
            borderRadius: '4px'
          }} />
        </div>
        
        <div style={{
          fontSize: '14px',
          color: '#888'
        }}>
          Это займёт несколько секунд
        </div>
      </div>
    </div>
  );
};