import { useState, useCallback } from 'react';
import { NotificationType } from '../components/Notification';

export interface NotificationState {
  message: string;
  type: NotificationType;
  show: boolean;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    show: false
  });

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    setNotification({ message, type, show: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};