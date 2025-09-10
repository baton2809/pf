import { FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

interface SSEConnection {
  response: FastifyReply['raw'];
  sessionId: string;
  connectedAt: Date;
}

export class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>();
  private readonly MAX_CONNECTIONS_PER_SESSION = 3; // limit to prevent connection churning

  addConnection(sessionId: string, response: FastifyReply['raw']) {
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, new Set());
    }

    const sessionConnections = this.connections.get(sessionId)!;
    
    // enforce connection limit per session to prevent connection churning
    if (sessionConnections.size >= this.MAX_CONNECTIONS_PER_SESSION) {
      logger.warn('SSE-MANAGER', `max connections reached for session ${sessionId}, closing oldest`, {
        sessionId,
        currentConnections: sessionConnections.size,
        maxAllowed: this.MAX_CONNECTIONS_PER_SESSION
      });
      
      // close oldest connection
      const connections = Array.from(sessionConnections);
      if (connections.length > 0) {
        const oldestConnection = connections.reduce((oldest, current) => {
          return current.connectedAt < oldest.connectedAt ? current : oldest;
        });
        
        try {
          oldestConnection.response.end();
        } catch (error: any) {
          logger.debug('SSE-MANAGER', 'error closing oldest connection', { error: error.message });
        }
        sessionConnections.delete(oldestConnection);
      }
    }

    const connection: SSEConnection = {
      response,
      sessionId,
      connectedAt: new Date()
    };

    sessionConnections.add(connection);

    logger.info('SSE-MANAGER', `connection added for session ${sessionId}`, {
      sessionId,
      totalConnections: sessionConnections.size,
      connectedAt: connection.connectedAt
    });

    // cleanup when connection closes
    response.on('close', () => {
      sessionConnections.delete(connection);
      logger.info('SSE-MANAGER', `connection removed for session ${sessionId}`, {
        sessionId,
        remainingConnections: sessionConnections.size
      });

      if (sessionConnections.size === 0) {
        this.connections.delete(sessionId);
        logger.info('SSE-MANAGER', `no more connections for session ${sessionId}, cleaning up`);
      }
    });

    response.on('error', (error: any) => {
      logger.error('SSE-MANAGER', `connection error for session ${sessionId}`, {
        sessionId,
        error: error.message
      });
      sessionConnections.delete(connection);
    });
  }

  broadcast(sessionId: string, data: any) {
    const connections = this.connections.get(sessionId);
    if (!connections || connections.size === 0) {
      logger.debug('SSE-MANAGER', `no connections to broadcast to for session ${sessionId}`);
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const deadConnections: SSEConnection[] = [];

    // send to all active connections
    connections.forEach(connection => {
      try {
        connection.response.write(message);
        logger.debug('SSE-MANAGER', `broadcast sent to connection`, {
          sessionId,
          dataType: data.type || 'unknown',
          status: data.status
        });
      } catch (error: any) {
        logger.warn('SSE-MANAGER', `failed to write to connection`, {
          sessionId,
          error: error.message
        });
        deadConnections.push(connection);
      }
    });

    // remove dead connections
    deadConnections.forEach(connection => {
      connections.delete(connection);
    });

    logger.info('SSE-MANAGER', `broadcast completed for session ${sessionId}`, {
      sessionId,
      sentTo: connections.size - deadConnections.length,
      removedDead: deadConnections.length,
      dataType: data.type || 'unknown'
    });
  }

  closeAll(sessionId: string) {
    const connections = this.connections.get(sessionId);
    if (!connections) {
      logger.debug('SSE-MANAGER', `no connections to close for session ${sessionId}`);
      return;
    }

    logger.info('SSE-MANAGER', `closing all connections for session ${sessionId}`, {
      sessionId,
      connectionCount: connections.size
    });

    connections.forEach(connection => {
      try {
        // send completion message before closing
        connection.response.write(`data: ${JSON.stringify({
          type: 'connection_closing',
          sessionId,
          message: 'Analysis completed, closing connection'
        })}\n\n`);
        
        connection.response.end();
      } catch (error: any) {
        logger.error('SSE-MANAGER', `error closing connection`, {
          sessionId,
          error: error.message
        });
      }
    });

    this.connections.delete(sessionId);
  }

  // get connection statistics
  getStats() {
    const stats = {
      totalSessions: this.connections.size,
      totalConnections: 0,
      sessions: [] as Array<{
        sessionId: string;
        connections: number;
        oldestConnection: Date | null;
      }>
    };

    this.connections.forEach((connections, sessionId) => {
      stats.totalConnections += connections.size;
      
      let oldestConnection: Date | null = null;
      connections.forEach(conn => {
        if (!oldestConnection || conn.connectedAt < oldestConnection) {
          oldestConnection = conn.connectedAt;
        }
      });

      stats.sessions.push({
        sessionId,
        connections: connections.size,
        oldestConnection
      });
    });

    return stats;
  }

  // cleanup stale connections (optional maintenance)
  cleanupStale(olderThanMinutes: number = 30) {
    const cutoffTime = new Date(Date.now() - (olderThanMinutes * 60 * 1000));
    let cleaned = 0;

    this.connections.forEach((connections, sessionId) => {
      const staleConnections: SSEConnection[] = [];
      
      connections.forEach(connection => {
        if (connection.connectedAt < cutoffTime) {
          staleConnections.push(connection);
        }
      });

      staleConnections.forEach(connection => {
        try {
          connection.response.end();
        } catch (error: any) {
          // ignore errors when closing stale connections
        }
        connections.delete(connection);
        cleaned++;
      });

      if (connections.size === 0) {
        this.connections.delete(sessionId);
      }
    });

    if (cleaned > 0) {
      logger.info('SSE-MANAGER', `cleaned up stale connections`, {
        cleaned,
        olderThanMinutes
      });
    }

    return cleaned;
  }
  
  // periodic cleanup of dead connections (called by route handlers)
  performMaintenanceCleanup(): void {
    let totalCleaned = 0;
    const beforeStats = this.getStats();
    
    this.connections.forEach((connections, sessionId) => {
      const deadConnections: SSEConnection[] = [];
      
      connections.forEach(connection => {
        try {
          // try to write a tiny keep-alive message to detect dead connections
          connection.response.write(': keepalive\n\n');
        } catch (error: any) {
          logger.debug('SSE-MANAGER', `detected dead connection for session ${sessionId}`, {
            sessionId,
            error: error.message
          });
          deadConnections.push(connection);
        }
      });
      
      // remove dead connections
      deadConnections.forEach(connection => {
        connections.delete(connection);
        totalCleaned++;
      });
      
      // clean up empty session maps
      if (connections.size === 0) {
        this.connections.delete(sessionId);
      }
    });
    
    if (totalCleaned > 0) {
      const afterStats = this.getStats();
      logger.info('SSE-MANAGER', 'maintenance cleanup completed', {
        cleanedConnections: totalCleaned,
        beforeSessions: beforeStats.totalSessions,
        afterSessions: afterStats.totalSessions,
        beforeConnections: beforeStats.totalConnections,
        afterConnections: afterStats.totalConnections
      });
    }
  }
}

// singleton instance
export const sseManager = new SSEManager();