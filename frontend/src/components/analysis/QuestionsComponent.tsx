import React, { useState } from 'react';

interface QuestionsComponentProps {
  questions?: string[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const QuestionsComponent: React.FC<QuestionsComponentProps> = ({
  questions = [],
  isLoading = false,
  hasError = false,
  errorMessage = ''
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const hasData = questions && questions.length > 0;

  const handleCopyQuestion = (question: string, index: number) => {
    navigator.clipboard.writeText(question);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };


  const getQuestionColor = (index: number) => {
    const colors = [
      { bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
      { bg: '#f0fdfa', border: '#a7f3d0', text: '#059669' },
      { bg: '#ecfdf5', border: '#bbf7d0', text: '#047857' },
      { bg: '#fffbeb', border: '#fed7aa', text: '#d97706' }
    ];
    return colors[index % colors.length];
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
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Вопросы для обсуждения
          </h3>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.85rem',
            color: '#6b7280'
          }}>
            {questions.length} {questions.length === 1 ? 'вопрос' : questions.length < 5 ? 'вопроса' : 'вопросов'} на основе вашей презентации
          </p>
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
            Генерация вопросов обрабатывается...
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
            Генерация вопросов недоступна
          </h4>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#dc2626',
            lineHeight: '1.5'
          }}>
            {errorMessage || 'Сервис генерации вопросов испытывает нагрузки. Пожалуйста, попробуйте позже.'}
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
            Вопросы для обсуждения пока недоступны
          </p>
        </div>
      )}

      {/* questions grid */}
      {!isLoading && !hasError && hasData && (
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
        {questions.map((question, index) => {
          const colors = getQuestionColor(index);
          
          return (
            <div
              key={index}
              style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '18px 20px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* decorative element */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: colors.border,
                opacity: 0.3
              }} />
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
                zIndex: 1
              }}>
                {/* question number and icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '32px',
                    height: '32px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: colors.text
                  }}>
                    {index + 1}
                  </div>
                </div>

                {/* question text */}
                <div style={{
                  flex: 1,
                  paddingTop: '2px'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    color: colors.text,
                    fontWeight: '500'
                  }}>
                    {question}
                  </p>
                </div>

                {/* copy button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyQuestion(question, index);
                  }}
                  style={{
                    backgroundColor: copiedIndex === index ? '#10b981' : '#ffffff',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => {
                    if (copiedIndex !== index) {
                      e.currentTarget.style.backgroundColor = colors.border;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (copiedIndex !== index) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  {copiedIndex === index ? '✓' : '📋'}
                </button>
              </div>

              {/* hover indicator */}
            </div>
          );
        })}
        </div>
      )}

      {/* usage tip */}
      {!isLoading && !hasError && hasData && (
        <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.8rem',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Используйте эти вопросы для получения обратной связи от аудитории или подготовки к Q&A сессии
        </p>
        </div>
      )}
    </div>
  );
};