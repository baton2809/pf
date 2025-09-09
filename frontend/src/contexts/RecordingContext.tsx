import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { RecordingState, RecordingStatus, RecordingContextType } from '../types/recording';

// initial state
const initialState: RecordingState = {
  status: 'idle',
  hasStarted: false,
  countdown: 3,
  actualRecordingTime: 0,
  showAnalysisModal: false,
  analysisProgress: 0,
  statusOpacity: 1
};

// action types
type RecordingAction =
  | { type: 'SET_STATUS'; payload: RecordingStatus }
  | { type: 'SET_HAS_STARTED'; payload: boolean }
  | { type: 'SET_COUNTDOWN'; payload: number | ((prev: number) => number) }
  | { type: 'SET_ACTUAL_RECORDING_TIME'; payload: number | ((prev: number) => number) }
  | { type: 'SET_SHOW_ANALYSIS_MODAL'; payload: boolean }
  | { type: 'SET_ANALYSIS_PROGRESS'; payload: number }
  | { type: 'SET_STATUS_OPACITY'; payload: number }
  | { type: 'RESET_STATE' };

// reducer
const recordingReducer = (state: RecordingState, action: RecordingAction): RecordingState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_HAS_STARTED':
      return { ...state, hasStarted: action.payload };
    case 'SET_COUNTDOWN':
      return { 
        ...state, 
        countdown: typeof action.payload === 'function' ? action.payload(state.countdown) : action.payload 
      };
    case 'SET_ACTUAL_RECORDING_TIME':
      return { 
        ...state, 
        actualRecordingTime: typeof action.payload === 'function' ? action.payload(state.actualRecordingTime) : action.payload 
      };
    case 'SET_SHOW_ANALYSIS_MODAL':
      return { ...state, showAnalysisModal: action.payload };
    case 'SET_ANALYSIS_PROGRESS':
      return { ...state, analysisProgress: action.payload };
    case 'SET_STATUS_OPACITY':
      return { ...state, statusOpacity: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

// context
const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

// provider component
interface RecordingProviderProps {
  children: ReactNode;
}

export const RecordingProvider: React.FC<RecordingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(recordingReducer, initialState);

  const actions = {
    setStatus: (status: RecordingStatus) => 
      dispatch({ type: 'SET_STATUS', payload: status }),
    setHasStarted: (hasStarted: boolean) => 
      dispatch({ type: 'SET_HAS_STARTED', payload: hasStarted }),
    setCountdown: (countdown: number) => {
      dispatch({ type: 'SET_COUNTDOWN', payload: countdown });
    },
    setActualRecordingTime: (time: number | ((prev: number) => number)) => {
      dispatch({ type: 'SET_ACTUAL_RECORDING_TIME', payload: time });
    },
    setShowAnalysisModal: (show: boolean) => 
      dispatch({ type: 'SET_SHOW_ANALYSIS_MODAL', payload: show }),
    setAnalysisProgress: (progress: number) => 
      dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: progress }),
    setStatusOpacity: (opacity: number) => 
      dispatch({ type: 'SET_STATUS_OPACITY', payload: opacity }),
    resetState: () => 
      dispatch({ type: 'RESET_STATE' })
  };

  const value: RecordingContextType = {
    state,
    actions
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

// custom hook to use the context
export const useRecording = (): RecordingContextType => {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};