import React from 'react';

interface EnergyComponentProps {
  energyMark?: number; // 0-10 emotional expression score
  duration?: number; // in minutes for timeline
}

export const EnergyComponent: React.FC<EnergyComponentProps> = ({ 
  energyMark, 
  duration = 12 
}) => {
  const getRecommendation = (mark: number): string => {
    if (mark <= 4) return "Добавьте больше эмоций в ключевые моменты";
    if (mark <= 7) return "Достаточно энергично";
    return "Отличная эмоциональная выразительность";
  };

  const getScoreColor = (score: number): string => {
    if (score >= 7) return '#22c55e';
    if (score >= 4) return '#f59e0b'; 
    return '#ef4444';
  };

  // generate mock energy data for timeline visualization
  const generateEnergyData = (durationMinutes: number): number[] => {
    const dataPoints = Math.max(6, Math.min(12, durationMinutes)); // 6-12 data points
    const data: number[] = [];
    
    for (let i = 0; i < dataPoints; i++) {
      // create realistic energy pattern: start moderate, peak in middle, taper off
      const position = i / (dataPoints - 1); // 0 to 1
      
      let baseEnergy;
      if (position < 0.2) {
        baseEnergy = 6; // moderate start
      } else if (position < 0.6) {
        baseEnergy = 8; // build energy
      } else if (position < 0.8) {
        baseEnergy = 7.5; // maintain
      } else {
        baseEnergy = 6.5; // slight taper
      }
      
      // add some randomness
      const randomVariation = (Math.random() - 0.5) * 2; // ±1
      const energyValue = Math.max(3, Math.min(10, baseEnergy + randomVariation));
      data.push(energyValue);
    }
    
    return data;
  };

  const energyData = generateEnergyData(duration);
  const maxEnergy = Math.max(...energyData);

  if (!energyMark) {
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
          Энергичность
        </h3>
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          padding: '20px'
        }}>
          <p>Анализ энергичности недоступен</p>
        </div>
      </div>
    );
  }

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
        Энергичность
      </h3>

      {/* main energy score */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '32px',
            fontWeight: 700,
            color: getScoreColor(energyMark),
            lineHeight: 1
          }}>
            {energyMark.toFixed(1)}
          </span>
          <span style={{
            fontSize: '16px',
            color: '#6c757d',
            fontWeight: 500
          }}>
            из 10
          </span>
        </div>
      </div>

      {/* energy timeline chart */}
      <div style={{
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#5f6368',
          marginBottom: '12px'
        }}>
          Энергия во времени
        </div>
        
        <div style={{
          height: '120px',
          display: 'flex',
          alignItems: 'end',
          justifyContent: 'space-between',
          gap: '4px',
          padding: '0 8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          position: 'relative'
        }}>
          {energyData.map((value, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${(value / 10) * 100}%`,
                background: 'linear-gradient(180deg, #ff6b35 0%, #f7931e 100%)',
                borderRadius: '2px',
                position: 'relative',
                minHeight: '20px'
              }}
              title={`${Math.round(value * 10) / 10}/10 энергии`}
            >
              {/* highlight peak energy */}
              {value === maxEnergy && (
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  color: '#ff6b35',
                  fontWeight: 600
                }}>
                  пик
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* timeline labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '12px',
          color: '#6c757d',
          padding: '0 8px'
        }}>
          <span>0мин</span>
          <span>{Math.round(duration / 2)}мин</span>
          <span>{duration}мин</span>
        </div>
      </div>

      {/* score display */}
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
          Средняя энергичность
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1a73e8'
        }}>
          {energyMark.toFixed(1)}/10
        </span>
      </div>

      {/* recommendation */}
      <div style={{
        fontSize: '14px',
        color: '#495057',
        lineHeight: 1.5,
        fontStyle: 'italic'
      }}>
        {getRecommendation(energyMark)}
      </div>
    </div>
  );
};