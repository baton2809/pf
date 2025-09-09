import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../services/database';
import { audioProcessor } from '../services/audio-processor';
import { logger } from '../utils/logger';
import { AudioUploadResponse, SessionStatusResponse } from '../types/audio';

const audioRoutes: FastifyPluginAsync = async (fastify) => {
  
  // test endpoint to verify connectivity
  fastify.get('/api/audio/test', async (request, reply) => {
    return { message: 'Audio route is working', timestamp: new Date().toISOString() };
  });
  
  // alternative JSON upload endpoint (for debugging multipart issues)
  fastify.post<{
    Body: {
      audioData: string; // base64 encoded audio
      sessionType?: string;
      title?: string;
      userId?: string;
    };
    Reply: AudioUploadResponse;
  }>('/api/audio/upload-json', async (request, reply) => {
    try {
      const { audioData, sessionType = 'presentation', title, userId = 'default-user' } = request.body;
      
      if (!audioData) {
        return reply.code(400).send({ error: 'No audio data provided' });
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      const sessionId = uuidv4();
      const filename = `${sessionId}_upload.wav`;
      const filePath = `./uploads/${filename}`;
      
      const fs = require('fs');
      
      // ensure uploads directory exists
      if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads', { recursive: true });
      }
      
      // save buffer to file
      fs.writeFileSync(filePath, audioBuffer);
      
      logger.info('AudioUploadJSON', 'File uploaded successfully', {
        filename,
        size: audioBuffer.length,
        sessionId,
        sessionType,
        title
      });

      // create session in database (duration will be updated later from ML results)
      await database.createSession(sessionId, filename, filePath, sessionType, title, userId, 0);

      // start async processing
      audioProcessor.startProcessing(sessionId, filePath);

      logger.info('AudioUploadJSON', 'Upload complete, processing started', { sessionId });
      
      return {
        sessionId,
        message: 'audio upload successful, processing started'
      };
    } catch (error) {
      logger.error('AudioUploadJSON', 'Upload failed', error);
      return reply.code(500).send({ error: 'Upload failed' });
    }
  });
  
  // upload audio file endpoint
  fastify.post<{
    Reply: AudioUploadResponse;
  }>('/api/audio/upload', async (request, reply) => {
    const fs = require('fs');
    const { pipeline } = require('stream');
    const { promisify } = require('util');
    const pump = promisify(pipeline);
    
    try {
      const parts = request.parts();
      let audioFile = null;
      let sessionType = 'presentation';
      let title = null;
      let userId = 'default-user';

      // Process multipart form data
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'audio') {
          audioFile = part;
        } else if (part.type === 'field') {
          const value = part.value as string;
          switch (part.fieldname) {
            case 'sessionType':
              sessionType = value;
              break;
            case 'title':
              title = value;
              break;
            case 'userId':
              userId = value;
              break;
          }
        }
      }
      
      if (!audioFile) {
        return reply.code(400).send({ error: 'No audio file uploaded' });
      }

      const sessionId = uuidv4();
      const filename = `${sessionId}_${audioFile.filename}`;
      const filePath = `./uploads/${filename}`;
      
      // ensure uploads directory exists
      if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads', { recursive: true });
      }
      
      // save file using stream to avoid blocking
      const writeStream = fs.createWriteStream(filePath);
      
      try {
        await pump(audioFile.file, writeStream);
        logger.info('AudioUpload', 'File uploaded successfully', {
          filename,
          size: writeStream.bytesWritten,
          sessionId,
          sessionType,
          title
        });
      } catch (streamError) {
        logger.error('AudioUpload', 'Stream error during file upload', streamError);
        // cleanup partial file if exists
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw streamError;
      }

      // create session in database (duration will be updated later from ML results)
      await database.createSession(sessionId, audioFile.filename || filename, filePath, sessionType, title || undefined, userId, 0);

      // start async processing
      audioProcessor.startProcessing(sessionId, filePath);

      logger.info('AudioUpload', 'Upload complete, processing started', { sessionId });
      
      return {
        sessionId,
        message: 'audio upload successful, processing started'
      };
    } catch (error) {
      logger.error('AudioUpload', 'Upload failed', error);
      return reply.code(500).send({ error: 'Upload failed' });
    }
  });

  // get session status endpoint
  fastify.get<{
    Params: { id: string };
    Reply: SessionStatusResponse;
  }>('/api/audio/session/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const session = await database.getSession(id);
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      return { session };
    } catch (error) {
      logger.error('AudioSession', 'Failed to retrieve session', error);
      return reply.code(500).send({ error: 'Failed to retrieve session' });
    }
  });

  // SSE endpoint for real-time session progress
  fastify.get<{
    Params: { id: string };
  }>('/api/audio/session/:id/stream', async (request, reply) => {
    let progressListener: ((sessionId: string, progress: any) => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;
    
    try {
      const { id } = request.params;
      
      // check if session exists
      const session = await database.getSession(id);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': request.headers.origin || '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no' // disable nginx buffering
      });

      // send event helper with error handling
      const sendEvent = (data: any) => {
        try {
          if (!reply.raw.destroyed && reply.raw.writable) {
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
          }
        } catch (err) {
          logger.error('SSE', 'Failed to send event', err);
          cleanup();
        }
      };

      // cleanup function
      const cleanup = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (progressListener) {
          audioProcessor.removeProgressListener(progressListener);
          progressListener = null;
        }
        if (!reply.raw.destroyed) {
          reply.raw.end();
        }
      };

      // heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          if (!reply.raw.destroyed && reply.raw.writable) {
            reply.raw.write(':heartbeat\n\n');
          } else {
            cleanup();
          }
        } catch {
          cleanup();
        }
      }, 30000); // every 30 seconds

      // timeout after 5 minutes
      timeoutTimer = setTimeout(() => {
        logger.warn('SSE', `Connection timeout for session ${id}`);
        sendEvent({ stage: 'timeout', message: 'Connection timeout' });
        cleanup();
      }, 300000);

      sendEvent({ 
        progress: session.status === 'completed' ? 100 : 10, 
        stage: session.status === 'completed' ? 'completed' : 'initializing',
        sessionId: id 
      });

      // if already completed, send final event and close
      if (session.status === 'completed') {
        sendEvent({
          progress: 100,
          stage: 'completed',
          sessionId: id,
          data: session.mlResults
        });
        cleanup();
        return;
      }

      // progress listener
      progressListener = (sessionId: string, progress: any) => {
        if (sessionId === id) {
          sendEvent(progress);
          // close connection when completed
          if (progress.stage === 'completed' || progress.stage === 'error') {
            cleanup();
          }
        }
      };

      // register listener for this session
      audioProcessor.addProgressListener(progressListener);

      // cleanup on disconnect
      request.raw.on('close', cleanup);
      request.raw.on('error', cleanup);
      reply.raw.on('error', cleanup);

    } catch (error) {
      logger.error('SSE', 'Failed to establish connection', error);
      if (progressListener) {
        audioProcessor.removeProgressListener(progressListener);
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      return reply.code(500).send({ error: 'Failed to establish SSE connection' });
    }
  });

  // get all sessions endpoint
  fastify.get<{
    Querystring: { userId?: string };
    Reply: { sessions: any[] } | { error: string };
  }>('/api/audio/sessions', async (request, reply) => {
    try {
      const { userId } = request.query;
      const sessions = await database.getAllSessions(userId);
      logger.info('AudioSessions', 'Retrieved sessions', { count: sessions.length, userId });
      return { sessions };
    } catch (error) {
      logger.error('AudioSessions', 'Failed to retrieve sessions', error);
      return reply.code(500).send({ error: 'Failed to retrieve sessions' });
    }
  });

  // get sessions by type endpoint
  fastify.get<{
    Params: { type: string };
    Querystring: { userId?: string };
    Reply: { sessions: any[] } | { error: string };
  }>('/api/audio/sessions/type/:type', async (request, reply) => {
    try {
      const { type } = request.params;
      const { userId } = request.query;
      
      const sessions = await database.getSessionsByType(type, userId);
      logger.info('AudioSessions', 'Retrieved sessions by type', { 
        type, 
        count: sessions.length, 
        userId 
      });
      
      return { sessions };
    } catch (error) {
      logger.error('AudioSessions', 'Failed to retrieve sessions by type', error);
      return reply.code(500).send({ error: 'Failed to retrieve sessions by type' });
    }
  });

  // delete session endpoint
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>('/api/audio/session/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const deleted = await database.deleteSession(id);
      
      if (!deleted) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      logger.info('AudioDelete', 'Session deleted successfully', { sessionId: id });
      return { success: true };
    } catch (error) {
      logger.error('AudioDelete', 'Failed to delete session', error);
      return reply.code(500).send({ error: 'Failed to delete session' });
    }
  });
};

export default audioRoutes;