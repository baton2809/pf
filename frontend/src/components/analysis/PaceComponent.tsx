import React from 'react';

interface PaceComponentProps {
  paceRate?: number; // words per minute
  paceMark?: number; // 0-10 score
}

export const PaceComponent: React.FC<PaceComponentProps> = ({ 
  paceRate, 
  paceMark 
}) => {
  const getScoreColor = (rate: number): string => {
    if (rate >= 120 && rate <= 180) return '#22c55e'; // green - ideal
    return '#ef4444'; // red - too slow or too fast
  };

  const getRecommendation = (mark: number): string => {
    if (mark <= 3) return "Ваш темп звучит расслабленно и уверенно";
    if (mark <= 7) return "Хороший темп для понимания";
    return "Попробуйте говорить чуть медленнее";
  };

  const getTempoCategory = (rate: number): { category: string; color: string } => {
    if (rate < 120) return { category: "медленно", color: "#ef4444" };
    if (rate <= 180) return { category: "идеально", color: "#22c55e" };
    return { category: "быстро", color: "#ef4444" };
  };

  if (!paceRate || !paceMark) {
    return (
      <div className="card" style={{
        padding: '20px 24px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#212529',
          marginBottom: '16px'
        }}>
          Темп речи
        </h3>
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          padding: '20px'
        }}>
          <p>Анализ темпа речи недоступен</p>
        </div>
      </div>
    );
  }

  const tempoInfo = getTempoCategory(paceRate);

  return (
    <div className="card" style={{
      padding: '20px 24px',
      marginBottom: '20px'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#212529',
        marginBottom: '20px'
      }}>
        Темп речи
      </h3>

      {/* main pace rate display */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '32px',
            fontWeight: 700,
            color: getScoreColor(paceRate),
            lineHeight: 1
          }}>
            {Math.round(paceRate)}
          </span>
          <span style={{
            fontSize: '16px',
            color: '#6c757d',
            fontWeight: 500
          }}>
            слов/минуту
          </span>
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          backgroundColor: tempoInfo.color + '20',
          color: tempoInfo.color,
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          {tempoInfo.category}
        </div>
      </div>

      {/* tempo scale visualization */}
      <div style={{
        marginBottom: '20px',
        position: 'relative'
      }}>
        <div style={{
          height: '8px',
          background: 'linear-gradient(90deg, #ef4444 0%, #ef4444 30%, #22c55e 30%, #22c55e 70%, #ef4444 70%, #ef4444 100%)',
          borderRadius: '4px',
          position: 'relative'
        }}>
          {/* current pace indicator */}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: `${Math.max(0, Math.min(100, ((paceRate - 80) / (200 - 80)) * 100))}%`,
            transform: 'translateX(-50%)',
            width: '16px',
            height: '16px',
            backgroundColor: '#1a73e8',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </div>
        
        {/* scale labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <span>80</span>
          <span>120</span>
          <span>180</span>
          <span>200</span>
        </div>
      </div>

      {/* score and recommendation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px'
      }}>
        <span style={{
          fontSize: '14px',
          color: '#5f6368'
        }}>
          Оценка темпа
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1a73e8'
        }}>
          {paceMark.toFixed(1)}/10
        </span>
      </div>

      {/* recommendation text */}
      <div style={{
        fontSize: '14px',
        color: '#495057',
        lineHeight: 1.5,
        fontStyle: 'italic'
      }}>
        {getRecommendation(paceMark)}
      </div>
    </div>
  );
};