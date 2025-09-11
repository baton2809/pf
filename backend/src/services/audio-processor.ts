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
      questions: 0,
      parallel_processing: 0,
      metrics: 0,
      pitch_analysis: 0,
      presentation_feedback: 0,
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

      // update ML processing status
      await database.updateSessionById(sessionId, { mlProcessingStatus: 'in_progress' });

      // stage 2: transcription (blocking stage - needed for all others)
      this.emitProgress(sessionId, 25, 'transcribing_audio');
      const transcriptionStart = Date.now();
      
      const transcriptionOpId = await database.createMLOperation(sessionId, 'transcription', { filePath });
      await database.updateMLOperation(transcriptionOpId, 'processing');
      
      const transcriptionResult = await mlClient.getTranscription(filePath);
      processingTime.transcription = Date.now() - transcriptionStart;
      
      if (!transcriptionResult.success) {
        logger.error('AudioProcessor', 'Transcription failed', {
          sessionId,
          error: transcriptionResult.error
        });
        await database.updateMLOperation(transcriptionOpId, 'failed', null, transcriptionResult.error);
        throw new Error(`Transcription failed: ${transcriptionResult.error?.message}`);
      }

      await database.updateMLOperation(transcriptionOpId, 'completed', transcriptionResult.data);
      const transcriptionData = transcriptionResult.data!; // assured by success check above

      if (!transcriptionData || transcriptionData.length === 0) {
        throw new Error('No transcription data received');
      }

      // calculate duration from transcription results
      let audioDuration = 0;
      const lastSegment = transcriptionData[transcriptionData.length - 1];
      if (lastSegment && lastSegment.end) {
        audioDuration = Math.ceil(lastSegment.end);
      }

      // extract text for text-based analysis
      const transcriptText = mlClient.extractTextFromSegments(transcriptionData);
      
      // save transcription text to session for future retry capability
      await database.updateSessionById(sessionId, { transcriptionText: transcriptText });

      // broadcast transcription completion with segments data
      sseManager.broadcast(sessionId, {
        type: 'transcription_completed',
        segments: transcriptionData,
        progress: 35,
        message: 'Speech transcribed successfully',
        step: 'transcription_completed',
        sessionId,
        timestamp: new Date().toISOString()
      });

      logger.info('AudioProcessor', 'Transcription completed, starting questions generation', {
        sessionId,
        audioDuration,
        textLength: transcriptText?.length || 0,
        transcriptionSegments: transcriptionData.length
      });

      // stage 3: questions generation (depends on transcription)
      this.emitProgress(sessionId, 45, 'generating_questions');
      const questionsStart = Date.now();
      
      const questionsOpId = await database.createMLOperation(sessionId, 'questions', { text: transcriptText });
      await database.updateMLOperation(questionsOpId, 'processing');
      
      const questionsResult = await mlClient.generateQuestions(transcriptText, 5);
      processingTime.questions = Date.now() - questionsStart;
      
      if (questionsResult.success) {
        await database.updateMLOperation(questionsOpId, 'completed', questionsResult.data);
        logger.info('AudioProcessor', 'Questions generated successfully', {
          sessionId,
          questionsCount: questionsResult.data?.length || 0
        });
      } else {
        await database.updateMLOperation(questionsOpId, 'failed', null, questionsResult.error);
        logger.warn('AudioProcessor', 'Questions generation failed, continuing with other operations', {
          sessionId,
          error: questionsResult.error
        });
      }

      // stage 4: parallel processing of remaining operations
      this.emitProgress(sessionId, 55, 'analyzing_all_metrics');
      const parallelStart = Date.now();
      
      // broadcast parallel processing start
      sseManager.broadcast(sessionId, {
        type: 'progress',
        status: 'processing',
        progress: 60,
        message: 'Running speech analysis, pitch evaluation and presentation feedback in parallel',
        step: 'parallel_processing_start',
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // create ML operations for parallel execution
      const metricsOpId = await database.createMLOperation(sessionId, 'speech_metrics', { 
        filePath, 
        transcriptionData 
      });
      const textAnalyticsOpId = await database.createMLOperation(sessionId, 'text_analytics', { 
        text: transcriptText 
      });
      const feedbackOpId = await database.createMLOperation(sessionId, 'presentation_feedback', { 
        text: transcriptText 
      });
      
      // mark operations as processing
      await Promise.all([
        database.updateMLOperation(metricsOpId, 'processing'),
        database.updateMLOperation(textAnalyticsOpId, 'processing'),
        database.updateMLOperation(feedbackOpId, 'processing')
      ]);
      
      // parallel execution of all operations that can run simultaneously
      const [metricsResult, pitchAnalysisResult, feedbackResult] = await Promise.allSettled([
        // Speech metrics (needs audio file + transcription)
        (async () => {
          const start = Date.now();
          const result = await mlClient.getMetrics(filePath, transcriptionData);
          processingTime.metrics = Date.now() - start;
          
          if (result.success) {
            await database.updateMLOperation(metricsOpId, 'completed', result.data);
          } else {
            await database.updateMLOperation(metricsOpId, 'failed', null, result.error);
          }
          return result;
        })(),
        
        // Pitch analysis (needs only text)
        (async () => {
          const start = Date.now();
          const result = await mlClient.getPitchAnalysis(transcriptText);
          processingTime.pitch_analysis = Date.now() - start;
          
          if (result.success) {
            await database.updateMLOperation(textAnalyticsOpId, 'completed', result.data);
          } else {
            await database.updateMLOperation(textAnalyticsOpId, 'failed', null, result.error);
          }
          return result;
        })(),
        
        // Presentation feedback (needs only text)
        (async () => {
          const start = Date.now();
          const result = await mlClient.getPresentationFeedback(transcriptText);
          processingTime.presentation_feedback = Date.now() - start;
          
          if (result.success) {
            await database.updateMLOperation(feedbackOpId, 'completed', result.data);
          } else {
            await database.updateMLOperation(feedbackOpId, 'failed', null, result.error);
          }
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
        feedbackTime: processingTime.presentation_feedback,
        questionsTime: processingTime.questions,
        results: {
          metricsSuccess: metricsResult.status === 'fulfilled' && metricsResult.value.success,
          pitchSuccess: pitchAnalysisResult.status === 'fulfilled' && pitchAnalysisResult.value.success,
          feedbackSuccess: feedbackResult.status === 'fulfilled' && feedbackResult.value.success
        }
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

      // build results from database (for compatibility and retry capability)
      const compatibleResults = await database.buildCompatibleMLResults(sessionId);
      
      // determine overall processing status
      const completedOperations = await database.getMLOperations(sessionId);
      const hasFailures = completedOperations.some(op => op.status === 'failed');
      const allCompleted = completedOperations.every(op => op.status === 'completed');
      
      let mlProcessingStatus: 'completed' | 'partial' | 'failed';
      if (allCompleted) {
        mlProcessingStatus = 'completed';
      } else if (completedOperations.some(op => op.status === 'completed')) {
        mlProcessingStatus = 'partial';
      } else {
        mlProcessingStatus = 'failed';
      }

      // stage 5: completed (100%) - critical database update with error handling
      logger.info('AudioProcessor', 'Starting final database update', {
        sessionId,
        mlProcessingStatus,
        hasCompatibleResults: !!compatibleResults,
        operationsCount: completedOperations.length,
        failedOperationsCount: completedOperations.filter(op => op.status === 'failed').length
      });

      try {
        const updatedSession = await database.updateSessionById(sessionId, {
          status: mlProcessingStatus === 'failed' ? 'failed' : 'completed',
          mlResults: compatibleResults, // for compatibility with existing frontend
          mlProcessingStatus: mlProcessingStatus,
          duration: audioDuration,
          completedAt: new Date()
        });

        if (!updatedSession) {
          throw new Error('Database update returned null - session may not exist');
        }

        logger.info('AudioProcessor', 'Database update successful', {
          sessionId,
          finalStatus: updatedSession.status,
          mlProcessingStatus: updatedSession.ml_processing_status,
          hasMlResults: !!updatedSession.ml_results,
          completedAt: updatedSession.completed_at
        });

        // only emit progress after successful database update
        this.emitProgress(sessionId, 100, 'completed', compatibleResults);
        
        // close all SSE connections after sending completion
        setTimeout(() => {
          sseManager.closeAll(sessionId);
        }, 2000); // give time for client to receive completion data
        
        const timeSaved = (processingTime.metrics + processingTime.pitch_analysis + processingTime.presentation_feedback) - processingTime.parallel_processing;
        
        // user completion activity
        logger.info('UserActivity', 'Processing completed', {
          sessionId,
          mlProcessingStatus,
          totalProcessingTime: `${processingTime.total}ms`,
          stages: {
            transcription: `${processingTime.transcription}ms`,
            questions: `${processingTime.questions}ms`,
            parallelProcessing: `${processingTime.parallel_processing}ms`
          },
          operations: {
            completed: completedOperations.filter(op => op.status === 'completed').length,
            failed: completedOperations.filter(op => op.status === 'failed').length,
            total: completedOperations.length
          }
        });

        logger.info('AudioProcessor', 'Processing pipeline completed', {
          sessionId,
          totalTime: processingTime.total,
          timeSaved,
          mlProcessingStatus,
          operationsStatus: completedOperations.reduce((acc, op) => {
            acc[op.operation_type] = op.status;
            return acc;
          }, {} as Record<string, string>)
        });

      } catch (dbError: any) {
        logger.error('AudioProcessor', 'CRITICAL: Failed to save session update to database', {
          sessionId,
          dbError: dbError.message,
          mlProcessingStatus,
          operationsCompleted: completedOperations.length
        });

        // set status to failed since we can't save the results
        try {
          await database.updateSessionById(sessionId, { 
            status: 'failed',
            mlProcessingStatus: 'failed' 
          });
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
        stage: 'processing'
      });
      
      // attempt to update status to failed (this is a fallback, may also fail)
      try {
        await database.updateSessionById(sessionId, { 
          status: 'failed',
          mlProcessingStatus: 'failed'
        });
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

  // new method to retry failed operations
  async retryFailedOperations(sessionId: string): Promise<void> {
    try {
      const session = await database.getSessionBySessionId(sessionId);
      if (!session || !session.transcription_text) {
        throw new Error('Session not found or no transcription text available');
      }

      const failedOps = await database.getFailedMLOperations(sessionId);
      logger.info('AudioProcessor', 'Starting retry of failed operations', {
        sessionId,
        failedOpsCount: failedOps.length,
        operations: failedOps.map(op => op.operation_type)
      });

      for (const failedOp of failedOps) {
        logger.info('AudioProcessor', 'Retrying failed operation', {
          sessionId,
          operationType: failedOp.operation_type,
          operationId: failedOp.id,
          attemptCount: failedOp.attempt_count
        });

        await database.updateMLOperation(failedOp.id, 'processing');

        let result: any;
        switch (failedOp.operation_type) {
          case 'transcription':
            result = await mlClient.getTranscription(failedOp.input_data.filePath);
            break;
          case 'questions':
            result = await mlClient.generateQuestions(failedOp.input_data.text, 5);
            break;
          case 'speech_metrics':
            result = await mlClient.getMetrics(
              failedOp.input_data.filePath, 
              failedOp.input_data.transcriptionData
            );
            break;
          case 'text_analytics':
            result = await mlClient.getPitchAnalysis(failedOp.input_data.text);
            break;
          case 'presentation_feedback':
            result = await mlClient.getPresentationFeedback(failedOp.input_data.text);
            break;
          default:
            logger.warn('AudioProcessor', 'Unknown operation type for retry', {
              operationType: failedOp.operation_type
            });
            continue;
        }

        if (result.success) {
          await database.updateMLOperation(failedOp.id, 'completed', result.data);
          logger.info('AudioProcessor', 'Operation retry successful', {
            sessionId,
            operationType: failedOp.operation_type,
            operationId: failedOp.id
          });
        } else {
          await database.updateMLOperation(failedOp.id, 'failed', null, result.error);
          logger.warn('AudioProcessor', 'Operation retry failed again', {
            sessionId,
            operationType: failedOp.operation_type,
            operationId: failedOp.id,
            error: result.error
          });
        }
      }

      // update session with new combined results
      const updatedResults = await database.buildCompatibleMLResults(sessionId);
      const operations = await database.getMLOperations(sessionId);
      
      const allCompleted = operations.every(op => op.status === 'completed');
      const hasCompleted = operations.some(op => op.status === 'completed');
      
      let newMlStatus: 'completed' | 'partial' | 'failed';
      if (allCompleted) {
        newMlStatus = 'completed';
      } else if (hasCompleted) {
        newMlStatus = 'partial';
      } else {
        newMlStatus = 'failed';
      }

      await database.updateSessionById(sessionId, {
        mlResults: updatedResults,
        mlProcessingStatus: newMlStatus,
        status: newMlStatus === 'failed' ? 'failed' : 'completed'
      });

      logger.info('AudioProcessor', 'Retry operations completed', {
        sessionId,
        newMlStatus,
        operationsStatus: operations.reduce((acc, op) => {
          acc[op.operation_type] = op.status;
          return acc;
        }, {} as Record<string, string>)
      });

    } catch (error: any) {
      logger.error('AudioProcessor', 'Retry operations failed', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  // Helper method to process text analysis for existing sessions (legacy)
  async processTextAnalysis(sessionId: string): Promise<ExtendedMLResults | null> {
    try {
      const session = await database.getSessionBySessionId(sessionId);
      
      if (!session || !session.transcription_text) {
        throw new Error('Session not found or has no transcription data');
      }

      const transcriptText = session.transcription_text;

      // use the new retry mechanism instead
      await this.retryFailedOperations(sessionId);
      
      // return updated results from database
      const updatedSession = await database.getSessionBySessionId(sessionId);
      return updatedSession?.ml_results || null;

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