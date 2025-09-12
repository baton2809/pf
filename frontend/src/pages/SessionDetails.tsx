import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

// analysis components
import { TranscriptionComponent } from '../components/analysis/TranscriptionComponent';
import { PaceComponent } from '../components/analysis/PaceComponent';
import { EnergyComponent } from '../components/analysis/EnergyComponent';
import { ClarityComponent } from '../components/analysis/ClarityComponent';
import { ConfidenceComponent } from '../components/analysis/ConfidenceComponent';
import { FinalScoreComponent } from '../components/analysis/FinalScoreComponent';
import { PresentationFeedbackComponent } from '../components/analysis/PresentationFeedbackComponent';
import { QuestionsComponent } from '../components/analysis/QuestionsComponent';
// import { PitchEvaluationComponent } from '../components/analysis/PitchEvaluationComponent';

// utility functions
import { 
  calculateOverallScore, 
  isTranscriptionReady, 
  areMetricsReady, 
  isAnalysisComplete,
  estimateTotalWords
} from '../utils/scoreCalculations';

// interface for component state management
interface SessionComponentState {
  transcriptionReady: boolean;
  metricsReady: boolean;
  analysisComplete: boolean;
  pitchAnalysisLoading: boolean;
  pitchAnalysisError: boolean;
  questionsLoading: boolean;
  questionsError: boolean;
  feedbackLoading: boolean;
  feedbackError: boolean;
}

const SessionDetailsComponent: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { trainingApi } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<string>('processing');
  const [progress, setProgress] = useState<number>(50);
  const [message, setMessage] = useState<string>('Анализируем вашу презентацию...');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [transcriptionData, setTranscriptionData] = useState<any>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // component visibility state based on SSE progress
  const [componentState, setComponentState] = useState<SessionComponentState>({
    transcriptionReady: false,
    metricsReady: false,
    analysisComplete: false,
    pitchAnalysisLoading: false,
    pitchAnalysisError: false,
    questionsLoading: false,
    questionsError: false,
    feedbackLoading: false,
    feedbackError: false
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const isNavigatingAwayRef = useRef<boolean>(false);
  const initializeSSERef = useRef<(() => Promise<void>) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // SSE message handler - moved to top level
  const handleSSEMessage = useCallback((data: any) => {
    // only log important events, not every message
    if (data.type === 'completed' || data.type === 'error' || data.type === 'transcription_completed') {
      logger.critical('SessionDetails', `Session ${data.type}`, { 
        sessionId: data.sessionId, 
        type: data.type, 
        progress: data.progress 
      });
    } else {
      logger.debug('SessionDetails', 'SSE message received', { 
        type: data.type, 
        progress: data.progress, 
        step: data.step 
      });
    }
    
    // only filter out messages with explicit sessionId that don't match
    if (data.sessionId && data.sessionId !== sessionId) {
      logger.warn('SessionDetails', 'Received SSE message for different session, ignoring');
      return;
    }
    
    // update UI based on message type
    setSessionStatus(data.status);
    setProgress(data.progress || 0);
    setMessage(data.message || 'Обрабатываем...');
    
    // handle different message types
    switch (data.type) {
      case 'status':
      case 'progress':
        // check for component visibility thresholds
        const transcriptionReady = isTranscriptionReady(data.progress, data.step);
        const metricsReady = areMetricsReady(data.progress, data.step);
        const analysisComplete = isAnalysisComplete(data.progress, data.status);
        
        logger.debug('SessionDetails', 'Component visibility check', {
          transcriptionReady,
          metricsReady,
          analysisComplete,
          progress: data.progress,
          step: data.step
        });
        
        setComponentState({
          transcriptionReady,
          metricsReady,
          analysisComplete,
          pitchAnalysisLoading: false,
          pitchAnalysisError: false,
          questionsLoading: false,
          questionsError: false,
          feedbackLoading: false,
          feedbackError: false
        });
        
        // handle completion data when status is 'completed'
        if (data.status === 'completed' && data.data) {
          setAnalysisData(data.data);
          if (data.data.speech_segments) {
            setTranscriptionData(data.data.speech_segments);
          }
          setIsLoadingInitialData(false);
        }
        break;
        
      case 'transcription_completed':
        if (data.segments && data.segments.length > 0) {
          setTranscriptionData(data.segments);
        }
        setComponentState(prev => ({ ...prev, transcriptionReady: true }));
        // if cached, don't override progress
        if (!data.cached) {
          setProgress(data.progress || 35);
        }
        break;
      
      case 'metrics_ready':
        // new event for speech metrics
        if (data.data) {
          setAnalysisData((prev: any) => ({
            ...prev,
            metrics: data.data
          }));
        }
        setComponentState(prev => ({ ...prev, metricsReady: true }));
        if (!data.cached) {
          setProgress(data.progress || 65);
        }
        logger.info('SessionDetails', 'Metrics ready', { cached: data.cached });
        break;
      
      case 'pitch_analysis_ready':
        // new event for pitch analysis
        if (data.data) {
          setAnalysisData((prev: any) => ({
            ...prev,
            pitch_evaluation: data.data.pitch_evaluation,
            filler_words: data.data.filler_words,
            hesitant_phrases: data.data.hesitant_phrases,
            unclarity_moments: data.data.unclarity_moments
          }));
        }
        setComponentState(prev => ({
          ...prev,
          pitchAnalysisLoading: false,
          pitchAnalysisError: false
        }));
        if (!data.cached) {
          setProgress(data.progress || 75);
        }
        logger.info('SessionDetails', 'Pitch analysis ready', { cached: data.cached });
        break;
      
      case 'questions_ready':
        // new event for questions
        if (data.data) {
          setAnalysisData((prev: any) => ({
            ...prev,
            questions: data.data
          }));
        }
        setComponentState(prev => ({
          ...prev,
          questionsLoading: false,
          questionsError: false
        }));
        if (!data.cached) {
          setProgress(data.progress || 50);
        }
        logger.info('SessionDetails', 'Questions ready', { cached: data.cached });
        break;
      
      case 'feedback_ready':
        // new event for presentation feedback
        if (data.data) {
          setAnalysisData((prev: any) => ({
            ...prev,
            presentation_feedback: data.data
          }));
        }
        setComponentState(prev => ({
          ...prev,
          feedbackLoading: false,
          feedbackError: false
        }));
        if (!data.cached) {
          setProgress(data.progress || 85);
        }
        logger.info('SessionDetails', 'Feedback ready', { cached: data.cached });
        break;
      
      case 'session_completed':
        // new final event when all operations complete
        if (data.data) {
          setAnalysisData(data.data);
          if (data.data.speech_segments) {
            setTranscriptionData(data.data.speech_segments);
          }
        }
        setComponentState({
          transcriptionReady: true,
          metricsReady: true,
          analysisComplete: true,
          pitchAnalysisLoading: false,
          pitchAnalysisError: false,
          questionsLoading: false,
          questionsError: false,
          feedbackLoading: false,
          feedbackError: false
        });
        setIsLoadingInitialData(false);
        setProgress(100);
        
        // log summary
        if (data.summary) {
          logger.info('SessionDetails', 'Session completed', {
            total: data.summary.total,
            completed: data.summary.completed,
            failed: data.summary.failed
          });
        }
        
        // close SSE connection
        if (eventSourceRef.current) {
          logger.info('SessionDetails', 'Closing SSE after session completion');
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        break;
        
      case 'completed':
        if (data.results) {
          setAnalysisData(data.results);
          if (data.results.speech_segments) {
            setTranscriptionData(data.results.speech_segments);
          }
        }
        setComponentState({
          transcriptionReady: true,
          metricsReady: true,
          analysisComplete: true,
          pitchAnalysisLoading: false,
          pitchAnalysisError: false,
          questionsLoading: false,
          questionsError: false,
          feedbackLoading: false,
          feedbackError: false
        });
        setIsLoadingInitialData(false);
        
        // close SSE connection on frontend side
        if (eventSourceRef.current) {
          logger.info('SessionDetails', 'Closing SSE after completion');
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        break;
        
      case 'error':
        logger.error('SessionDetails', 'Processing error via SSE', data.error);
        setError(data.error || 'Ошибка обработки');
        break;

      case 'pitch_analysis_error':
        logger.error('SessionDetails', 'Pitch analysis error', data.error);
        setComponentState(prev => ({
          ...prev,
          pitchAnalysisLoading: false,
          pitchAnalysisError: true
        }));
        break;

      case 'questions_error':
        logger.error('SessionDetails', 'Questions generation error', data.error);
        setComponentState(prev => ({
          ...prev,
          questionsLoading: false,
          questionsError: true
        }));
        break;

      case 'feedback_error':
        logger.error('SessionDetails', 'Feedback generation error', data.error);
        setComponentState(prev => ({
          ...prev,
          feedbackLoading: false,
          feedbackError: true
        }));
        break;
        
      case 'connection_closing':
        logger.debug('SessionDetails', 'SSE connection closing as expected');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        break;
        
      default:
        logger.debug('SessionDetails', 'Unknown SSE message type', { type: data.type });
    }
  }, [sessionId]);

  // fallback HTTP status check - moved to top level
  const checkSessionStatusHTTP = useCallback(async () => {
    try {
      const status = await trainingApi.getSessionStatus(sessionId!);
      
      setSessionStatus(status.status);
      setProgress(status.progress);
      setMessage(status.message);
      
      if (status.status === 'completed') {
        // fetch full results
        const result = await trainingApi.getSessionResults(sessionId!);
        if ('session' in result && result.session.results) {
          setAnalysisData(result.session.results);
          if (result.session.results.speech_segments) {
            setTranscriptionData(result.session.results.speech_segments);
          }
        }
        setIsLoadingInitialData(false);
      }
    } catch (error: any) {
      console.error('[SessionDetails] HTTP status check failed:', error);
      setError(`Ошибка соединения: ${error.message}`);
    }
  }, [sessionId, trainingApi]);
  
  // SSE error handler - moved to top level
  const handleSSEError = useCallback((error: Event) => {
    console.error('[SessionDetails] SSE connection error:', error);
    
    // if connection fails, fallback to HTTP polling after delay
    // BUT skip HTTP polling fallback for completed sessions
    setTimeout(() => {
      if (!isNavigatingAwayRef.current && sessionStatus !== 'completed') {
        console.log('[SessionDetails] SSE failed, falling back to HTTP status check');
        checkSessionStatusHTTP();
      } else {
        console.log('[SessionDetails] Skipping HTTP fallback - session completed or unmounting');
      }
    }, 2000);
  }, [checkSessionStatusHTTP, sessionStatus]);
  // smart SSE initialization - moved to top level
  const initializeSSE = useCallback(async () => {
    if (!sessionId) return;
    
    console.log(`[SessionDetails] Initializing SSE for session ${sessionId}`);
    
    try {
      // 1. First check current session status
      const initialStatus = await trainingApi.getSessionStatus(sessionId);
      
      console.log('[SessionDetails] Initial status:', initialStatus);
      
      // 2. Update UI immediately
      setProgress(initialStatus.progress || 0);
      setSessionStatus(initialStatus.status);
      setMessage(initialStatus.message);
      
      // 3. If already completed - load results and don't start SSE
      if (initialStatus.status === 'completed') {
        const results = await trainingApi.getSessionResults(sessionId);
        if ('session' in results) {
          setAnalysisData(results.session.results);
          if (results.session.results?.speech_segments) {
            setTranscriptionData(results.session.results.speech_segments);
          }
        }
        // set all components as ready
        setComponentState({
          transcriptionReady: true,
          metricsReady: true,
          analysisComplete: true,
          pitchAnalysisLoading: false,
          pitchAnalysisError: false,
          questionsLoading: false,
          questionsError: false,
          feedbackLoading: false,
          feedbackError: false
        });
        setIsLoadingInitialData(false);
        return; // SSE not needed
      }
      
      // 4. If processing or uploaded - start SSE
      if (['uploaded', 'processing'].includes(initialStatus.status)) {
        // set new component loading states to true
        setComponentState(prev => ({
          ...prev,
          pitchAnalysisLoading: true,
          questionsLoading: true,
          feedbackLoading: true
        }));
        // use startSSE directly to avoid dependency cycle
        // close existing connection if any
        if (eventSourceRef.current) {
          console.log('[SessionDetails] Closing existing SSE connection');
          eventSourceRef.current.close();
        }
        
        if (isNavigatingAwayRef.current) {
          console.log('[SessionDetails] Skipping SSE start - component unmounting');
          return;
        }
        
        console.log('[SessionDetails] Starting SSE connection');
        
        const eventSource = trainingApi.createSSEConnection(
          sessionId,
          handleSSEMessage,
          handleSSEError
        );
        
        eventSourceRef.current = eventSource;
        
        // handle open event
        eventSource.onopen = () => {
          console.log('[SessionDetails] SSE connection opened');
        };
      }
      
      // 5. If initialized or recording - wait and retry
      if (['initialized', 'recording'].includes(initialStatus.status)) {
        console.log('[SessionDetails] Session not ready for processing, waiting...');
        setTimeout(() => {
          if (!isNavigatingAwayRef.current) {
            initializeSSERef.current?.(); // retry after 1 second
          }
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('[SessionDetails] SSE initialization error:', error);
      setError('Не удалось подключиться к серверу');
    }
  }, [sessionId, handleSSEMessage, handleSSEError, trainingApi]);

  // store initializeSSE in ref to avoid dependency issues
  initializeSSERef.current = initializeSSE;

  // removed unused startSSE function - using initializeSSE directly

  useEffect(() => {
    if (!sessionId) {
      navigate('/history');
      return;
    }

    // reset all refs on mount to handle React remount scenarios
    console.log(`[SessionDetails] Component mounted for session ${sessionId}, resetting state`);
    isNavigatingAwayRef.current = false;
    
    // create new abort controller for this session
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // start initialization using ref to avoid dependency loop
    initializeSSERef.current?.();

    // cleanup on unmount
    return () => {
      console.log(`[SessionDetails] Component unmounting, cleaning up SSE for session ${sessionId}`);
      
      // set navigation flag first to stop any ongoing operations
      isNavigatingAwayRef.current = true;
      
      // abort any ongoing requests
      if (abortControllerRef.current) {
        console.log(`[SessionDetails] Aborting ongoing requests on unmount`);
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // close SSE connection
      if (eventSourceRef.current) {
        console.log(`[SessionDetails] Closing SSE connection on unmount`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId, navigate]);


  return (
    <div>
      <h3 style={{ 
        marginBottom: '20px', 
        fontSize: '1.5rem' 
      }}>
        Результаты анализа сессии
      </h3>

      {/* error display */}
      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#d00'
        }}>
          {error}
        </div>
      )}

      {/* основное содержимое - компоненты как кирпичики */}
      <div className="session-details-grid">
        {/* транскрипт - первый компонент */}
        <TranscriptionComponent 
          segments={transcriptionData || []}
          isLoading={!componentState.transcriptionReady && isLoadingInitialData}
        />

        {/* Final score component - второй компонент (сразу после транскрипта) */}
        {componentState.analysisComplete && analysisData ? (
          <FinalScoreComponent 
            overallScore={calculateOverallScore(analysisData)}
            pitchMarks={analysisData.pitch_evaluation?.marks}
            isLoading={false}
          />
        ) : !componentState.metricsReady ? (
          /* Loading indicator when analysis not yet started */
          <div className="card" style={{
            padding: '20px 24px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#212529',
              marginBottom: '16px'
            }}>
              Анализ в процессе...
            </h3>
            <div style={{
              fontSize: '14px',
              color: '#6c757d',
              marginBottom: '16px'
            }}>
              {message}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4CAF50',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        ) : null}

        {/* Analysis components - show when metrics are ready (85% progress) */}
        {componentState.metricsReady && analysisData && (
          <>
            <PaceComponent 
              paceRate={analysisData.metrics?.pace_rate}
              paceMark={analysisData.metrics?.pace_mark}
            />
            
            <EnergyComponent 
              energyMark={analysisData.metrics?.emotion_mark}
              duration={transcriptionData ? Math.ceil(transcriptionData[transcriptionData.length - 1]?.end / 60) : 12}
            />
            
            <ClarityComponent 
              unclarityMoments={analysisData.pitch_evaluation?.unclarity_moments}
              avgSentenceLength={analysisData.metrics?.avg_sentences_len}
              repeatedWords={analysisData.pitch_evaluation?.filler_words}
            />
            
            <ConfidenceComponent 
              hesitantPhrases={analysisData.pitch_evaluation?.hesitant_phrases}
              fillerWords={analysisData.pitch_evaluation?.filler_words}
              totalWords={transcriptionData ? estimateTotalWords(transcriptionData) : 500}
            />
          </>
        )}

        {/* Pitch Evaluation - show loading, error, or ready state */}
        {/* <PitchEvaluationComponent 
          marks={analysisData?.pitch_evaluation?.marks}
          missing_blocks={analysisData?.pitch_evaluation?.missing_blocks}
          isLoading={componentState.pitchAnalysisLoading}
          hasError={componentState.pitchAnalysisError}
          errorMessage="Сервис анализа питча испытывает нагрузки. Пожалуйста, попробуйте позже."
        /> */}

        {/* Questions - show loading, error, or ready state */}
        <QuestionsComponent 
          questions={analysisData?.questions}
          isLoading={componentState.questionsLoading}
          hasError={componentState.questionsError}
          errorMessage="Сервис генерации вопросов испытывает нагрузки. Пожалуйста, попробуйте позже."
        />

        {/* Presentation Feedback - show loading, error, or ready state */}
        <PresentationFeedbackComponent 
          pros={analysisData?.presentation_feedback?.pros}
          cons={analysisData?.presentation_feedback?.cons}
          recommendations={analysisData?.presentation_feedback?.recommendations}
          feedback={analysisData?.presentation_feedback?.feedback}
          isLoading={componentState.feedbackLoading}
          hasError={componentState.feedbackError}
          errorMessage="Сервис анализа презентации испытывает нагрузки. Пожалуйста, попробуйте позже."
        />

      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={() => navigate('/history')}
          className="btn btn-primary"
        >
          Вернуться к списку сессий
        </button>
      </div>
    </div>
  );
};

// prevent component remounting with memo
export const SessionDetails = memo(SessionDetailsComponent);