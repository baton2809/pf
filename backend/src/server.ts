import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { config } from './utils/config';
import { database } from './services/database';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import audioRoutes from './routes/audio';
import authRoutes from './routes/auth';
import trainingRoutes from './routes/training';
import { analyticsRoutes } from './routes/analytics';
import { v4 as uuidv4 } from 'uuid';

// create fastify instance
const fastify = Fastify({
  logger: false
});

async function start() {
  try {
    // register plugins
    await fastify.register(cors, {
      origin: ['http://localhost:3005', 'http://localhost:3000'], // specific origins for Docker
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Audio-Format', 'X-Duration', 'Content-Length'],
      credentials: false // disable credentials to avoid CORS conflicts with SSE
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024 // 50mb limit
      }
    });

    // add content type parser for binary uploads
    fastify.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (req: any, body: Buffer, done: any) => {
      done(null, body);
    });

    // request logging middleware
    fastify.addHook('onRequest', async (request: any) => {
      request.startTime = Date.now();
      request.requestId = uuidv4().substring(0, 8); // short ID for tracing
      
      // debug multipart requests
      if (request.url.includes('/api/audio/upload')) {
        logger.info('AudioUpload', `Incoming request: ${request.method} ${request.url}`, {
          method: request.method,
          url: request.url,
          headers: Object.keys(request.headers),
          contentType: request.headers['content-type'] || 'none',
          origin: request.headers.origin || 'none'
        });
      }
    });

    fastify.addHook('onResponse', async (request: any, reply) => {
      const duration = Date.now() - request.startTime;
      const { method, url } = request;
      const status = reply.statusCode;
      
      // skip health checks to avoid spam
      if (url === '/health') return;
      
      const logData = {
        requestId: request.requestId,
        method,
        url,
        status,
        duration: `${duration}ms`,
        ip: request.ip,
        userAgent: request.headers['user-agent']?.substring(0, 100) || 'unknown'
      };

      if (status >= 400) {
        logger.warn('HTTPRequest', `${method} ${url} - ${status}`, logData);
      } else {
        logger.info('HTTPRequest', `${method} ${url} - ${status}`, logData);
      }
    });

    // initialize database
    await database.init();

    // register routes
    await fastify.register(healthRoutes);
    await fastify.register(authRoutes);
    await fastify.register(audioRoutes);
    await fastify.register(trainingRoutes);
    await fastify.register(analyticsRoutes, { prefix: '/api' });

    // start server
    await fastify.listen({ 
      port: config.port, 
      host: '0.0.0.0' 
    });

    logger.info('Server', `Listening on port ${config.port}`, {
      port: config.port,
      host: '0.0.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Server', 'Failed to start server', error);
    process.exit(1);
  }
}

// graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Server', 'Received SIGINT, starting graceful shutdown');
  
  try {
    await database.close();
    await fastify.close();
    logger.info('Server', 'Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Server', 'Error during shutdown', error);
    process.exit(1);
  }
});

start();