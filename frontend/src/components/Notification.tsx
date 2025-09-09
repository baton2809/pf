import React, { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  show: boolean;
  onHide: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  show, 
  onHide 
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  return (
    <div className={`notification ${type} ${show ? 'show' : ''}`}>
      <span>{message}</span>
    </div>
  );
};