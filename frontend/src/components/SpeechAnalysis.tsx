import React from 'react';
import { SpeechAnalysis as ISpeechAnalysis, PresentationAnalysis as IPresentationAnalysis } from '../data/mockData';
import { PresentationAnalysis } from './PresentationAnalysis';

interface SpeechAnalysisProps {
  speechAnalysis: ISpeechAnalysis;
  presentationAnalysis?: IPresentationAnalysis;
}

export const SpeechAnalysis: React.FC<SpeechAnalysisProps> = ({ speechAnalysis, presentationAnalysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2d7d47';
    if (score >= 60) return '#fbbc05';
    return '#ea4335';
  };


  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: getScoreColor(score) }}>
          {score}/100
        </span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: '#f1f3f4', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          backgroundColor: getScoreColor(score),
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );

  return (
    <div className="speech-analysis">
      {/* Анализ речи в двухколоночной сетке */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Левая колонка - Баллы */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Оценки по критериям</h3>
            
            <ScoreBar score={speechAnalysis.tempo?.score || 0} label="Темп речи" />
            <ScoreBar score={speechAnalysis.energy?.score || 0} label="Энергичность" />
            <ScoreBar score={speechAnalysis.confidence?.score || 0} label="Уверенность" />
            <ScoreBar score={speechAnalysis.awareness?.score || 0} label="Осознанность" />
            <ScoreBar score={speechAnalysis.clarity?.score || 0} label="Ясность" />
          </div>

          {/* Детальные показатели */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Детальные показатели</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              {speechAnalysis.tempo && (
                <div>
                  <strong>Темп речи:</strong> {speechAnalysis.tempo.wordsPerMinute} слов/мин
                  <div style={{ 
                    marginTop: '4px', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: speechAnalysis.tempo.assessment === 'оптимально' ? '#e8f5e8' : '#fff3cd',
                    color: speechAnalysis.tempo.assessment === 'оптимально' ? '#155724' : '#856404',
                    display: 'inline-block'
                  }}>
                    {speechAnalysis.tempo.assessment}
                  </div>
                </div>
              )}

              {speechAnalysis.energy && (
                <div>
                  <strong>Эмоциональный тон:</strong> {speechAnalysis.energy.emotion}
                  <div style={{ marginTop: '4px', color: '#5f6368' }}>
                    Уровень: {speechAnalysis.energy.level}
                  </div>
                </div>
              )}

              {speechAnalysis.confidence && (
                <div>
                  <strong>Неловкие паузы:</strong> {speechAnalysis.confidence.awkwardPauses}
                </div>
              )}

              {speechAnalysis.awareness && (
                <div>
                  <strong>Средняя длина предложения:</strong> {speechAnalysis.awareness.avgSentenceLength} слов
                </div>
              )}

              {speechAnalysis.clarity && (
                <div>
                  <strong>Качество артикуляции:</strong> {speechAnalysis.clarity.articulation}/100
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Правая колонка - Анализ и рекомендации */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Обратная связь</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {speechAnalysis.tempo && (
                <div>
                  <h4 style={{ fontSize: '16px', color: '#2d7d47', marginBottom: '8px' }}>
                    Темп речи ({speechAnalysis.tempo.score}/100)
                  </h4>
                  <p style={{ fontSize: '14px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                    {speechAnalysis.tempo.feedback}
                  </p>
                </div>
              )}

              {speechAnalysis.energy && (
                <div>
                  <h4 style={{ fontSize: '16px', color: '#2d7d47', marginBottom: '8px' }}>
                    Энергичность ({speechAnalysis.energy.score}/100)
                  </h4>
                  <p style={{ fontSize: '14px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                    {speechAnalysis.energy.feedback}
                  </p>
                </div>
              )}

              {speechAnalysis.confidence && (
                <div>
                  <h4 style={{ fontSize: '16px', color: '#2d7d47', marginBottom: '8px' }}>
                    Уверенность ({speechAnalysis.confidence.score}/100)
                  </h4>
                  <p style={{ fontSize: '14px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                    {speechAnalysis.confidence.feedback}
                  </p>
                </div>
              )}

              {speechAnalysis.awareness && (
                <div>
                  <h4 style={{ fontSize: '16px', color: '#2d7d47', marginBottom: '8px' }}>
                    Осознанность ({speechAnalysis.awareness.score}/100)
                  </h4>
                  <p style={{ fontSize: '14px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                    {speechAnalysis.awareness.feedback}
                  </p>
                </div>
              )}

              {speechAnalysis.clarity && (
                <div>
                  <h4 style={{ fontSize: '16px', color: '#2d7d47', marginBottom: '8px' }}>
                    Ясность ({speechAnalysis.clarity.score}/100)
                  </h4>
                  <p style={{ fontSize: '14px', color: '#5f6368', margin: 0, lineHeight: '1.5' }}>
                    {speechAnalysis.clarity.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Проблемные зоны */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Области для улучшения</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              {speechAnalysis.confidence?.uncertainPhrases && speechAnalysis.confidence.uncertainPhrases.length > 0 && (
                <div>
                  <strong style={{ color: '#ea4335' }}>Неуверенные фразы:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '16px', color: '#5f6368' }}>
                    {speechAnalysis.confidence.uncertainPhrases.map((phrase, index) => (
                      <li key={index}>"{phrase}"</li>
                    ))}
                  </ul>
                </div>
              )}

              {speechAnalysis.confidence?.fillerWords && speechAnalysis.confidence.fillerWords.length > 0 && (
                <div>
                  <strong style={{ color: '#ea4335' }}>Слова-филлеры:</strong>
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {speechAnalysis.confidence.fillerWords.map((filler, index) => (
                      <span key={index} style={{
                        padding: '2px 8px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        "{filler.word}" ({filler.count}х)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(speechAnalysis.awareness?.repeatedWords?.length ?? 0) > 0 && (
                <div>
                  <strong style={{ color: '#fbbc05' }}>Повторяющиеся слова:</strong>
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {speechAnalysis.awareness?.repeatedWords?.map((word, index) => (
                      <span key={index} style={{
                        padding: '2px 8px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        "{word.word}" ({word.count}х)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(speechAnalysis.clarity?.pronunciation?.length ?? 0) > 0 && (
                <div>
                  <strong style={{ color: '#fbbc05' }}>Сложности с произношением:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '16px', color: '#5f6368' }}>
                    {speechAnalysis.clarity?.pronunciation?.map((word, index) => (
                      <li key={index}>"{word}"</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Анализ презентации - вынесен за пределы grid */}
      {presentationAnalysis && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '2px solid #2d7d47' }}>
            Анализ презентации
          </h2>
          <PresentationAnalysis analysis={presentationAnalysis} />
        </div>
      )}
    </div>
  );
};