import React, { useState, useRef, useMemo } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (audioFile: File, presentationFile?: File) => void;
}

type FileMode = 'audio' | 'video';

const UploadModalComponent: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [currentMode, setCurrentMode] = useState<FileMode>('audio');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const presentationInputRef = useRef<HTMLInputElement>(null);

  const handleClose = React.useCallback(() => {
    setSelectedFile(null);
    setSelectedPresentation(null);
    setCurrentMode('audio');
    setIsUploading(false);
    onClose();
  }, [onClose]);

  const handleModeSwitch = React.useCallback((mode: FileMode) => {
    if (mode !== currentMode) {
      setCurrentMode(mode);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentMode]);

  const handleFileSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handlePresentationSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPresentation(file);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isValidType = currentMode === 'video' 
        ? file.type.startsWith('video/')
        : file.type.startsWith('audio/');
      
      if (isValidType) {
        setSelectedFile(file);
      } else {
        alert(`Пожалуйста, выберите ${currentMode === 'video' ? 'видео' : 'аудио'} файл`);
      }
    }
  }, [currentMode]);

  const formatFileSize = React.useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const handleUpload = React.useCallback(async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    // Имитация загрузки
    setTimeout(() => {
      onUpload(selectedFile, selectedPresentation || undefined);
      setIsUploading(false);
      handleClose();
    }, 2000);
  }, [selectedFile, selectedPresentation, onUpload, handleClose]);

  const removeFile = React.useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removePresentation = React.useCallback(() => {
    setSelectedPresentation(null);
    if (presentationInputRef.current) {
      presentationInputRef.current.value = '';
    }
  }, []);

  const handleOverlayClick = React.useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const uploadAreaTitle = useMemo(() => 
    `Загрузить ${currentMode === 'video' ? 'видео' : 'аудио'} файл`, 
    [currentMode]
  );
  
  const uploadAreaSubtitle = useMemo(() => 
    currentMode === 'video' ? 'MP4, MOV, AVI до 500МБ' : 'MP3, WAV, M4A до 100МБ', 
    [currentMode]
  );

  const fileAcceptTypes = useMemo(() => 
    currentMode === 'video' ? 'video/*' : 'audio/*', 
    [currentMode]
  );

  // Обработка закрытия по Escape и управление body scroll
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="upload-modal-overlay" onClick={handleOverlayClick}>
      <div className="upload-modal">
        <div>
        <button className="upload-modal-close" onClick={handleClose}>&times;</button>
        
        <h2 className="upload-modal-title">Загрузить запись</h2>
        <p className="upload-modal-description">
          Загрузите аудио/видео запись для анализа. Опционально добавьте презентацию для более точного анализа.
        </p>

        <div className="upload-modal-tabs">
          <button 
            className={`upload-modal-tab disabled`}
            disabled={true}
            style={{
              opacity: 0.6,
              cursor: 'not-allowed'
            }}
          >
            Видео <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgb(243, 244, 246)',
              color: 'rgb(107, 114, 128)',
              fontSize: '10px',
              fontWeight: 500,
              border: '1px solid rgb(229, 231, 235)',
              marginLeft: '6px'
            }}>Скоро</span>
          </button>
          <button 
            className={`upload-modal-tab ${currentMode === 'audio' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('audio')}
          >
            Аудио
          </button>
        </div>

        {!selectedFile ? (
          <div 
            className={`upload-modal-area ${isDragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="upload-modal-icon" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 8c-1.1 0-2 .9-2 2v16.17l-5.59-5.59c-.78-.78-2.05-.78-2.83 0s-.78 2.05 0 2.83l8 8c.39.39.9.59 1.42.59s1.03-.2 1.42-.59l8-8c.78-.78.78-2.05 0-2.83s-2.05-.78-2.83 0L34 26.17V10c0-1.1-.9-2-2-2z"/>
              <path d="M48 32c-1.1 0-2 .9-2 2v16H18V34c0-1.1-.9-2-2-2s-2 .9-2 2v18c0 1.1.9 2 2 2h32c1.1 0 2-.9 2-2V34c0-1.1-.9-2-2-2z"/>
              <circle cx="32" cy="12" r="2"/>
            </svg>
            
            <h3 className="upload-modal-area-title">
              {uploadAreaTitle}
            </h3>
            <p className="upload-modal-area-subtitle">
              {uploadAreaSubtitle}
            </p>
            
            <button className="upload-modal-select-btn">
              <svg className="upload-modal-arrow" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="9" x2="12" y2="19"/>
              </svg>
              Выбрать файл
            </button>
          </div>
        ) : (
          <div className="upload-modal-file-info">
            <svg className="upload-modal-file-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <div className="upload-modal-file-text">
              {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </div>
            <button className="upload-modal-remove-file" onClick={removeFile}>&times;</button>
          </div>
        )}

        <div className="upload-modal-presentation-section">
          <h3 className="upload-modal-section-title">Презентация (опционально)</h3>
          
          {!selectedPresentation ? (
            <div 
              className="upload-modal-presentation-upload"
              onClick={() => presentationInputRef.current?.click()}
            >
              <svg className="upload-modal-doc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              <span>Загрузить файл</span>
            </div>
          ) : (
            <div className="upload-modal-file-info">
              <svg className="upload-modal-file-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              <div className="upload-modal-file-text">
                {selectedPresentation.name} ({formatFileSize(selectedPresentation.size)})
              </div>
              <button className="upload-modal-remove-file" onClick={removePresentation}>&times;</button>
            </div>
          )}
        </div>

        <div className="upload-modal-actions">
          <button className="upload-modal-btn upload-modal-btn-secondary" onClick={handleClose}>
            Отмена
          </button>
          <button 
            className="upload-modal-btn upload-modal-btn-primary" 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            <svg className="upload-modal-check-icon" viewBox="0 0 24 24">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            {isUploading ? 'Загружается...' : 'Загрузить'}
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={fileAcceptTypes}
          style={{ display: 'none' }}
        />
        <input 
          type="file" 
          ref={presentationInputRef}
          onChange={handlePresentationSelect}
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          style={{ display: 'none' }}
        />
        </div>
      </div>
    </div>
  );
};

// Экспортируем мемоизированную версию компонента
export const UploadModal = React.memo(UploadModalComponent);