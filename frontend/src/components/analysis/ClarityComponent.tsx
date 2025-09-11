import React from 'react';

interface ClarityComponentProps {
  unclarityMoments?: string[];
  avgSentenceLength?: number;
  repeatedWords?: any[]; // backend returns empty array, keeping flexible for future
}

export const ClarityComponent: React.FC<ClarityComponentProps> = ({ 
  unclarityMoments = [], 
  avgSentenceLength,
  repeatedWords = []
}) => {
  const getSentenceLengthColor = (length: number): string => {
    if (length < 15) return '#22c55e'; // green - excellent
    if (length <= 25) return '#f59e0b'; // yellow - good
    return '#ef4444'; // red - too complex
  };

  const getSentenceLengthCategory = (length: number): string => {
    if (length < 15) return "отлично";
    if (length <= 25) return "хорошо";
    return "сложно";
  };

  // Backend currently returns empty array for filler_words
  // If data structure changes in future, this will adapt
  const repeatedWordsData = repeatedWords && repeatedWords.length > 0 
    ? repeatedWords.slice(0, 5).map(item => {
        // Handle both old format {word: string, count: number} and new format (strings)
        if (typeof item === 'string') {
          return { word: item, count: 1 }; // fallback for string format
        }
        return item; // assume it's {word, count} object
      })
    : [];

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
        Ясность
      </h3>

      {/* average sentence length */}
      {avgSentenceLength && (
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{
              fontSize: '14px',
              color: '#5f6368'
            }}>
              Средняя длина предложения
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: 600,
                color: getSentenceLengthColor(avgSentenceLength)
              }}>
                {Math.round(avgSentenceLength)} слов
              </span>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                backgroundColor: getSentenceLengthColor(avgSentenceLength) + '20',
                color: getSentenceLengthColor(avgSentenceLength),
                borderRadius: '12px',
                fontWeight: 500
              }}>
                {getSentenceLengthCategory(avgSentenceLength)}
              </span>
            </div>
          </div>
          
          {/* sentence length guide */}
          <div style={{
            fontSize: '12px',
            color: '#6c757d',
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            lineHeight: 1.4
          }}>
            Совет: Короткие предложения (до 15 слов) легче воспринимать
          </div>
        </div>
      )}

      {/* unclarity moments */}
      {unclarityMoments.length > 0 && (
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#5f6368',
            marginBottom: '12px'
          }}>
            Что было непонятно ({unclarityMoments.length})
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {unclarityMoments.slice(0, 3).map((moment, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff3cd',
                  borderLeft: '4px solid #ffc107',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: 1.4
                }}
              >
                "{moment}"
              </div>
            ))}
            {unclarityMoments.length > 3 && (
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                и ещё {unclarityMoments.length - 3} моментов
              </div>
            )}
          </div>
        </div>
      )}

      {/* repeated words */}
      {repeatedWordsData.length > 0 && (
        <div>
          <div style={{
            fontSize: '14px',
            color: '#5f6368',
            marginBottom: '12px'
          }}>
            Часто повторяющиеся слова
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px'
          }}>
            {repeatedWordsData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '16px',
                  fontSize: '13px'
                }}
              >
                <span style={{
                  color: '#1976d2',
                  fontWeight: 500
                }}>
                  "{item.word}"
                </span>
                <span style={{
                  color: '#1565c0',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {item.count}x
                </span>
              </div>
            ))}
          </div>
          
          {/* improvement tip */}
          <div style={{
            fontSize: '12px',
            color: '#6c757d',
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            marginTop: '12px',
            lineHeight: 1.4
          }}>
            Совет: Варьируйте речь, заменяя повторяющиеся слова синонимами
          </div>
        </div>
      )}

      {/* empty state */}
      {(!unclarityMoments || unclarityMoments.length === 0) && 
       (!repeatedWordsData || repeatedWordsData.length === 0) && 
       !avgSentenceLength && (
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          padding: '20px'
        }}>
          <p>Анализ ясности пока недоступен</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Данные появятся после завершения обработки ML сервисом
          </p>
        </div>
      )}
    </div>
  );
};