import React from 'react';

interface PitchEvaluationProps {
  marks?: {
    structure?: number;
    clarity?: number;
    specificity?: number;
    persuasiveness?: number;
  };
  missing_blocks?: string[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const PitchEvaluationComponent: React.FC<PitchEvaluationProps> = ({
  marks = {},
  missing_blocks = [],
  isLoading = false,
  hasError = false,
  errorMessage = ''
}) => {
  const { structure = 0, clarity = 0, specificity = 0, persuasiveness = 0 } = marks;
  
  const hasData = structure || clarity || specificity || persuasiveness;

  const criteria = [
    {
      key: 'structure',
      name: 'Структура',
      value: structure,
      icon: null,
      color: '#8b5cf6',
      bgColor: '#faf5ff',
      borderColor: '#e9d5ff',
      description: 'Логичность построения презентации'
    },
    {
      key: 'clarity',
      name: 'Ясность',
      value: clarity,
      icon: null,
      color: '#06b6d4',
      bgColor: '#f0fdfa',
      borderColor: '#a7f3d0',
      description: 'Понятность изложения материала'
    },
    {
      key: 'specificity',
      name: 'Конкретность',
      value: specificity,
      icon: null,
      color: '#10b981',
      bgColor: '#ecfdf5',
      borderColor: '#bbf7d0',
      description: 'Детализация и конкретные примеры'
    },
    {
      key: 'persuasiveness',
      name: 'Убедительность',
      value: persuasiveness,
      icon: null,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fed7aa',
      description: 'Сила воздействия на аудиторию'
    }
  ];

  const overallScore = Math.round((structure + clarity + specificity + persuasiveness) / 4);
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#f59e0b'; // yellow
    if (score >= 4) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Отлично';
    if (score >= 6) return 'Хорошо';
    if (score >= 4) return 'Средне';
    return 'Требует улучшения';
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(0, 0, 0, 0.05)'
    }}>
      {/* header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
            <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Оценка презентации
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.85rem',
              color: '#6b7280'
            }}>
              Анализ ключевых характеристик вашего питча
            </p>
          </div>
        </div>

        {/* overall score badge */}
        <div style={{
          backgroundColor: getScoreColor(overallScore),
          color: '#ffffff',
          borderRadius: '12px',
          padding: '8px 16px',
          textAlign: 'center',
          minWidth: '80px'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: '1' }}>
            {overallScore}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
            {getScoreLabel(overallScore)}
          </div>
        </div>
      </div>

      {/* loading state */}
      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <p style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '500'
          }}>
            Анализ питча обрабатывается...
          </p>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '0.85rem',
            opacity: 0.7
          }}>
            Это может занять несколько секунд
          </p>
        </div>
      )}

      {/* error state */}
      {hasError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#991b1b'
          }}>
            Анализ питча недоступен
          </h4>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#dc2626',
            lineHeight: '1.5'
          }}>
            {errorMessage || 'Сервис анализа питча испытывает нагрузки. Пожалуйста, попробуйте позже.'}
          </p>
        </div>
      )}

      {/* no data state (when not loading and no error) */}
      {!isLoading && !hasError && !hasData && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }}>
          <p style={{
            margin: 0,
            fontSize: '1rem'
          }}>
            Оценка питча пока недоступна
          </p>
        </div>
      )}

      {/* criteria grid */}
      {!isLoading && !hasError && hasData && (
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {criteria.map((criterion) => {
          const percentage = (criterion.value / 10) * 100;
          
          return (
            <div
              key={criterion.key}
              style={{
                backgroundColor: criterion.bgColor,
                border: `1px solid ${criterion.borderColor}`,
                borderRadius: '12px',
                padding: '18px',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    {criterion.name}
                  </span>
                </div>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: criterion.color
                }}>
                  {criterion.value}
                </span>
              </div>

              {/* progress bar */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                height: '6px',
                marginBottom: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: criterion.color,
                  height: '100%',
                  width: `${percentage}%`,
                  borderRadius: '6px',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                {criterion.description}
              </p>
            </div>
          );
        })}
        </div>
      )}

      {/* missing blocks section */}
      {!isLoading && !hasError && hasData && missing_blocks.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: '#991b1b'
            }}>
              Отсутствующие блоки
            </h4>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {missing_blocks.map((block, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  border: '1px solid #fecaca'
                }}
              >
                {block}
              </span>
            ))}
          </div>
          <p style={{
            margin: '12px 0 0 0',
            fontSize: '0.85rem',
            color: '#7f1d1d',
            lineHeight: '1.4'
          }}>
            Добавьте эти элементы для улучшения структуры презентации
          </p>
        </div>
      )}

      {/* score breakdown */}
      {!isLoading && !hasError && hasData && (
        <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        fontSize: '0.85rem',
        color: '#6b7280'
      }}>
        <span>Средний балл: <strong>{overallScore.toFixed(1)}/10</strong></span>
        <span>•</span>
        <span>Критериев оценено: <strong>{criteria.filter(c => c.value > 0).length}/4</strong></span>
        {missing_blocks.length > 0 && (
          <>
            <span>•</span>
            <span>Пропущено блоков: <strong>{missing_blocks.length}</strong></span>
          </>
        )}
        </div>
      )}
    </div>
  );
};