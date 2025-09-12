import React from 'react';

interface PresentationFeedbackProps {
  pros?: string[];
  cons?: string[];
  recommendations?: string[];
  feedback?: string;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const PresentationFeedbackComponent: React.FC<PresentationFeedbackProps> = ({
  pros = [],
  cons = [],
  recommendations = [],
  feedback = '',
  isLoading = false,
  hasError = false,
  errorMessage = ''
}) => {
  const hasData = pros.length > 0 || cons.length > 0 || recommendations.length > 0 || feedback;

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
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Анализ презентации
        </h3>
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
            borderTop: '3px solid #8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <p style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '500'
          }}>
            Анализ презентации обрабатывается...
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
            Анализ презентации недоступен
          </h4>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#dc2626',
            lineHeight: '1.5'
          }}>
            {errorMessage || 'Сервис анализа испытывает нагрузки. Пожалуйста, попробуйте позже.'}
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
            Анализ презентации пока недоступен
          </p>
        </div>
      )}

      {/* data content */}
      {!isLoading && !hasError && hasData && (
        <>
          {/* overall feedback */}
      {feedback && (
        <div style={{
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)'
          }} />
          <p style={{
            color: '#ffffff',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            margin: 0,
            position: 'relative',
            zIndex: 1
          }}>
            {feedback}
          </p>
        </div>
      )}

      {/* grid layout for pros, cons, recommendations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {/* pros section */}
        {pros.length > 0 && (
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: '600',
                color: '#065f46'
              }}>
                Сильные стороны
              </h4>
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              listStyle: 'none'
            }}>
              {pros.map((pro, index) => (
                <li key={index} style={{
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  color: '#047857',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{
                    content: '""',
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    marginRight: '10px',
                    marginTop: '7px',
                    flexShrink: 0
                  }} />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* cons section */}
        {cons.length > 0 && (
          <div style={{
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #fecaca'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: '600',
                color: '#991b1b'
              }}>
                Области для улучшения
              </h4>
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              listStyle: 'none'
            }}>
              {cons.map((con, index) => (
                <li key={index} style={{
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  color: '#dc2626',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span style={{
                    content: '""',
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    marginRight: '10px',
                    marginTop: '7px',
                    flexShrink: 0
                  }} />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* recommendations section */}
        {recommendations.length > 0 && (
          <div style={{
            backgroundColor: '#fefce8',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #fde047',
            gridColumn: pros.length > 0 || cons.length > 0 ? 'span 2' : 'span 1'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: '600',
                color: '#713f12'
              }}>
                Рекомендации
              </h4>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: recommendations.length > 2 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
              gap: '12px'
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  color: '#854d0e',
                  lineHeight: '1.5',
                  border: '1px solid #fde047',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* progress indicator */}
      <div style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          gap: '24px',
          fontSize: '0.85rem',
          color: '#6b7280'
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {pros.length} сильных сторон
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {cons.length} областей роста
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {recommendations.length} рекомендаций
          </span>
        </div>
      </div>
        </>
      )}
    </div>
  );
};