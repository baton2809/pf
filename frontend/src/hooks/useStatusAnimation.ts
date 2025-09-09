import { useEffect } from 'react';
import { useRecording } from '../contexts/RecordingContext';

// custom hook for status opacity animation
export const useStatusAnimation = () => {
  const { actions } = useRecording();

  useEffect(() => {
    const interval = setInterval(() => {
      actions.setStatusOpacity(0.6);
      setTimeout(() => {
        actions.setStatusOpacity(1);
      }, 500);
    }, 1000);

    return () => clearInterval(interval);
  }, [actions]);
};