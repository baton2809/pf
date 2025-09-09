import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { config } from './utils/config';
import { database } from './services/database';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import audioRoutes from './routes/audio';
import authRoutes from './routes/auth';

// create fastify instance
const fastify = Fastify({
  logger: false
});

async function start() {
  try {
    // register plugins
    await fastify.register(cors, {
      origin: true, // allow all origins for development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024 // 50mb limit
      }
    });

    // initialize database
    await database.init();

    // register routes
    await fastify.register(healthRoutes);
    await fastify.register(authRoutes);
    await fastify.register(audioRoutes);

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