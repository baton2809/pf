import React from 'react';

interface ConfidenceComponentProps {
  hesitantPhrases?: string[];
  fillerWords?: any[]; // backend returns empty array, keeping flexible for future
  totalWords?: number; // for calculating percentages
}

export const ConfidenceComponent: React.FC<ConfidenceComponentProps> = ({ 
  hesitantPhrases = [], 
  fillerWords = [],
  totalWords = 500 // default estimate
}) => {
  const getFillerWordsData = (): Array<{word: string, count: number, percentage: number}> => {
    if (fillerWords && fillerWords.length > 0) {
      // log for debugging what data we receive
      console.log('[ConfidenceComponent] Filler words data:', fillerWords);
      
      return fillerWords.slice(0, 3).map(item => {
        // Handle both old format {word: string, count: number} and new format (strings)
        if (typeof item === 'string') {
          return { word: item, count: 1, percentage: (1 / totalWords) * 100 };
        }
        // assume it's {word, count} object
        return {
          word: item.word || String(item),
          count: item.count || 1,
          percentage: ((item.count || 1) / totalWords) * 100
        };
      });
    }
    return [];
  };

  const getHesitantPhrasesData = (): Array<{phrase: string, timestamp?: string}> => {
    if (hesitantPhrases && hesitantPhrases.length > 0) {
      return hesitantPhrases.slice(0, 4).map(phrase => ({
        phrase,
        timestamp: undefined // could be added later
      }));
    }
    return [];
  };

  const fillerWordsData = getFillerWordsData();
  const hesitantPhrasesData = getHesitantPhrasesData();
  
  const totalFillerPercentage = fillerWordsData.reduce((sum, item) => sum + item.percentage, 0);

  const getFillerPercentageColor = (percentage: number): string => {
    if (percentage < 3) return '#22c55e';
    if (percentage <= 7) return '#f59e0b'; 
    return '#ef4444';
  };

  const getConfidenceLevel = (): { level: string; color: string; description: string } => {
    // improved logic for confidence calculation
    // consider both filler words and hesitant phrases
    const hasSignificantFillers = totalFillerPercentage > 5; // more than 5% is significant
    const hasModerateFillers = totalFillerPercentage > 2; // 2-5% is moderate
    const hasManyHesitantPhrases = hesitantPhrasesData.length > 3;
    const hasSomeHesitantPhrases = hesitantPhrasesData.length > 1;
    
    // high confidence: low fillers AND few hesitant phrases
    if (!hasModerateFillers && !hasSomeHesitantPhrases) {
      return {
        level: "Высокая",
        color: "#22c55e",
        description: "Речь звучит уверенно и убедительно"
      };
    }
    // low confidence: significant fillers OR many hesitant phrases
    else if (hasSignificantFillers || hasManyHesitantPhrases) {
      return {
        level: "Низкая",
        color: "#ef4444",
        description: "Заметны частые проявления неуверенности"
      };
    }
    // medium confidence: moderate issues
    else {
      return {
        level: "Средняя",
        color: "#f59e0b",
        description: "Есть некоторые моменты неуверенности"
      };
    }
  };

  const confidenceInfo = getConfidenceLevel();

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
        Уверенность
      </h3>

      {/* confidence level indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: confidenceInfo.color + '10',
        borderLeft: `4px solid ${confidenceInfo.color}`,
        borderRadius: '0 6px 6px 0'
      }}>
        <div>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: confidenceInfo.color,
            marginBottom: '4px'
          }}>
            {confidenceInfo.level} уверенность
          </div>
          <div style={{
            fontSize: '13px',
            color: '#495057'
          }}>
            {confidenceInfo.description}
          </div>
        </div>
      </div>

      {/* filler words analysis */}
      {fillerWordsData.length > 0 && (
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#5f6368',
            marginBottom: '12px'
          }}>
            Слова-филлеры
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '12px'
          }}>
            {fillerWordsData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}
              >
                <span style={{
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  "{item.word}"
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: '#6c757d'
                  }}>
                    {item.count} раз
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: getFillerPercentageColor(item.percentage),
                    minWidth: '35px',
                    textAlign: 'right'
                  }}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* total filler percentage */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: getFillerPercentageColor(totalFillerPercentage) + '15',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            <span style={{ color: '#495057' }}>
              Общий процент от речи
            </span>
            <span style={{
              color: getFillerPercentageColor(totalFillerPercentage),
              fontWeight: 600
            }}>
              {totalFillerPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* hesitant phrases */}
      {hesitantPhrasesData.length > 0 && (
        <div style={{
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#5f6368',
            marginBottom: '12px'
          }}>
            Неуверенные фразы ({hesitantPhrasesData.length})
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {hesitantPhrasesData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#fff8e1',
                  borderLeft: '3px solid #ffa726',
                  borderRadius: '0 4px 4px 0'
                }}
              >
                {item.timestamp && (
                  <span style={{
                    fontSize: '12px',
                    color: '#ff8f00',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    fontWeight: 500,
                    minWidth: '35px'
                  }}>
                    {item.timestamp}
                  </span>
                )}
                <span style={{
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: 1.4,
                  fontStyle: 'italic'
                }}>
                  "{item.phrase}"
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* improvement tip */}
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        lineHeight: 1.4
      }}>
        Совет: Делайте паузы вместо слов-филлеров, говорите утвердительно
      </div>

      {/* empty state */}
      {hesitantPhrasesData.length === 0 && fillerWordsData.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          padding: '20px'
        }}>
          <p>Анализ уверенности пока недоступен</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Данные появятся после завершения обработки ML сервисом
          </p>
        </div>
      )}
    </div>
  );
};