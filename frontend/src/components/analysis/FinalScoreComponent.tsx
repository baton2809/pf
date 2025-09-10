import React from 'react';

interface FinalScoreComponentProps {
  overallScore: number; // 0-100 calculated score
  pitchMarks?: {
    structure: number;
    clarity: number;
    specificity: number;
    persuasiveness: number;
  };
  isLoading?: boolean;
}

export const FinalScoreComponent: React.FC<FinalScoreComponentProps> = ({ 
  overallScore, 
  pitchMarks,
  isLoading = false
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#ff8f00';
    return '#ef4444';
  };

  const getScoreCategory = (score: number): string => {
    if (score >= 90) return "Превосходно";
    if (score >= 80) return "Отлично";
    if (score >= 70) return "Хорошо";
    if (score >= 60) return "Удовлетворительно";
    if (score >= 40) return "Требует улучшений";
    return "Много работы";
  };

  const getScoreRecommendation = (score: number): string => {
    if (score >= 80) return "Великолепная презентация! Продолжайте в том же духе.";
    if (score >= 60) return "Хорошая работа! Есть области для развития.";
    if (score >= 40) return "Неплохое начало. Сосредоточьтесь на ключевых улучшениях.";
    return "Есть потенциал для значительного роста. Практикуйтесь чаще.";
  };

  if (isLoading) {
    return (
      <div className="card" style={{
        padding: '24px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#212529',
          marginBottom: '16px'
        }}>
          Финальная оценка
        </h3>
        <div style={{ color: '#6c757d' }}>
          Подготавливаем итоговые результаты...
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      padding: '24px',
      marginBottom: '20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
      border: `2px solid ${getScoreColor(overallScore)}20`
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#212529',
        marginBottom: '24px'
      }}>
        Финальная оценка
      </h3>

      {/* main score circle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `conic-gradient(${getScoreColor(overallScore)} 0deg, ${getScoreColor(overallScore)} ${(overallScore / 100) * 360}deg, #e9ecef ${(overallScore / 100) * 360}deg)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '24px',
              fontWeight: 700,
              color: getScoreColor(overallScore),
              lineHeight: 1
            }}>
              {Math.round(overallScore)}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#6c757d',
              fontWeight: 500
            }}>
              из 100
            </span>
          </div>
        </div>
      </div>

      {/* score category and description */}
      <div style={{
        marginBottom: '24px'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 600,
          color: getScoreColor(overallScore),
          marginBottom: '8px'
        }}>
          {getScoreCategory(overallScore)}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#495057',
          lineHeight: 1.5,
          maxWidth: '300px',
          margin: '0 auto'
        }}>
          {getScoreRecommendation(overallScore)}
        </div>
      </div>

      {/* detailed breakdown */}
      {pitchMarks && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Структура', value: pitchMarks.structure, key: 'structure' },
            { label: 'Ясность', value: pitchMarks.clarity, key: 'clarity' },
            { label: 'Конкретность', value: pitchMarks.specificity, key: 'specificity' },
            { label: 'Уверенность', value: pitchMarks.persuasiveness, key: 'persuasiveness' }
          ].map((item) => (
            <div
              key={item.key}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}
            >
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '4px'
              }}>
                {item.label}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(item.value / 10) * 100}%`,
                    height: '100%',
                    backgroundColor: getScoreColor(item.value * 10),
                    borderRadius: '2px'
                  }} />
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#495057',
                  minWidth: '24px'
                }}>
                  {item.value.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* next steps hint */}
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        fontStyle: 'italic'
      }}>
        Подробный анализ и рекомендации смотрите в компонентах выше
      </div>
    </div>
  );
};