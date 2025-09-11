import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const { handleAuthCallback } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('обработка аутентификации...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(decodeURIComponent(error));
          return;
        }

        if (success === 'true' && token) {
          await handleAuthCallback(token);
          setStatus('success');
          setMessage('авторизация успешна, перенаправление...');
          // delayed navigation to allow AuthContext to update
          setTimeout(() => {
            navigate('/new-training', { replace: true });
          }, 100);
        } else {
          setStatus('error');
          setMessage('ошибка аутентификации - токен не получен');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(`ошибка аутентификации: ${error.message}`);
      }
    };

    processCallback();
  }, [handleAuthCallback]);

  return (
    <div className="auth-callback">
      <div className="auth-callback-content">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <h2 className="auth-title">аутентификация...</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="status-icon success">✓</div>
            <h2 className="auth-title success">успешно</h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="status-icon error">✗</div>
            <h2 className="auth-title error">ошибка аутентификации</h2>
          </>
        )}
        
        <p className="auth-message">{message}</p>
        
        {status === 'error' && (
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/', { replace: true })}
          >
            вернуться на главную
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;