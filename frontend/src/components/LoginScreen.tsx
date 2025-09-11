import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import { Notification } from './Notification';
import { useNotification } from '../hooks/useNotification';

export const LoginScreen: React.FC = () => {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { notification, showNotification, hideNotification } = useNotification();

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      showNotification('Введите адрес электронной почты', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showNotification('Введите корректный адрес электронной почты', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email);
      showNotification('Успешный вход в систему', 'success');
    } catch (error: any) {
      showNotification('Ошибка входа в систему', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const handleQuickRegister = async () => {
    setIsLoading(true);
    try {
      await loginWithEmail('demo@example.com');
      showNotification('Успешная регистрация', 'success');
    } catch (error: any) {
      showNotification('Ошибка регистрации', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    try {
      await loginWithEmail('reset@example.com');
      showNotification('Пароль восстановлен. Вход выполнен', 'success');
    } catch (error: any) {
      showNotification('Ошибка восстановления пароля', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEmailLogin();
    }
  };

  return (
    <>
      <div className="login-screen">
        {/* Left half - login form */}
        <div className="login-left">
          <div className="login-form-container">
            {/* Logo */}
            <div className="logo-section">
              <div className="logo-icon">P</div>
              <div className="logo-text">PitchForge</div>
            </div>

            {/* Welcome section */}
            <div className="auth-welcome-section">
              <h1 className="auth-welcome-title">Начать работу</h1>
              <p className="auth-welcome-description">Создайте аккаунт для доступа к виртуальному ассистенту тренировки презентаций</p>
            </div>

            {/* Login form */}
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                  placeholder="Введите ваш email"
                />
              </div>

              <button 
                type="button" 
                className="auth-button-primary" 
                onClick={handleEmailLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Загрузка...' : 'Создать аккаунт'}
              </button>
            </form>

            {/* Google button */}
            <button className="btn btn-google" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Войти через Google
            </button>

            {/* Registration prompt */}
            <div className="auth-registration-prompt">
              Еще нет аккаунта?{' '}
              <button
                className="auth-button-secondary"
                onClick={handleQuickRegister}
                disabled={isLoading}
              >
                Зарегистрироваться
              </button>
            </div>

            {/* Forgot password link */}
            <div className="auth-forgot-password-container">
              <button
                className="auth-button-secondary"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Забыл пароль
              </button>
            </div>
          </div>
        </div>

        {/* Right half - product showcase */}
        <div className="login-right">
          <div className="product-showcase">
            {/* Integration Logos */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '32px',
              padding: '20px'
            }}>
              {/* Zoom */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#2D8CFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  Zoom
                </div>
              </div>

              {/* Google Meet */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <img 
                  src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png"
                  alt="Google Meet"
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                />
              </div>

              {/* Google Calendar */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <img 
                  src="https://fonts.gstatic.com/s/i/productlogos/calendar_2020q4/v10/web-512dp/logo_calendar_2020q4_color_2x_web_512dp.png"
                  alt="Google Calendar"
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                />
              </div>

              {/* SaluteJazz */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #24272a 0%, #1a1d1f 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '8px',
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'center',
                  lineHeight: '1.1',
                  padding: '2px',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#21A038', fontWeight: '800' }}>SALUTE</div>
                    <div style={{ fontSize: '7px', color: '#ffffff', marginTop: '-1px' }}>JAZZ</div>
                  </div>
                </div>
              </div>

              {/* Я.Телемост */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '7px',
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'center',
                  lineHeight: '1.0',
                  padding: '2px',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#FC3F1D',
                      fontWeight: '800', 
                      letterSpacing: '0px',
                      marginBottom: '1px'
                    }}>Я</div>
                    <div style={{ 
                      fontSize: '5px', 
                      color: '#ffffff',
                      marginTop: '1px',
                      letterSpacing: '0px'
                    }}>ТЕЛЕМОСТ</div>
                  </div>
                </div>
              </div>

              {/* Контур.Толк */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'logoFloat 4s ease-in-out infinite'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2ea3f2 0%, #1e8bd9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '7px',
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'center',
                  lineHeight: '1.0',
                  padding: '2px',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#ffffff', fontWeight: '800', letterSpacing: '0.1px' }}>КОНТУР</div>
                    <div style={{ fontSize: '7px', color: '#e3f2fd', marginTop: '2px', letterSpacing: '0.3px' }}>ТОЛК</div>
                  </div>
                </div>
              </div>

            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes logoFloat {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-8px) scale(1.05); }
              }
            `}} />
            
            {/* Main heading */}
            <h1 className="main-heading" style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '600',
              letterSpacing: '-0.5px'
            }}>
              Виртуальный ассистент для тренировки выступлений
            </h1>

            {/* Product description */}
            <div className="product-description" style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              <p style={{ 
                textAlign: 'justify',
                lineHeight: '1.6',
                fontWeight: '400'
              }}>
                Превратите нервную подготовку к питчу в уверенную тренировку! 
                PitchForge создает реалистичные диалоги с ИИ-инвестором, который знает, 
                где ударить больнее всего. Неожиданные вопросы, жесткие возражения, 
                проверка на прочность — всё как на настоящем питче.
              </p>
              
              <p style={{ 
                marginTop: '16px', 
                textAlign: 'justify',
                lineHeight: '1.6'
              }}>
                <strong style={{ fontWeight: '600' }}>
                  Один клик — и вы уже тренируетесь с лучшим спарринг-партнером
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Notification 
        message={notification.message}
        type={notification.type}
        show={notification.show}
        onHide={hideNotification}
      />
    </>
  );
};