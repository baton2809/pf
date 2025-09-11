import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PresentationModal } from '../components/PresentationModal';
import { trainingApiService } from '../services/trainingApi';
import { sessionTypeLabels, type TrainingType } from '../utils/trainingTypes';

export const NewTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TrainingType>('presentation');
  const [isCreating, setIsCreating] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [trainingId, setTrainingId] = useState<string | null>(null);

  const handleCreateTraining = async () => {
    if (!title.trim()) {
      alert('Введите название тренировки');
      return;
    }

    setIsCreating(true);
    try {
      const data = await trainingApiService.createTraining({
        title: title.trim(),
        type,
        userId: 'default-user' // todo: get from auth context
      });

      setTrainingId(data.trainingId);
      setShowPresentationModal(true);
    } catch (error: any) {
      console.error('Failed to create training:', error);
      alert('Ошибка при создании тренировки');
    } finally {
      setIsCreating(false);
    }
  };

  const handleContinueToRecording = (trainingId: string, hasPresentation: boolean = false) => {
    setShowPresentationModal(false);
    // navigate to recording interface
    navigate(`/training/${trainingId}/record`);
  };

  return (
    <div className="page-container">
      <h2>Создать новую тренировку</h2>
      
      <div className="training-grid">
        {/* левая колонка - форма создания */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Параметры тренировки</h3>
          
          <div className="form-group">
            <label className="form-label">
              Название тренировки *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Презентация квартального отчета"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Тип тренировки
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TrainingType)}
              className="form-select"
            >
              {Object.entries(sessionTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateTraining}
            disabled={isCreating || !title.trim()}
            className="form-button primary"
          >
            {isCreating ? 'Создание...' : 'Создать тренировку'}
          </button>
        </div>

        {/* правая колонка - инструкции */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Как проходит тренировка</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#1a73e8',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                minWidth: '24px'
              }}>1</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                  Загрузите презентацию (опционально)
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#5f6368' }}>
                  PDF или PPTX файл поможет системе лучше анализировать содержание
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#1a73e8',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                minWidth: '24px'
              }}>2</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                  Проведите презентацию
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#5f6368' }}>
                  Говорите естественно, как перед реальной аудиторией
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#1a73e8',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                minWidth: '24px'
              }}>3</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                  Получите детальный анализ
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#5f6368' }}>
                  Речевые метрики, анализ содержания и рекомендации для улучшения
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* modal для загрузки презентации */}
      {showPresentationModal && trainingId && (
        <PresentationModal
          isOpen={showPresentationModal}
          trainingId={trainingId}
          onClose={() => setShowPresentationModal(false)}
          onContinue={handleContinueToRecording}
        />
      )}
    </div>
  );
};