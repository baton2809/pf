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
      
      // launch parallel operations WITHOUT waiting - they will complete independently
      // each operation will broadcast its results immediately when ready
      this.processMetricsAsync(sessionId, filePath, transcriptionData, metricsOpId);
      this.processPitchAsync(sessionId, transcriptText, textAnalyticsOpId);
      this.processFeedbackAsync(sessionId, transcriptText, feedbackOpId);
      
      processingTime.parallel_processing = Date.now() - parallelStart;
      
      logger.info('AudioProcessor', 'Parallel operations launched independently', {
        sessionId,
        launchTime: processingTime.parallel_processing,
        message: 'Operations will complete asynchronously and broadcast results independently'
      });
      
      
      // no longer waiting for all operations to complete
      // each operation will call checkAndFinalizeSession when done
      // the last operation to complete will finalize the session
      
      // update session status to indicate operations are running
      await database.updateSessionById(sessionId, {
        duration: audioDuration
      });
      
      processingTime.total = Date.now() - startTime;
      
      logger.info('AudioProcessor', 'Main processing flow complete, operations running independently', {
        sessionId,
        totalTimeBeforeAsync: processingTime.total,
        message: 'Operations will complete and broadcast results independently'
      });

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

  // calculate dynamic progress based on completed operations
  async calculateProgress(sessionId: string): Promise<number> {
    const operations = await database.getMLOperations(sessionId);
    const weights: { [key: string]: number } = {
      transcription: 30,
      questions: 15,
      speech_metrics: 20,
      text_analytics: 20,
      presentation_feedback: 15
    };
    
    let totalProgress = 0;
    for (const op of operations) {
      if (op.status === 'completed') {
        totalProgress += weights[op.operation_type] || 0;
      } else if (op.status === 'processing') {
        totalProgress += (weights[op.operation_type] || 0) * 0.5;
      }
    }
    
    return Math.min(totalProgress, 95); // reserve 5% for finalization
  }

  // process speech metrics asynchronously
  private async processMetricsAsync(
    sessionId: string, 
    filePath: string, 
    transcriptionData: any[],
    metricsOpId: string
  ): Promise<void> {
    try {
      await database.updateMLOperation(metricsOpId, 'processing');
      
      const result = await mlClient.getMetrics(filePath, transcriptionData);
      
      if (result.success) {
        await database.updateMLOperation(metricsOpId, 'completed', result.data);
        
        const progress = await this.calculateProgress(sessionId);
        sseManager.broadcast(sessionId, {
          type: 'metrics_ready',
          status: 'processing',
          progress,
          message: 'Speech metrics analysis completed',
          step: 'metrics_completed',
          sessionId,
          timestamp: new Date().toISOString(),
          data: result.data
        });
        
        logger.info('AudioProcessor', 'Metrics completed independently', { sessionId });
      } else {
        await database.updateMLOperation(metricsOpId, 'failed', null, result.error);
        
        sseManager.broadcast(sessionId, {
          type: 'metrics_failed',
          status: 'processing',
          progress: await this.calculateProgress(sessionId),
          message: 'Speech metrics analysis failed, other analyses continue',
          step: 'metrics_failed',
          sessionId,
          timestamp: new Date().toISOString(),
          error: result.error
        });
      }
      
      await this.checkAndFinalizeSession(sessionId);
    } catch (error: any) {
      logger.error('AudioProcessor', 'Metrics processing failed', { sessionId, error });
      await database.updateMLOperation(metricsOpId, 'failed', null, { 
        type: 'PROCESSING_ERROR', 
        message: error.message 
      });
    }
  }

  // process pitch analysis asynchronously
  private async processPitchAsync(
    sessionId: string,
    transcriptText: string,
    textAnalyticsOpId: string
  ): Promise<void> {
    try {
      await database.updateMLOperation(textAnalyticsOpId, 'processing');
      
      const result = await mlClient.getPitchAnalysis(transcriptText);
      
      if (result.success) {
        await database.updateMLOperation(textAnalyticsOpId, 'completed', result.data);
        
        const progress = await this.calculateProgress(sessionId);
        sseManager.broadcast(sessionId, {
          type: 'pitch_analysis_ready',
          status: 'processing',
          progress,
          message: 'Pitch analysis completed',
          step: 'pitch_analysis_completed',
          sessionId,
          timestamp: new Date().toISOString(),
          data: result.data
        });
        
        logger.info('AudioProcessor', 'Pitch analysis completed independently', { sessionId });
      } else {
        await database.updateMLOperation(textAnalyticsOpId, 'failed', null, result.error);
        
        sseManager.broadcast(sessionId, {
          type: 'pitch_analysis_failed',
          status: 'processing',
          progress: await this.calculateProgress(sessionId),
          message: 'Pitch analysis failed, other analyses continue',
          step: 'pitch_analysis_failed',
          sessionId,
          timestamp: new Date().toISOString(),
          error: result.error
        });
      }
      
      await this.checkAndFinalizeSession(sessionId);
    } catch (error: any) {
      logger.error('AudioProcessor', 'Pitch analysis processing failed', { sessionId, error });
      await database.updateMLOperation(textAnalyticsOpId, 'failed', null, { 
        type: 'PROCESSING_ERROR', 
        message: error.message 
      });
    }
  }

  // process presentation feedback asynchronously
  private async processFeedbackAsync(
    sessionId: string,
    transcriptText: string,
    feedbackOpId: string
  ): Promise<void> {
    try {
      await database.updateMLOperation(feedbackOpId, 'processing');
      
      const result = await mlClient.getPresentationFeedback(transcriptText);
      
      if (result.success) {
        await database.updateMLOperation(feedbackOpId, 'completed', result.data);
        
        const progress = await this.calculateProgress(sessionId);
        sseManager.broadcast(sessionId, {
          type: 'feedback_ready',
          status: 'processing',
          progress,
          message: 'Presentation feedback completed',
          step: 'feedback_completed',
          sessionId,
          timestamp: new Date().toISOString(),
          data: result.data
        });
        
        logger.info('AudioProcessor', 'Feedback completed independently', { sessionId });
      } else {
        await database.updateMLOperation(feedbackOpId, 'failed', null, result.error);
        
        sseManager.broadcast(sessionId, {
          type: 'feedback_failed',
          status: 'processing',
          progress: await this.calculateProgress(sessionId),
          message: 'Presentation feedback failed, other analyses continue',
          step: 'feedback_failed',
          sessionId,
          timestamp: new Date().toISOString(),
          error: result.error
        });
      }
      
      await this.checkAndFinalizeSession(sessionId);
    } catch (error: any) {
      logger.error('AudioProcessor', 'Feedback processing failed', { sessionId, error });
      await database.updateMLOperation(feedbackOpId, 'failed', null, { 
        type: 'PROCESSING_ERROR', 
        message: error.message 
      });
    }
  }

  // check if all operations are complete and finalize session
  private async checkAndFinalizeSession(sessionId: string): Promise<void> {
    const operations = await database.getMLOperations(sessionId);
    
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const processing = operations.filter(op => op.status === 'processing').length;
    
    // if still processing, wait
    if (processing > 0) {
      return;
    }
    
    // all operations finished (success or failure)
    const allOps = operations.length;
    let finalStatus: 'completed' | 'partial' | 'failed';
    let finalMessage: string;
    
    if (completed === allOps) {
      finalStatus = 'completed';
      finalMessage = 'All analyses completed successfully';
    } else if (completed > 0) {
      finalStatus = 'partial';
      finalMessage = `${completed} of ${allOps} analyses completed`;
    } else {
      finalStatus = 'failed';
      finalMessage = 'All analyses failed';
    }
    
    // build all available results
    const mlResults = await database.buildCompatibleMLResults(sessionId);
    
    // update session
    await database.updateSessionById(sessionId, {
      status: finalStatus === 'failed' ? 'failed' : 'completed',
      mlResults,
      mlProcessingStatus: finalStatus,
      completedAt: new Date()
    });
    
    // send final event
    sseManager.broadcast(sessionId, {
      type: 'session_completed',
      status: finalStatus,
      progress: 100,
      message: finalMessage,
      step: 'session_finalized',
      sessionId,
      timestamp: new Date().toISOString(),
      data: mlResults,
      summary: {
        total: allOps,
        completed,
        failed
      }
    });
    
    logger.info('AudioProcessor', 'Session finalized', {
      sessionId,
      finalStatus,
      completed,
      failed,
      total: allOps
    });
    
    // close SSE connections after 2 seconds
    setTimeout(() => {
      sseManager.closeAll(sessionId);
    }, 2000);
  }

  // start async processing without blocking
  startProcessing(sessionId: string, filePath: string): void {
    this.processAudioAsync(sessionId, filePath).catch(error => {
      logger.error('AudioProcessor', 'Failed to start processing', { sessionId, error });
    });
  }
}

export const audioProcessor = new AudioProcessor();