import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import fs from 'fs';
import { config } from './utils/config';
import { database } from './services/database';
import { AuthService } from './services/auth-service';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import audioRoutes from './routes/audio';
import authRoutes from './routes/auth';
import trainingRoutes from './routes/training';
import { analyticsRoutes } from './routes/analytics';
import mlRetryRoutes from './routes/ml-retry';
import { v4 as uuidv4 } from 'uuid';

// SSL options
let httpsOptions = {};
try {
  if (fs.existsSync('./ssl/key.pem') && fs.existsSync('./ssl/cert.pem')) {
    httpsOptions = {
      https: {
        key: fs.readFileSync('./ssl/key.pem'),
        cert: fs.readFileSync('./ssl/cert.pem')
      }
    };
    logger.info('Server', 'SSL certificates loaded, starting HTTPS server');
  }
} catch (error) {
  logger.warn('Server', 'SSL certificates not found, starting HTTP server');
}

// create fastify instance with SSL if available
const fastify = Fastify({
  logger: false,
  ...httpsOptions
});


async function start() {
  try {
    // register plugins
    await fastify.register(cors, {
      origin: true, // разрешаем все origins для разработки
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Audio-Format', 'X-Duration', 'Content-Length', 'ngrok-skip-browser-warning', 'Cache-Control'],
      credentials: false // disable credentials to avoid CORS conflicts with SSE
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: Infinity // no limit for file uploads
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
      
      // debug SSE and multipart requests
      if (request.url.includes('/events')) {
        logger.info('SSE-DEBUG', `Incoming SSE request: ${request.method} ${request.url}`, {
          method: request.method,
          url: request.url,
          headers: Object.keys(request.headers),
          accept: request.headers.accept || 'none',
          origin: request.headers.origin || 'none',
          userAgent: request.headers['user-agent']?.substring(0, 50) || 'none'
        });
      } else if (request.url.includes('/api/audio/upload')) {
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
      const duration = Date.now() - (request.startTime || Date.now());
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

    // initialize auth service
    const authService = new AuthService(database);

    // register routes
    await fastify.register(healthRoutes);
    await fastify.register(authRoutes, { authService });
    await fastify.register(audioRoutes);
    await fastify.register(trainingRoutes, { authService });
    await fastify.register(analyticsRoutes, { prefix: '/api', authService });
    await fastify.register(mlRetryRoutes, { prefix: '/api/ml' });

    // debug endpoint to track component mounting
    fastify.post('/api/debug/component-mounted', async (request, reply) => {
      const { component, sessionId } = request.body as { component: string, sessionId: string };
      logger.info('DEBUG', `Component ${component} mounted`, { component, sessionId });
      reply.send({ status: 'logged' });
    });

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