import React, { useState, useRef } from 'react';

interface PresentationUploadProps {
  onFileSelect: (file: File | null) => void;
  isUploading?: boolean;
  sessionType?: string;
}

export const PresentationUpload: React.FC<PresentationUploadProps> = ({ 
  onFileSelect, 
  isUploading = false,
  sessionType 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const allowedTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы PowerPoint (.ppt, .pptx) и PDF');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert('Размер файла не должен превышать 50MB');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('powerpoint') || type.includes('presentation')) {
      return 'PPT';
    }
    if (type.includes('pdf')) {
      return 'PDF';
    }
    return 'FILE';
  };

  return (
    <div className="presentation-upload">
      {!selectedFile ? (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#2d7d47' : '#dadce0'}`,
            borderRadius: '8px',
            padding: '12px 15px',
            textAlign: 'center',
            backgroundColor: dragActive ? '#f0f8f0' : isUploading ? '#f8f9fa' : 'white',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: isUploading ? 0.6 : 1
          }}
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".ppt,.pptx,.pdf"
            onChange={handleInputChange}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                Загрузка презентации...
              </div>
              <div style={{ fontSize: '14px', color: '#5f6368' }}>
                Анализируем содержимое и структуру
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                {sessionType === 'interview' ? 'Загрузите резюме' : 'Загрузите презентацию'}
              </div>
              <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '10px' }}>
                Перетащите файл сюда или нажмите для выбора
              </div>
              <div style={{ fontSize: '12px', color: '#9aa0a6' }}>
                Поддерживаются форматы: PowerPoint (.ppt, .pptx), PDF<br/>
                Максимальный размер: 50MB
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          border: '1px solid #e8eaed',
          borderRadius: '8px',
          padding: '12px',
          backgroundColor: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>
                {getFileIcon(selectedFile.type)}
              </span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>
            
            {!isUploading && (
              <button
                onClick={handleRemoveFile}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #dadce0',
                  backgroundColor: 'white',
                  color: '#5f6368',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Удалить
              </button>
            )}
          </div>
          
          {isUploading && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#f1f3f4', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '60%', // Можно сделать динамическим
                  height: '100%',
                  backgroundColor: '#2d7d47',
                  borderRadius: '2px',
                  animation: 'progress 2s ease-in-out infinite'
                }} />
              </div>
              <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px' }}>
                Анализ презентации в процессе...
              </div>
            </div>
          )}
        </div>
      )}
      
      <style>
        {`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};