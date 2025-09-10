import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../services/database';
import { audioProcessor } from '../services/audio-processor';
import { logger } from '../utils/logger';
import { sseManager } from '../services/sse-manager';

const trainingRoutes: FastifyPluginAsync = async (fastify) => {
  
  // create training endpoint (step 1 in refactoring.md)
  fastify.post<{
    Body: {
      title: string;
      type: string;
      userId: string;
    };
    Reply: { trainingId: string; status: string } | { error: string };
  }>('/api/training/create', async (request, reply) => {
    try {
      const { title, type = 'presentation', userId } = request.body;
      
      if (!title || !userId) {
        return reply.code(400).send({ error: 'title and userId are required' });
      }

      const trainingId = uuidv4();
      
      await database.createTraining({
        id: trainingId,
        title,
        type,
        userId,
        status: 'created'
      });
      
      logger.info('TrainingCreate', 'Training created successfully', {
        trainingId,
        title,
        type,
        userId
      });
      
      return { 
        trainingId, 
        status: 'created' 
      };
    } catch (error: any) {
      logger.error('TrainingCreate', 'Failed to create training', error);
      return reply.code(500).send({ error: 'Failed to create training' });
    }
  });

  // upload presentation endpoint (step 2 in refactoring.md)
  fastify.post<{
    Params: { trainingId: string };
    Reply: { message: string; hasPresentation: boolean } | { error: string };
  }>('/api/training/:trainingId/presentation', async (request, reply) => {
    const fs = require('fs');
    const { pipeline } = require('stream');
    const { promisify } = require('util');
    const pump = promisify(pipeline);
    
    try {
      const { trainingId } = request.params;
      
      // get training from database
      const training = await database.getTraining(trainingId);
      if (!training) {
        return reply.code(404).send({ error: 'Training not found' });
      }
      
      // get file from multipart form
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No presentation file uploaded' });
      }
      
      // ensure presentations directory exists
      if (!fs.existsSync('./uploads/presentations')) {
        fs.mkdirSync('./uploads/presentations', { recursive: true });
      }
      
      const filePath = `./uploads/presentations/${trainingId}_presentation.${data.filename?.split('.').pop() || 'pdf'}`;
      
      // save file using stream
      const writeStream = fs.createWriteStream(filePath);
      await pump(data.file, writeStream);
      
      // update training in database
      await database.updateTraining(trainingId, {
        presentationPath: filePath,
        presentationName: data.filename
      });
      
      logger.info('PresentationUpload', 'Presentation uploaded successfully', {
        trainingId,
        filename: data.filename,
        filePath,
        size: writeStream.bytesWritten
      });
      
      // todo: add text extraction for PDF files here if needed
      
      return { 
        message: 'presentation uploaded', 
        hasPresentation: true 
      };
    } catch (error: any) {
      logger.error('PresentationUpload', 'Failed to upload presentation', error);
      return reply.code(500).send({ error: 'Failed to upload presentation' });
    }
  });

  // initialize session endpoint (step 3 in refactoring.md)
  fastify.get<{
    Params: { trainingId: string };
    Reply: { 
      sessionId: string; 
      training: { 
        title: string; 
        type: string; 
        hasPresentation: boolean; 
      } 
    } | { error: string };
  }>('/api/training/:trainingId/session/init', async (request, reply) => {
    try {
      const { trainingId } = request.params;
      
      // get training from database
      const training = await database.getTraining(trainingId);
      if (!training) {
        return reply.code(404).send({ error: 'Training not found' });
      }
      
      // create new session
      const sessionId = uuidv4();
      await database.createNewSession(trainingId, {
        id: sessionId,
        status: 'initialized'
      });
      
      logger.info('SessionInit', 'Session initialized successfully', {
        trainingId,
        sessionId,
        trainingTitle: training.title
      });
      
      return {
        sessionId,
        training: {
          title: training.title,
          type: training.type,
          hasPresentation: !!training.presentation_path
        }
      };
    } catch (error: any) {
      logger.error('SessionInit', 'Failed to initialize session', error);
      return reply.code(500).send({ error: 'Failed to initialize session' });
    }
  });

  // start recording endpoint (step 4.2 in refactoring.md)
  fastify.post<{
    Params: { sessionId: string };
    Body: { timestamp: string };
    Reply: { status: string; message: string } | { error: string };
  }>('/api/training/session/:sessionId/start', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const { timestamp } = request.body;
      
      if (!timestamp) {
        return reply.code(400).send({ error: 'timestamp is required' });
      }
      
      // update session status and start time
      const session = await database.updateSessionById(sessionId, {
        status: 'recording',
        startTime: new Date(timestamp)
      });
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      logger.info('SessionStart', 'Recording started', {
        sessionId,
        timestamp
      });
      
      return { 
        status: 'recording', 
        message: 'recording started' 
      };
    } catch (error: any) {
      logger.error('SessionStart', 'Failed to start recording', error);
      return reply.code(500).send({ error: 'Failed to start recording' });
    }
  });

  // upload audio endpoint (step 5.2 in refactoring.md)
  fastify.post<{
    Params: { sessionId: string };
    Reply: { sessionId: string; status: string; message: string } | { error: string };
  }>('/api/training/session/:sessionId/upload-audio', async (request, reply) => {
    const fs = require('fs');
    
    try {
      const { sessionId } = request.params;
      const duration = parseInt(request.headers['x-duration'] as string || '0');
      const audioFormat = request.headers['x-audio-format'] as string || 'audio/webm';
      
      // get audio buffer from body
      const audioBuffer = request.body as Buffer;
      
      if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
        return reply.code(400).send({ error: 'Invalid audio data' });
      }
      
      // get session from database
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      // determine file extension from format header
      const extension = audioFormat.includes('wav') ? 'wav' : 'webm';
      const filename = `${sessionId}_audio.${extension}`;
      const tempPath = `./uploads/audio/${filename}`;
      
      // ensure directory exists
      if (!fs.existsSync('./uploads/audio')) {
        fs.mkdirSync('./uploads/audio', { recursive: true });
      }
      
      await fs.promises.writeFile(tempPath, audioBuffer);
      
      logger.info('AudioUpload', 'Audio uploaded successfully', {
        sessionId,
        fileSizeKB: Math.round(audioBuffer.length / 1024),
        duration,
        audioFormat
      });
      
      // atomically update to processing status and start ML processing
      // avoid race condition by doing single status update
      const currentSession = await database.getSessionBySessionId(sessionId);
      if (!currentSession) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      if (currentSession.status !== 'recording') {
        logger.warn('AudioUpload', 'Session not in recording state, skipping processing', { 
          sessionId, 
          currentStatus: currentSession.status 
        });
        return reply.code(400).send({ error: 'Session not in recording state' });
      }
      
      // single atomic update: recording -> processing
      logger.info('AudioUpload', 'Updating status recording -> processing', { 
        sessionId, 
        previousStatus: currentSession.status 
      });
      
      await database.updateSessionById(sessionId, {
        status: 'processing',
        audioPath: tempPath,
        duration: duration
      });
      
      logger.info('AudioUpload', 'Status updated successfully', { sessionId });
      
      // broadcast processing start via SSE immediately after DB update
      sseManager.broadcast(sessionId, {
        type: 'progress',
        status: 'processing',
        progress: 20,
        message: 'Audio uploaded, starting analysis...',
        step: 'processing_start',
        sessionId,
        timestamp: new Date().toISOString()
      });

      // start async ML processing without blocking the response
      audioProcessor.startProcessing(sessionId, tempPath);
      logger.info('AudioUpload', 'ML processing started', { sessionId });
      
      return { 
        sessionId, 
        status: 'processing',
        message: 'audio uploaded, analysis started' 
      };
    } catch (error: any) {
      logger.error('AudioUpload', 'Audio upload failed', error);
      return reply.code(500).send({ error: 'Audio upload failed' });
    }
  });
  
  // simple status endpoint for polling (replaces SSE)
  fastify.get<{
    Params: { sessionId: string };
    Reply: { 
      id: string;
      status: string;
      progress?: number;
      message?: string;
    } | { error: string };
  }>('/api/training/session/:sessionId/status', async (request, reply) => {
    const { sessionId } = request.params;
    
    try {
      // check if session exists
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // calculate progress based on status
      let progress = 0;
      let message = '';
      
      switch (session.status) {
        case 'initialized':
          progress = 0;
          message = 'Session initialized';
          break;
        case 'recording':
          progress = 10;
          message = 'Recording in progress';
          break;
        case 'uploaded':
          progress = 20;
          message = 'Audio uploaded, preparing for analysis';
          break;
        case 'processing':
          progress = 50;
          message = 'Analyzing your presentation...';
          break;
        case 'completed':
          progress = 100;
          message = 'Analysis complete';
          break;
        case 'failed':
          progress = 0;
          message = 'Analysis failed';
          break;
        default:
          progress = 0;
          message = 'Unknown status';
      }

      return {
        id: session.id,
        status: session.status,
        progress,
        message
      };
      
    } catch (error: any) {
      logger.error('SessionStatus', 'Failed to get session status', error);
      return reply.code(500).send({ error: 'Failed to get session status' });
    }
  });

  // get session results endpoint (step 7 in refactoring.md)
  fastify.get<{
    Params: { sessionId: string };
    Reply: { 
      session: any; 
      training: any; 
    } | { 
      status: string; 
      message: string; 
    } | { error: string };
  }>('/api/training/session/:sessionId/results', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      const training = await database.getTraining(session.training_id);
      if (!training) {
        return reply.code(404).send({ error: 'Training not found' });
      }
      
      logger.debug('SessionResults', 'Session status check', { 
        sessionId, 
        status: session.status,
        hasResults: !!session.ml_results 
      });
      
      if (session.status !== 'completed') {
        return reply.code(202).send({ 
          status: session.status,
          message: 'analysis in progress' 
        });
      }
      
      return {
        session: {
          id: session.id,
          status: session.status,
          duration: session.duration,
          completedAt: session.completed_at,
          results: session.ml_results
        },
        training: {
          title: training.title,
          type: training.type
        }
      };
    } catch (error: any) {
      logger.error('SessionResults', 'Failed to get results', error);
      return reply.code(500).send({ error: 'Failed to get session results' });
    }
  });

  // get completed trainings for history page
  fastify.get<{
    Querystring: { userId?: string };
    Reply: { trainings: any[] } | { error: string };
  }>('/api/training/history', async (request, reply) => {
    try {
      const { userId } = request.query;
      
      // get completed trainings (1 training = 1 record)
      const trainings = await database.getCompletedTrainings(userId);
      
      logger.info('TrainingHistory', 'Retrieved completed trainings', { 
        count: trainings.length, 
        userId 
      });
      
      return { trainings };
    } catch (error: any) {
      logger.error('TrainingHistory', 'Failed to retrieve training history', error);
      return reply.code(500).send({ error: 'Failed to retrieve training history' });
    }
  });

  // get all training sessions endpoint (legacy - for compatibility)
  fastify.get<{
    Querystring: { userId?: string };
    Reply: { sessions: any[] } | { error: string };
  }>('/api/training/sessions', async (request, reply) => {
    try {
      const { userId } = request.query;
      
      // get all sessions from new sessions table
      const sessions = await database.getTrainingSessions(userId);
      
      logger.info('TrainingSessions', 'Retrieved training sessions', { 
        count: sessions.length, 
        userId 
      });
      
      return { sessions };
    } catch (error: any) {
      logger.error('TrainingSessions', 'Failed to retrieve sessions', error);
      return reply.code(500).send({ error: 'Failed to retrieve training sessions' });
    }
  });

  // diagnostic endpoint for debugging session state
  fastify.get<{
    Params: { sessionId: string };
    Reply: { 
      session: any;
      training?: any;
      database_status: string;
      diagnostics: {
        sessionExists: boolean;
        hasAudioFile: boolean;
        hasMlResults: boolean;
        mlResultsSize: number;
        statusHistory: string[];
        timestamps: any;
      };
    } | { error: string };
  }>('/api/debug/session/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const fs = require('fs');
      
      logger.info('Debug', 'Diagnostic request for session', { sessionId });
      
      // get session from database
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found in database' });
      }
      
      // get related training
      let training: any = null;
      try {
        training = await database.getTraining(session.training_id);
      } catch (error: any) {
        logger.warn('Debug', 'Could not fetch training for session', { sessionId, error: error.message });
      }
      
      // check if audio file exists
      const audioFileExists = session.audio_path ? fs.existsSync(session.audio_path) : false;
      const audioFileSize = audioFileExists && session.audio_path ? 
        Math.round(fs.statSync(session.audio_path).size / 1024) : 0;
      
      // analyze ML results
      let mlResultsSize = 0;
      let mlResultsAnalysis = {};
      if (session.ml_results) {
        const mlResultsStr = typeof session.ml_results === 'string' 
          ? session.ml_results 
          : JSON.stringify(session.ml_results);
        mlResultsSize = mlResultsStr.length;
        
        try {
          const mlData = typeof session.ml_results === 'object' 
            ? session.ml_results 
            : JSON.parse(session.ml_results);
          
          mlResultsAnalysis = {
            hasTranscription: !!mlData.speech_segments,
            transcriptionSegments: mlData.speech_segments?.length || 0,
            hasMetrics: !!mlData.metrics,
            hasPitchAnalysis: !!mlData.pitch_evaluation,
            hasQuestions: !!mlData.questions,
            questionsCount: mlData.questions?.length || 0,
            processingTime: mlData.processing_time
          };
        } catch (parseError: any) {
          logger.warn('Debug', 'Could not parse ML results', { sessionId, parseError: parseError.message });
        }
      }
      
      const diagnostics = {
        sessionExists: true,
        hasAudioFile: audioFileExists,
        audioFileSize: audioFileSize,
        audioFilePath: session.audio_path,
        hasMlResults: !!session.ml_results,
        mlResultsSize,
        mlResultsAnalysis,
        statusHistory: [session.status], // could be extended to track status changes
        timestamps: {
          created: session.created_at,
          updated: session.updated_at,
          started: session.start_time,
          completed: session.completed_at
        },
        durationFromDb: session.duration,
        hasTraining: !!training
      };
      
      logger.info('Debug', 'Session diagnostics completed', {
        sessionId,
        status: session.status,
        diagnostics
      });
      
      return {
        session: {
          id: session.id,
          training_id: session.training_id,
          status: session.status,
          duration: session.duration,
          created_at: session.created_at,
          updated_at: session.updated_at,
          start_time: session.start_time,
          completed_at: session.completed_at
        },
        training: training ? {
          id: training.id,
          title: training.title,
          type: training.type,
          user_id: training.user_id,
          status: training.status
        } : null,
        database_status: 'connected',
        diagnostics
      };
    } catch (error: any) {
      logger.error('Debug', 'Diagnostic endpoint failed', { 
        sessionId: request.params.sessionId, 
        error 
      });
      return reply.code(500).send({ error: 'Diagnostic check failed' });
    }
  });

  // SSE endpoint for real-time session updates
  fastify.get<{
    Params: { sessionId: string };
  }>('/api/training/session/:sessionId/events', async (request, reply) => {
    const { sessionId } = request.params;
    
    try {
      // check if session exists
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }


      // setup SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      logger.info('SSE-ENDPOINT', `new SSE connection for session ${sessionId}`, {
        sessionId,
        sessionStatus: session.status,
        clientIP: request.ip
      });
      
      // perform maintenance cleanup before adding new connection
      sseManager.performMaintenanceCleanup();

      // add connection to SSE manager
      sseManager.addConnection(sessionId, reply.raw);

      // send initial status immediately
      const initialData = {
        type: 'status',
        status: session.status,
        progress: calculateProgress(session),
        message: getStatusMessage(session.status),
        sessionId,
        timestamp: new Date().toISOString()
      };

      reply.raw.write(`data: ${JSON.stringify(initialData)}\n\n`);

      // if session is already completed, send results and close
      if (session.status === 'completed' && session.ml_results) {
        const resultsData = {
          type: 'completed',
          status: 'completed',
          progress: 100,
          message: 'Analysis complete',
          sessionId,
          results: session.ml_results,
          timestamp: new Date().toISOString()
        };

        reply.raw.write(`data: ${JSON.stringify(resultsData)}\n\n`);
        
        // close connection after completed data sent
        setTimeout(() => {
          reply.raw.end();
        }, 1000);
      }

    } catch (error: any) {
      logger.error('SSE-ENDPOINT', 'SSE connection setup failed', {
        sessionId,
        error: error.message
      });
      return reply.code(500).send({ error: 'Failed to establish SSE connection' });
    }
  });

  // SSE stats endpoint for debugging
  fastify.get('/api/training/sse/stats', async (request, reply) => {
    try {
      const stats = sseManager.getStats();
      return reply.send({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('SSE-STATS', 'Failed to get SSE stats', error);
      return reply.code(500).send({ error: 'Failed to get SSE stats' });
    }
  });

  // utility functions for SSE
  function calculateProgress(session: any): number {
    switch (session.status) {
      case 'initialized':
        return 0;
      case 'recording':
        return 10;
      case 'uploaded':
        return 20;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  function getStatusMessage(status: string): string {
    switch (status) {
      case 'initialized':
        return 'Session initialized';
      case 'recording':
        return 'Recording in progress';
      case 'uploaded':
        return 'Audio uploaded, preparing for analysis';
      case 'processing':
        return 'Analyzing your presentation...';
      case 'completed':
        return 'Analysis complete';
      case 'failed':
        return 'Analysis failed';
      default:
        return 'Unknown status';
    }
  }

  // cleanup endpoint for abandoned sessions
  fastify.post<{
    Body?: { olderThanHours?: number };
    Reply: { 
      success: boolean; 
      cleaned: number; 
      message: string; 
      sessions?: any[] 
    };
  }>('/api/training/cleanup-abandoned', async (request, reply) => {
    try {
      const { olderThanHours = 1 } = request.body || {};
      
      logger.info('Cleanup', 'Manual cleanup requested', { olderThanHours });
      
      const result = await database.cleanupAbandonedSessions(olderThanHours);
      
      return {
        success: true,
        cleaned: result.cleaned,
        message: `Cleaned up ${result.cleaned} abandoned sessions older than ${olderThanHours} hours`,
        sessions: result.sessions.map(s => ({
          id: s.id,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }))
      };
    } catch (error: any) {
      logger.error('Cleanup', 'Failed to cleanup abandoned sessions', error);
      return reply.code(500).send({ 
        success: false,
        cleaned: 0,
        message: 'Failed to cleanup abandoned sessions'
      });
    }
  });
};

export default trainingRoutes;