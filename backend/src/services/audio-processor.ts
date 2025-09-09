import { database } from './database';
import { mlClient } from './ml-client';

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

    console.log(`Progress update for session ${sessionId}: ${stage} (${progress}%)`);
    
    // emit to all listeners
    this.progressListeners.forEach(listener => {
      try {
        listener(sessionId, progressData);
      } catch (error) {
        console.error('progress listener error:', error);
      }
    });
  }

  async processAudioAsync(sessionId: string, filePath: string): Promise<void> {
    try {
      // stage 1: starting processing
      this.emitProgress(sessionId, 10, 'processing_started');
      await database.updateSession(sessionId, { status: 'processing' });

      // stage 2: calling ML transcription service (REAL request)
      this.emitProgress(sessionId, 30, 'transcribing_audio');
      
      const transcriptionResult = await mlClient.getTranscription(filePath);
      
      // stage 3: transcription completed - immediately complete and show results!
      if (transcriptionResult && transcriptionResult.length > 0) {
        // calculate duration from transcription results
        let audioDuration = 0;
        const lastSegment = transcriptionResult[transcriptionResult.length - 1];
        if (lastSegment && lastSegment.end) {
          audioDuration = Math.ceil(lastSegment.end); // duration in seconds
          console.log(`Calculated audio duration: ${audioDuration} seconds from transcription end time: ${lastSegment.end}`);
        } else {
          console.log('No transcription segments found or no end time, duration will be 0');
        }

        const resultsWithTranscriptionOnly = {
          speech_segments: transcriptionResult,
          metrics: null, // metrics will be added later
          temp_rate: 1.2 // default value
        };

        // save session as completed with transcription and duration
        await database.updateSession(sessionId, {
          status: 'completed',
          mlResults: resultsWithTranscriptionOnly,
          duration: audioDuration
        });

        // emit completed immediately after transcription - user sees results right away!
        this.emitProgress(sessionId, 100, 'completed', resultsWithTranscriptionOnly);
        console.log(`audio processing completed for session: ${sessionId} (transcription only, duration: ${audioDuration}s, metrics in background)`);

        // start background metrics processing (don't await)
        this.processMetricsInBackground(sessionId, filePath, transcriptionResult);
      } else {
        throw new Error('No transcription data received');
      }

    } catch (error) {
      console.error(`audio processing failed for session: ${sessionId}`, error);
      
      // update status to failed
      await database.updateSession(sessionId, { status: 'failed' });
      
      // emit error progress
      this.emitProgress(sessionId, 0, 'error', null, error instanceof Error ? error.message : 'unknown error');
    }
  }

  // background metrics processing - runs after user already sees results
  private async processMetricsInBackground(sessionId: string, filePath: string, transcriptionData: any[]): Promise<void> {
    try {
      console.log(`starting background metrics processing for session: ${sessionId}`);
      
      const metricsData = await mlClient.getMetrics(filePath, transcriptionData);
      
      if (metricsData) {
        // update session with metrics data
        const currentSession = await database.getSession(sessionId);
        if (currentSession?.mlResults) {
          const updatedResults = {
            ...currentSession.mlResults,
            metrics: metricsData,
            temp_rate: metricsData.speaking_rate || 1.2
          };
          
          await database.updateSession(sessionId, {
            mlResults: updatedResults
          });
          
          console.log(`background metrics completed for session: ${sessionId}`);
        }
      }
    } catch (error) {
      console.log(`background metrics failed for session: ${sessionId}`, error instanceof Error ? error.message : 'unknown error');
      // metrics failure is not critical - user already has transcription results
    }
  }

  // start async processing without blocking
  startProcessing(sessionId: string, filePath: string): void {
    // fire and forget - don't await this
    this.processAudioAsync(sessionId, filePath).catch(error => {
      console.error(`failed to start processing for session: ${sessionId}`, error);
    });
  }
}

export const audioProcessor = new AudioProcessor();