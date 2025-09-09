import React, { useState } from 'react';
import { PresentationAnalysis as IPresentationAnalysis } from '../data/mockData';

interface PresentationAnalysisProps {
  analysis: IPresentationAnalysis;
}

export const PresentationAnalysis: React.FC<PresentationAnalysisProps> = ({ analysis }) => {
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2d7d47';
    if (score >= 60) return '#fbbc05';
    return '#ea4335';
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const ScoreCircle = ({ score, label, size = 60 }: { score: number; label: string; size?: number }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: getScoreColor(score),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.3}px`,
        fontWeight: '600',
        margin: '0 auto 8px'
      }}>
        {score}
      </div>
      <div style={{ fontSize: '12px', color: '#5f6368' }}>
        {label}
      </div>
    </div>
  );

  return (
    <div className="presentation-analysis">
      {/* Общая информация */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Информация о презентации</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Файл</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{analysis.fileName}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Размер</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{formatFileSize(analysis.fileSize)}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Количество слайдов</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{analysis.slideCount}</div>
          </div>
        </div>
      </div>

      {/* Общие оценки */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Общие оценки</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <ScoreCircle score={analysis.overallDesignScore} label="Дизайн" size={80} />
          <ScoreCircle score={analysis.overallContentScore} label="Содержание" size={80} />
          <ScoreCircle score={analysis.overallReadabilityScore} label="Читаемость" size={80} />
        </div>
      </div>

      {/* Общие рекомендации */}
      {analysis.generalRecommendations.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Общие рекомендации</h3>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
            {analysis.generalRecommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Структурные проблемы */}
      {analysis.structuralIssues.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', backgroundColor: '#fff8f0', border: '1px solid #ffeaa7' }}>
          <h3 style={{ marginBottom: '16px', color: '#856404' }}>Структурные проблемы</h3>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
            {analysis.structuralIssues.map((issue, index) => (
              <li key={index} style={{ marginBottom: '8px', fontSize: '14px', color: '#856404' }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Анализ по слайдам */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Анализ слайдов</h3>
        
        {/* Сетка слайдов */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          {analysis.slides.map((slide) => (
            <div
              key={slide.slideNumber}
              onClick={() => setSelectedSlide(
                selectedSlide === slide.slideNumber ? null : slide.slideNumber
              )}
              style={{
                border: selectedSlide === slide.slideNumber ? '2px solid #2d7d47' : '1px solid #e8eaed',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                backgroundColor: selectedSlide === slide.slideNumber ? '#f8fff8' : 'white',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Слайд {slide.slideNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5f6368' }}>
                    {slide.title}
                  </div>
                </div>
                <button style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: '#2d7d47',
                  cursor: 'pointer'
                }}>
                  {selectedSlide === slide.slideNumber ? 'Скрыть' : 'Подробнее'}
                </button>
              </div>

              {/* Мини-оценки */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <ScoreCircle score={slide.designScore} label="Дизайн" size={40} />
                <ScoreCircle score={slide.contentScore} label="Контент" size={40} />
                <ScoreCircle score={slide.readabilityScore} label="Читаемость" size={40} />
              </div>

              {/* Превью содержания */}
              <div style={{
                fontSize: '12px',
                color: '#5f6368',
                backgroundColor: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {slide.textContent.substring(0, 100)}
                {slide.textContent.length > 100 && '...'}
              </div>
            </div>
          ))}
        </div>

        {/* Детальный анализ выбранного слайда */}
        {selectedSlide && (
          <div style={{
            border: '1px solid #e8eaed',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#fafbfc'
          }}>
            {(() => {
              const slide = analysis.slides.find(s => s.slideNumber === selectedSlide);
              if (!slide) return null;

              return (
                <div>
                  <h4 style={{ marginBottom: '16px' }}>
                    Детальный анализ: Слайд {slide.slideNumber} - {slide.title}
                  </h4>

                  {/* Полное содержание */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', marginBottom: '8px', color: '#2d7d47' }}>Содержание слайда:</h5>
                    <div style={{
                      fontSize: '14px',
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #e8eaed',
                      whiteSpace: 'pre-line'
                    }}>
                      {slide.textContent}
                    </div>
                  </div>

                  {/* Проблемы */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Проблемы дизайна */}
                    {slide.issues.design.length > 0 && (
                      <div>
                        <h5 style={{ fontSize: '14px', marginBottom: '8px', color: '#ea4335' }}>Проблемы дизайна:</h5>
                        <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
                          {slide.issues.design.map((issue, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Проблемы контента */}
                    {slide.issues.content.length > 0 && (
                      <div>
                        <h5 style={{ fontSize: '14px', marginBottom: '8px', color: '#ea4335' }}>Проблемы контента:</h5>
                        <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
                          {slide.issues.content.map((issue, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Проблемы читаемости */}
                    {slide.issues.readability.length > 0 && (
                      <div>
                        <h5 style={{ fontSize: '14px', marginBottom: '8px', color: '#ea4335' }}>Проблемы читаемости:</h5>
                        <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
                          {slide.issues.readability.map((issue, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Рекомендации */}
                  {slide.suggestions.length > 0 && (
                    <div>
                      <h5 style={{ fontSize: '14px', marginBottom: '8px', color: '#2d7d47' }}>Рекомендации:</h5>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
                        {slide.suggestions.map((suggestion, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};