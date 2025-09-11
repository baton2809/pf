import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface PresentationModalProps {
  isOpen: boolean;
  trainingId: string;
  onClose: () => void;
  onContinue: (trainingId: string, hasPresentation?: boolean) => void;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({ 
  isOpen, 
  trainingId, 
  onClose, 
  onContinue 
}) => {
  const { trainingApi } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt') || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleContinue = async () => {
    if (selectedFile) {
      setIsUploading(true);
      try {
        const data = await trainingApi.uploadPresentation(trainingId, selectedFile);
        onContinue(trainingId, data.hasPresentation);
      } catch (error: any) {
        console.error('Failed to upload presentation:', error);
        alert('Ошибка при загрузке презентации');
      } finally {
        setIsUploading(false);
      }
    } else {
      onContinue(trainingId, false);
    }
  };

  const handleSkip = () => {
    onContinue(trainingId, false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Добавить презентацию</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div
            className={`drag-drop-area ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".ppt,.pptx,.pdf"
              onChange={handleFileSelect}
            />
            
            {selectedFile ? (
              <div className="file-selected">
                <div className="file-icon">✓</div>
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            ) : (
              <div className="drag-drop-content">
                <div className="drag-drop-icon">+</div>
                <div className="drag-drop-text">
                  <p>Перетащите файл презентации сюда</p>
                  <p className="drag-drop-subtext">или нажмите для выбора</p>
                </div>
                <div className="supported-formats">
                  Поддерживаемые форматы: PPT, PPTX, PDF
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={handleSkip} disabled={isUploading}>
              Пропустить
            </button>
            <button className="btn btn-primary" onClick={handleContinue} disabled={isUploading}>
              {isUploading ? 'Загрузка...' : 'Продолжить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};