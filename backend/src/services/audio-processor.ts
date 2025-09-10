import { database } from './database';
import { mlClient } from './ml-client';
import { ExtendedMLResults } from '../types/audio';
import { logger } from '../utils/logger';
import { sseManager } from './sse-manager';

type ProgressListener = (sessionId: string, progress: {
  progress: number;
  stage: string;
  sessionId: string;
  data?: any;
  error?: string;
}) => void;

class AudioProcessor {
  private progressListeners: ProgressListener[] = [];

  addProgressListener(listener: ProgressListener): void {
    this.progressListeners.push(listener);
  }

  removeProgressListener(listener: ProgressListener): void {
    const index = this.progressListeners.indexOf(listener);
    if (index > -1) {
      this.progressListeners.splice(index, 1);
    }
  }

  private emitProgress(sessionId: string, progress: number, stage: string, data?: any, error?: string): void {
    const progressData = {
      progress,
      stage,
      sessionId,
      ...(data && { data }),
      ...(error && { error })
    };

    logger.info('AudioProcessor', 'Progress update', { 
      sessionId, 
      stage, 
      progress 
    });
    
    // broadcast via SSE to all connected clients
    const sseData = {
      type: error ? 'error' : 'progress',
      status: error ? 'failed' : (progress === 100 ? 'completed' : 'processing'),
      progress,
      message: this.getStageMessage(stage),
      step: stage,
      sessionId,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
      ...(error && { error })
    };
    
    sseManager.broadcast(sessionId, sseData);
    
    // emit to all listeners (backward compatibility)
    this.progressListeners.forEach(listener => {
      try {
        listener(sessionId, progressData);
      } catch (error) {
        logger.error('AudioProcessor', 'Progress listener error', error);
      }
    });
  }

  private getStageMessage(stage: string): string {
    switch (stage) {
      case 'processing_started':
        return 'Preparing for analysis...';
      case 'converting_audio':
        return 'Converting audio format...';
      case 'transcribing_audio':
        return 'Transcribing audio...';
      case 'analyzing_all_metrics':
        return 'Running parallel analysis...';
      case 'completed':
        return 'Analysis complete!';
      case 'error':
        return 'Processing failed';
      default:
        return `Processing: ${stage}`;
    }
  }

  async processAudioAsync(sessionId: string, filePath: string): Promise<void> {
    const startTime = Date.now();
    const processingTime = {
      transcription: 0,
      parallel_processing: 0,
      metrics: 0,
      pitch_analysis: 0,
      questions: 0,
      total: 0
    };

    try {
      // stage 0: ML service health check
      logger.info('AudioProcessor', 'Checking ML service health before processing', { sessionId });
      const mlHealthy = await mlClient.healthCheck();
      
      if (!mlHealthy) {
        logger.warn('AudioProcessor', 'ML service unhealthy, switching to mock mode', { sessionId });
        sseManager.broadcast(sessionId, {
          type: 'warning',
          status: 'processing',
          progress: 2,
          message: 'ML service unavailable, using fallback mode',
          step: 'ml_service_check',
          sessionId,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.info('AudioProcessor', 'ML service healthy, proceeding with normal processing', { sessionId });
        sseManager.broadcast(sessionId, {
          type: 'progress',
          status: 'processing',
          progress: 2,
          message: 'ML service connected successfully',
          step: 'ml_service_check',
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      // stage 1: starting processing  
      this.emitProgress(sessionId, 5, 'processing_started');
      await database.updateSessionById(sessionId, { status: 'processing' });
      
      // stage 1.5: audio conversion (happens during transcription call)
      this.emitProgress(sessionId, 10, 'converting_audio');

      // stage 2: transcription (blocking stage - needed for all others)
      this.emitProgress(sessionId, 25, 'transcribing_audio');
      const transcriptionStart = Date.now();
      
      const transcriptionResult = await mlClient.getTranscription(filePath);
      processingTime.transcription = Date.now() - transcriptionStart;
      
      if (!transcriptionResult || transcriptionResult.length === 0) {
        logger.error('AudioProcessor', 'No transcription data received after mock generation', {
          sessionId,
          filePath
        });
        throw new Error('No transcription data received');
      }

      // calculate duration from transcription results
      let audioDuration = 0;
      const lastSegment = transcriptionResult[transcriptionResult.length - 1];
      if (lastSegment && lastSegment.end) {
        audioDuration = Math.ceil(lastSegment.end);
      }

      // extract text for text-based analysis
      const transcriptText = mlClient.extractTextFromSegments(transcriptionResult);

      // broadcast transcription completion with segments data
      sseManager.broadcast(sessionId, {
        type: 'transcription_completed',
        segments: transcriptionResult,
        progress: 35,
        message: 'Speech transcribed successfully',
        step: 'transcription_completed',
        sessionId,
        timestamp: new Date().toISOString()
      });

      logger.info('AudioProcessor', 'Transcription completed, starting parallel processing', {
        sessionId,
        audioDuration,
        textLength: transcriptText?.length || 0,
        transcriptionSegments: transcriptionResult.length
      });

      // stage 3: parallel processing of all dependent operations
      this.emitProgress(sessionId, 45, 'analyzing_all_metrics');
      const parallelStart = Date.now();
      
      // broadcast parallel processing start
      sseManager.broadcast(sessionId, {
        type: 'progress',
        status: 'processing',
        progress: 50,
        message: 'Running speech analysis, pitch evaluation and question generation in parallel',
        step: 'parallel_processing_start',
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // parallel execution of all operations that can run simultaneously
      const [metricsData, pitchAnalysis, questions] = await Promise.all([
        // Speech metrics (needs audio file + transcription)
        (async () => {
          const start = Date.now();
          const result = await mlClient.getMetrics(filePath, transcriptionResult);
          processingTime.metrics = Date.now() - start;
          return result;
        })(),
        
        // Pitch analysis (needs only text)
        (async () => {
          const start = Date.now();
          const result = transcriptText ? await mlClient.getPitchAnalysis(transcriptText) : null;
          processingTime.pitch_analysis = Date.now() - start;
          return result;
        })(),
        
        // Question generation (needs only text)
        (async () => {
          const start = Date.now();
          const result = transcriptText ? await mlClient.generateQuestions(transcriptText, 5) : null;
          processingTime.questions = Date.now() - start;
          return result;
        })()
      ]);

      processingTime.parallel_processing = Date.now() - parallelStart;
      processingTime.total = Date.now() - startTime;
      
      logger.info('AudioProcessor', 'Parallel processing completed', {
        sessionId,
        parallelTime: processingTime.parallel_processing,
        metricsTime: processingTime.metrics,
        pitchTime: processingTime.pitch_analysis,
        questionsTime: processingTime.questions
      });
      
      // broadcast parallel processing completion
      sseManager.broadcast(sessionId, {
        type: 'progress',
        status: 'processing',
        progress: 85,
        message: 'All analysis completed, preparing final results',
        step: 'parallel_processing_completed',
        sessionId,
        timestamp: new Date().toISOString()
      });

      // compile full results
      const fullResults: ExtendedMLResults = {
        speech_segments: transcriptionResult,
        metrics: metricsData || undefined,
        pitch_evaluation: pitchAnalysis?.pitch_evaluation || undefined,
        advices: pitchAnalysis?.advices || undefined,
        pitch_summary: pitchAnalysis?.pitch_summary || undefined,
        questions: questions || undefined,
        temp_rate: metricsData?.pace_rate || 1.2,
        processing_time: processingTime
      };

      // stage 4: completed (100%) - critical database update with error handling
      logger.info('AudioProcessor', 'Starting final database update', {
        sessionId,
        resultsReady: {
          transcriptionSegments: fullResults.speech_segments?.length || 0,
          hasMetrics: !!fullResults.metrics,
          hasPitchAnalysis: !!fullResults.pitch_evaluation,
          questionsCount: fullResults.questions?.length || 0
        }
      });

      try {
        const updatedSession = await database.updateSessionById(sessionId, {
          status: 'completed',
          mlResults: fullResults,
          duration: audioDuration,
          completedAt: new Date()
        });

        if (!updatedSession) {
          throw new Error('Database update returned null - session may not exist');
        }

        logger.info('AudioProcessor', 'Database update successful', {
          sessionId,
          finalStatus: updatedSession.status,
          hasMlResults: !!updatedSession.ml_results,
          completedAt: updatedSession.completed_at
        });

        // only emit progress after successful database update
        this.emitProgress(sessionId, 100, 'completed', fullResults);
        
        // close all SSE connections after sending completion
        setTimeout(() => {
          sseManager.closeAll(sessionId);
        }, 2000); // give time for client to receive completion data
        
        const timeSaved = (processingTime.metrics + processingTime.pitch_analysis + processingTime.questions) - processingTime.parallel_processing;
        
        // user completion activity
        logger.info('UserActivity', 'Processing completed successfully', {
          sessionId,
          totalProcessingTime: `${processingTime.total}ms`,
          stages: {
            transcription: `${processingTime.transcription}ms`,
            parallelProcessing: `${processingTime.parallel_processing}ms`
          },
          results: {
            speechSegments: fullResults.speech_segments?.length || 0,
            hasMetrics: !!fullResults.metrics,
            hasPitchAnalysis: !!fullResults.pitch_evaluation,
            questionsGenerated: fullResults.questions?.length || 0
          }
        });

        logger.info('AudioProcessor', 'Processing pipeline completed successfully', {
          sessionId,
          totalTime: processingTime.total,
          timeSaved,
          hasTranscription: !!fullResults.speech_segments?.length,
          hasMetrics: !!fullResults.metrics,
          hasPitchAnalysis: !!fullResults.pitch_evaluation,
          questionsCount: fullResults.questions?.length || 0
        });

      } catch (dbError: any) {
        logger.error('AudioProcessor', 'CRITICAL: Failed to save ML results to database', {
          sessionId,
          dbError: dbError.message,
          processingWasSuccessful: true,
          resultsLost: {
            transcriptionSegments: fullResults.speech_segments?.length || 0,
            hasMetrics: !!fullResults.metrics,
            hasPitchAnalysis: !!fullResults.pitch_evaluation,
            questionsCount: fullResults.questions?.length || 0
          }
        });

        // set status to failed since we can't save the results
        try {
          await database.updateSessionById(sessionId, { status: 'failed' });
          this.emitProgress(sessionId, 0, 'error', null, 'Failed to save results to database');
        } catch (fallbackError: any) {
          logger.error('AudioProcessor', 'CRITICAL: Even fallback status update failed', {
            sessionId,
            fallbackError: fallbackError.message
          });
        }
        
        // re-throw to be caught by outer catch block
        throw new Error(`Database save failed: ${dbError.message}`);
      }

    } catch (error: any) {
      logger.error('AudioProcessor', 'Processing pipeline failed', { 
        sessionId, 
        error: error.message,
        errorType: error.constructor.name,
        stage: 'unknown'
      });
      
      // attempt to update status to failed (this is a fallback, may also fail)
      try {
        await database.updateSessionById(sessionId, { status: 'failed' });
        this.emitProgress(sessionId, 0, 'error', null, error.message);
        
        logger.info('AudioProcessor', 'Session status updated to failed', { sessionId });
      } catch (statusUpdateError: any) {
        logger.error('AudioProcessor', 'CRITICAL: Could not update session status to failed', {
          sessionId,
          originalError: error.message,
          statusUpdateError: statusUpdateError.message
        });
        
        // emit progress anyway to notify frontend of failure
        this.emitProgress(sessionId, 0, 'error', null, 'Processing failed and could not update database');
      }
    }
  }

  // Helper method to process text analysis for existing sessions
  async processTextAnalysis(sessionId: string): Promise<ExtendedMLResults | null> {
    try {
      const session = await database.getSessionBySessionId(sessionId);
      
      if (!session || !session.mlResults?.speech_segments) {
        throw new Error('Session not found or has no transcription data');
      }

      const transcriptText = mlClient.extractTextFromSegments(session.mlResults.speech_segments);
      
      if (!transcriptText) {
        throw new Error('No text found in transcription');
      }

      // parallel processing of pitch analysis and questions
      const [pitchAnalysis, questions] = await Promise.all([
        mlClient.getPitchAnalysis(transcriptText),
        mlClient.generateQuestions(transcriptText, 5)
      ]);

      const updatedResults: ExtendedMLResults = {
        ...session.mlResults,
        pitch_evaluation: pitchAnalysis?.pitch_evaluation || undefined,
        advices: pitchAnalysis?.advices || undefined,
        pitch_summary: pitchAnalysis?.pitch_summary || undefined,
        questions: questions || undefined
      };

      await database.updateSessionById(sessionId, {
        mlResults: updatedResults
      });

      return updatedResults;
    } catch (error) {
      logger.error('AudioProcessor', 'Text analysis failed', { sessionId, error });
      return null;
    }
  }

  // start async processing without blocking
  startProcessing(sessionId: string, filePath: string): void {
    this.processAudioAsync(sessionId, filePath).catch(error => {
      logger.error('AudioProcessor', 'Failed to start processing', { sessionId, error });
    });
  }
}

export const audioProcessor = new AudioProcessor();