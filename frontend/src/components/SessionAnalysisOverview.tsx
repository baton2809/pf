import React, { useState } from 'react';
import { TrainingSession } from '../data/mockData';
import { SpeechAnalysis } from './SpeechAnalysis';
import { PresentationAnalysis } from './PresentationAnalysis';

interface SessionAnalysisOverviewProps {
  session: TrainingSession;
}

export const SessionAnalysisOverview: React.FC<SessionAnalysisOverviewProps> = ({ session }) => {
  const [detailView, setDetailView] = useState<'speech' | 'presentation' | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2d7d47';
    if (score >= 60) return '#fbbc05';
    return '#ea4335';
  };

  const calculateSpeechOverallScore = () => {
    if (!session.speechAnalysis) return 0;
    const { tempo, energy, confidence, awareness, clarity } = session.speechAnalysis;
    return Math.round((tempo.score + energy.score + confidence.score + awareness.score + clarity.score) / 5);
  };

  const calculatePresentationOverallScore = () => {
    if (!session.presentationAnalysis) return 0;
    const { overallDesignScore, overallContentScore, overallReadabilityScore } = session.presentationAnalysis;
    return Math.round((overallDesignScore + overallContentScore + overallReadabilityScore) / 3);
  };

  const speechScore = calculateSpeechOverallScore();
  const presentationScore = calculatePresentationOverallScore();

  if (detailView === 'speech' && session.speechAnalysis) {
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e8eaed'
        }}>
          <h3 style={{ margin: 0 }}>Детальный анализ речи</h3>
          <button
            onClick={() => setDetailView(null)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #dadce0',
              backgroundColor: 'white',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ← Назад к обзору
          </button>
        </div>
        <SpeechAnalysis 
          speechAnalysis={session.speechAnalysis}
          presentationAnalysis={undefined}
        />
      </div>
    );
  }

  if (detailView === 'presentation' && session.presentationAnalysis) {
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e8eaed'
        }}>
          <h3 style={{ margin: 0 }}>Детальный анализ презентации</h3>
          <button
            onClick={() => setDetailView(null)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #dadce0',
              backgroundColor: 'white',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ← Назад к обзору
          </button>
        </div>
        <PresentationAnalysis analysis={session.presentationAnalysis} />
      </div>
    );
  }

  // Основной обзор
  return (
    <div className="session-analysis-overview">
      <h3 style={{ marginBottom: '24px' }}>Анализ тренировки</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: session.presentationAnalysis ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Анализ речи */}
        {session.speechAnalysis && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Анализ речи</h4>
              <div style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: getScoreColor(speechScore) + '20',
                color: getScoreColor(speechScore)
              }}>
                {speechScore}/100
              </div>
            </div>

            {/* Краткие оценки по критериям */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.speechAnalysis.tempo.score) }}>
                  {session.speechAnalysis.tempo.score}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Темп</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.speechAnalysis.energy.score) }}>
                  {session.speechAnalysis.energy.score}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Энергия</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.speechAnalysis.confidence.score) }}>
                  {session.speechAnalysis.confidence.score}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Уверенность</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.speechAnalysis.awareness.score) }}>
                  {session.speechAnalysis.awareness.score}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Осознанность</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.speechAnalysis.clarity.score) }}>
                  {session.speechAnalysis.clarity.score}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Ясность</div>
              </div>
            </div>

            {/* Краткая обратная связь */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px' }}>
                <strong>Ключевые моменты:</strong>
              </div>
              <ul style={{ fontSize: '12px', color: '#5f6368', paddingLeft: '16px', margin: 0 }}>
                <li>Темп: {session.speechAnalysis.tempo.wordsPerMinute} слов/мин ({session.speechAnalysis.tempo.assessment})</li>
                <li>Энергетика: {session.speechAnalysis.energy.level}</li>
                <li>Слова-филлеры: {session.speechAnalysis.confidence.fillerWords.reduce((sum: number, fw: any) => sum + fw.count, 0)} раз</li>
              </ul>
            </div>

            <button
              onClick={() => setDetailView('speech')}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #2d7d47',
                backgroundColor: 'white',
                color: '#2d7d47',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Подробный анализ речи →
            </button>
          </div>
        )}

        {/* Анализ презентации */}
        {session.presentationAnalysis && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Анализ презентации</h4>
              <div style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: getScoreColor(presentationScore) + '20',
                color: getScoreColor(presentationScore)
              }}>
                {presentationScore}/100
              </div>
            </div>

            {/* Краткие оценки по критериям */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.presentationAnalysis.overallDesignScore) }}>
                  {session.presentationAnalysis.overallDesignScore}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Дизайн</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.presentationAnalysis.overallContentScore) }}>
                  {session.presentationAnalysis.overallContentScore}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Контент</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getScoreColor(session.presentationAnalysis.overallReadabilityScore) }}>
                  {session.presentationAnalysis.overallReadabilityScore}
                </div>
                <div style={{ fontSize: '10px', color: '#5f6368' }}>Читаемость</div>
              </div>
            </div>

            {/* Краткая информация */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px' }}>
                <strong>Информация:</strong>
              </div>
              <ul style={{ fontSize: '12px', color: '#5f6368', paddingLeft: '16px', margin: 0 }}>
                <li>Слайдов: {session.presentationAnalysis.slideCount}</li>
                <li>Файл: {session.presentationAnalysis.fileName}</li>
                <li>Проблем найдено: {session.presentationAnalysis.structuralIssues.length}</li>
              </ul>
            </div>

            <button
              onClick={() => setDetailView('presentation')}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #2d7d47',
                backgroundColor: 'white',
                color: '#2d7d47',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Подробный анализ презентации →
            </button>
          </div>
        )}
      </div>

      {/* Общие рекомендации */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '12px' }}>Общие рекомендации для улучшения</h4>
        <div style={{ fontSize: '12px', color: '#5f6368', lineHeight: '1.5' }}>
          {session.speechAnalysis && session.presentationAnalysis && (
            <p>
              <strong>Комплексные улучшения:</strong> Синхронизируйте темп речи с переходами между слайдами, 
              используйте паузы для акцентирования ключевых моментов на слайдах.
            </p>
          )}
          {session.speechAnalysis && !session.presentationAnalysis && (
            <p>
              <strong>Работа с речью:</strong> Сосредоточьтесь на устранении слов-филлеров 
              и поддержании стабильного темпа речи.
            </p>
          )}
          {!session.speechAnalysis && session.presentationAnalysis && (
            <p>
              <strong>Работа с презентацией:</strong> Улучшите структуру и читаемость слайдов 
              для более эффективной подачи материала.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};