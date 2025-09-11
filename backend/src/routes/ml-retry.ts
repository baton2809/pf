import { FastifyPluginCallback } from 'fastify';
import { database } from '../services/database';
import { audioProcessor } from '../services/audio-processor';
import { logger } from '../utils/logger';

const mlRetryRoutes: FastifyPluginCallback = async (fastify, options) => {

  // get failed operations for a session
  fastify.get('/sessions/:sessionId/failed-operations', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const failedOps = await database.getFailedMLOperations(sessionId);
      
      logger.info('MLRetryAPI', 'Retrieved failed operations', {
        sessionId,
        failedOpsCount: failedOps.length,
        operations: failedOps.map(op => ({
          id: op.id,
          type: op.operation_type,
          attempts: op.attempt_count,
          lastAttempt: op.last_attempt_at,
          error: op.error_details?.message
        }))
      });

      return {
        success: true,
        data: {
          sessionId,
          failedOperations: failedOps.map(op => ({
            id: op.id,
            operationType: op.operation_type,
            status: op.status,
            attemptCount: op.attempt_count,
            lastAttemptAt: op.last_attempt_at,
            error: op.error_details,
            createdAt: op.created_at
          }))
        }
      };

    } catch (error: any) {
      logger.error('MLRetryAPI', 'Failed to get failed operations', {
        sessionId,
        error: error.message
      });

      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to retrieve failed operations',
          details: error.message
        }
      });
    }
  });

  // retry all failed operations for a session
  fastify.post('/sessions/:sessionId/retry', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      // check session exists
      const session = await database.getSessionBySessionId(sessionId);
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Session not found'
          }
        });
      }

      // check if session has transcription text
      if (!session.transcription_text) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Session has no transcription text, cannot retry operations'
          }
        });
      }

      // get failed operations count
      const failedOps = await database.getFailedMLOperations(sessionId);
      if (failedOps.length === 0) {
        return {
          success: true,
          message: 'No failed operations to retry',
          data: {
            sessionId,
            retriedOperations: 0
          }
        };
      }

      logger.info('MLRetryAPI', 'Starting retry request', {
        sessionId,
        failedOpsCount: failedOps.length,
        operations: failedOps.map(op => op.operation_type)
      });

      // start retry process asynchronously
      audioProcessor.retryFailedOperations(sessionId).catch((error: any) => {
        logger.error('MLRetryAPI', 'Async retry failed', {
          sessionId,
          error: error.message
        });
      });

      return {
        success: true,
        message: 'Retry process started',
        data: {
          sessionId,
          retriedOperations: failedOps.length,
          operations: failedOps.map(op => ({
            id: op.id,
            type: op.operation_type,
            attempts: op.attempt_count
          }))
        }
      };

    } catch (error: any) {
      logger.error('MLRetryAPI', 'Failed to start retry process', {
        sessionId,
        error: error.message
      });

      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to start retry process',
          details: error.message
        }
      });
    }
  });

  // retry specific operation by ID
  fastify.post('/operations/:operationId/retry', async (request, reply) => {
    const { operationId } = request.params as { operationId: string };

    try {
      // get operation details
      const allOps = await database.getMLOperations(''); // we need to modify this to get by operation ID
      const operation = allOps.find(op => op.id === operationId);
      
      if (!operation) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'Operation not found'
          }
        });
      }

      if (operation.status !== 'failed') {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Operation is not in failed state',
            currentStatus: operation.status
          }
        });
      }

      logger.info('MLRetryAPI', 'Starting single operation retry', {
        operationId,
        sessionId: operation.session_id,
        operationType: operation.operation_type,
        attemptCount: operation.attempt_count
      });

      // for now, redirect to full session retry
      // TODO: implement single operation retry
      audioProcessor.retryFailedOperations(operation.session_id).catch((error: any) => {
        logger.error('MLRetryAPI', 'Single operation retry failed', {
          operationId,
          sessionId: operation.session_id,
          error: error.message
        });
      });

      return {
        success: true,
        message: 'Operation retry started',
        data: {
          operationId,
          sessionId: operation.session_id,
          operationType: operation.operation_type
        }
      };

    } catch (error: any) {
      logger.error('MLRetryAPI', 'Failed to retry single operation', {
        operationId,
        error: error.message
      });

      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to retry operation',
          details: error.message
        }
      });
    }
  });

  // get ML operations status for a session
  fastify.get('/sessions/:sessionId/operations', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const operations = await database.getMLOperations(sessionId);
      
      logger.debug('MLRetryAPI', 'Retrieved ML operations status', {
        sessionId,
        operationsCount: operations.length
      });

      return {
        success: true,
        data: {
          sessionId,
          operations: operations.map(op => ({
            id: op.id,
            operationType: op.operation_type,
            status: op.status,
            attemptCount: op.attempt_count,
            lastAttemptAt: op.last_attempt_at,
            completedAt: op.completed_at,
            createdAt: op.created_at,
            hasResult: !!op.result_data,
            hasError: !!op.error_details,
            error: op.error_details
          })),
          summary: {
            total: operations.length,
            completed: operations.filter(op => op.status === 'completed').length,
            failed: operations.filter(op => op.status === 'failed').length,
            processing: operations.filter(op => op.status === 'processing').length,
            pending: operations.filter(op => op.status === 'pending').length
          }
        }
      };

    } catch (error: any) {
      logger.error('MLRetryAPI', 'Failed to get operations status', {
        sessionId,
        error: error.message
      });

      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to retrieve operations status',
          details: error.message
        }
      });
    }
  });

};

export default mlRetryRoutes;