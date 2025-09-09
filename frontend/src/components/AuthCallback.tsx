import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleAuthCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const success = params.get('success');
      const error = params.get('error');

      if (success === 'true' && token) {
        try {
          // save token and load user data
          await handleAuthCallback(token);
          navigate('/');
        } catch (err) {
          console.error('authentication callback error:', err);
          navigate('/login?error=callback_failed');
        }
      } else if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + encodeURIComponent(error));
      } else {
        // no valid params, redirect to login
        navigate('/login?error=invalid_callback');
      }
    };

    handleCallback();
  }, [location, navigate, handleAuthCallback]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #1a73e8',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <p style={{
        fontSize: '16px',
        color: '#666',
        textAlign: 'center'
      }}>
        выполняется авторизация...
      </p>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};