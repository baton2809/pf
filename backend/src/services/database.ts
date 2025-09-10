import { Pool, PoolClient } from 'pg';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { SessionUpdateFields, DatabaseError } from '../types/database';

class Database {
  private pool: Pool;
  private isInitialized = false;
  
  // helper method for performance logging
  private async timedQuery(query: string, params: any[] = [], operation: string = 'query'): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await this.pool.query(query, params);
      const duration = Date.now() - startTime;
      
      // log slow queries only
      if (duration > 100) {
        logger.warn('Database', `Slow query detected: ${operation}`, { 
          duration: `${duration}ms`,
          operation,
          rowCount: result.rowCount
        });
      } else if (duration > 50) {
        logger.debug('Database', `Query performance: ${operation}`, { 
          duration: `${duration}ms`,
          rowCount: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database', `Query failed: ${operation}`, { 
        duration: `${duration}ms`,
        operation,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 10, // maximum number of connections
      idleTimeoutMillis: 30000, // close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // return error after 2 seconds if connection could not be established
      ssl: false // set to true in production
    });

    // handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Database', 'Pool connection error', err);
    });
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      // test connection
      await this.testConnection();
      
      // create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      logger.info('Database', 'Initialized successfully');
    } catch (error) {
      logger.error('Database', 'Initialization failed', error);
      throw new DatabaseError('Failed to initialize database', 'init', error as Error);
    }
  }

  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // create trainings table for metadata
      const createTrainingsTable = `
        CREATE TABLE IF NOT EXISTS trainings (
          id UUID PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'presentation',
          user_id VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed')),
          presentation_path VARCHAR(500),
          presentation_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      
      // create sessions table for individual recording sessions
      const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY,
          training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
          filename VARCHAR(255),
          status VARCHAR(20) DEFAULT 'initialized' CHECK (status IN ('initialized', 'recording', 'uploaded', 'processing', 'completed', 'failed')),
          audio_path VARCHAR(500),
          duration INTEGER DEFAULT 0,
          ml_results JSONB,
          start_time TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      

      const createIndexes = `
        -- new tables indexes
        CREATE INDEX IF NOT EXISTS idx_trainings_user_id ON trainings(user_id);
        CREATE INDEX IF NOT EXISTS idx_trainings_created_at ON trainings(created_at);
        CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_training_id ON sessions(training_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
        
      `;

      await client.query(createTrainingsTable);
      await client.query(createSessionsTable);
      
      // drop old audio_sessions table if it exists
      const dropOldTable = `
        DROP TABLE IF EXISTS audio_sessions CASCADE;
      `;
      
      await client.query(dropOldTable);
      
      // Create indexes AFTER columns exist
      await client.query(createIndexes);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }


  // new training/session methods
  async createTraining(training: {
    id: string;
    title: string;
    type: string;
    userId: string;
    status?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO trainings (id, title, type, user_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    try {
      const result = await this.pool.query(query, [
        training.id,
        training.title,
        training.type,
        training.userId,
        training.status || 'created'
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Database', 'Create training failed', error);
      throw new DatabaseError('Failed to create training', 'createTraining', error as Error);
    }
  }

  async getTraining(id: string): Promise<any | null> {
    const query = 'SELECT * FROM trainings WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Database', 'Get training failed', error);
      throw new DatabaseError('Failed to get training', 'getTraining', error as Error);
    }
  }

  async updateTraining(id: string, updates: any): Promise<any | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.presentationPath) {
      fields.push(`presentation_path = $${paramCount++}`);
      values.push(updates.presentationPath);
    }
    
    if (updates.presentationName) {
      fields.push(`presentation_name = $${paramCount++}`);
      values.push(updates.presentationName);
    }

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) {
      throw new DatabaseError('No valid fields to update', 'updateTraining');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE trainings 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Database', 'Update training failed', error);
      throw new DatabaseError('Failed to update training', 'updateTraining', error as Error);
    }
  }

  async createNewSession(trainingId: string, sessionData: {
    id: string;
    status?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO sessions (id, training_id, status)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    
    try {
      const result = await this.pool.query(query, [
        sessionData.id,
        trainingId,
        sessionData.status || 'initialized'
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Database', 'Create session failed', error);
      throw new DatabaseError('Failed to create session', 'createSession', error as Error);
    }
  }

  async getSessionBySessionId(id: string): Promise<any | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Database', 'Get session failed', error);
      throw new DatabaseError('Failed to get session', 'getSessionBySessionId', error as Error);
    }
  }

  async updateSessionById(id: string, updates: any): Promise<any | null> {
    const startTime = Date.now();
    
    logger.info('Database', 'Starting session update', {
      sessionId: id,
      updates: {
        status: updates.status,
        hasAudioPath: !!updates.audioPath,
        duration: updates.duration,
        hasMlResults: !!updates.mlResults,
        mlResultsSize: updates.mlResults ? JSON.stringify(updates.mlResults).length : 0,
        hasStartTime: !!updates.startTime,
        hasCompletedAt: !!updates.completedAt
      }
    });

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    
    if (updates.audioPath) {
      fields.push(`audio_path = $${paramCount++}`);
      values.push(updates.audioPath);
    }
    
    if (updates.duration !== undefined) {
      fields.push(`duration = $${paramCount++}`);
      values.push(updates.duration);
    }
    
    if (updates.mlResults) {
      const mlResultsJson = JSON.stringify(updates.mlResults);
      fields.push(`ml_results = $${paramCount++}`);
      values.push(mlResultsJson);
      
      logger.debug('Database', 'ML results serialization', {
        sessionId: id,
        mlResultsSize: mlResultsJson.length,
        hasTranscription: !!updates.mlResults.speech_segments,
        transcriptionSegments: updates.mlResults.speech_segments?.length || 0,
        hasMetrics: !!updates.mlResults.metrics,
        hasPitchAnalysis: !!updates.mlResults.pitch_evaluation
      });
    }

    if (updates.startTime) {
      fields.push(`start_time = $${paramCount++}`);
      values.push(updates.startTime);
    }

    if (updates.completedAt) {
      fields.push(`completed_at = $${paramCount++}`);
      values.push(updates.completedAt);
    }

    if (fields.length === 0) {
      logger.error('Database', 'No valid fields to update', { sessionId: id, updates });
      throw new DatabaseError('No valid fields to update', 'updateSessionById');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE sessions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    try {
      logger.debug('Database', 'Executing session update query', {
        sessionId: id,
        fieldsCount: fields.length - 1, // exclude updated_at
        queryLength: query.length
      });

      const result = await this.timedQuery(query, values, `updateSessionById(${id})`);
      const duration = Date.now() - startTime;
      
      if (result.rows.length === 0) {
        logger.error('Database', 'Session update found no matching rows', {
          sessionId: id,
          duration: `${duration}ms`,
          affectedRows: result.rowCount
        });
        return null;
      }

      const updatedSession = result.rows[0];
      
      logger.info('Database', 'Session update completed successfully', {
        sessionId: id,
        duration: `${duration}ms`,
        newStatus: updatedSession.status,
        hasMlResults: !!updatedSession.ml_results,
        mlResultsSize: updatedSession.ml_results ? JSON.stringify(updatedSession.ml_results).length : 0,
        updatedAt: updatedSession.updated_at
      });
      
      return updatedSession;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Database', 'Session update failed with database error', {
        sessionId: id,
        duration: `${duration}ms`,
        errorCode: error.code,
        errorMessage: error.message,
        constraint: error.constraint,
        detail: error.detail,
        fieldsBeingUpdated: fields.filter(f => !f.includes('updated_at'))
      });
      
      throw new DatabaseError('Failed to update session', 'updateSessionById', error);
    }
  }

  // get completed trainings (1 training = 1 record) for history page
  async getCompletedTrainings(userId?: string): Promise<any[]> {
    const query = `
      SELECT 
        t.id as training_id,
        t.title,
        t.type,
        t.user_id,
        t.created_at,
        s.id as session_id,
        s.status,
        s.duration,
        s.ml_results,
        s.completed_at,
        s.start_time
      FROM trainings t
      INNER JOIN sessions s ON t.id = s.training_id
      WHERE s.status = 'completed' 
        AND s.ml_results IS NOT NULL
        ${userId ? 'AND t.user_id = $1' : ''}
      ORDER BY s.completed_at DESC;
    `;
    
    try {
      const params = userId ? [userId] : [];
      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.training_id,  // use training ID as primary key
        sessionId: row.session_id,
        title: row.title,
        trainingType: row.type,
        userId: row.user_id,
        status: row.status,
        duration: row.duration,
        mlResults: row.ml_results,
        completedAt: row.completed_at,
        startTime: row.start_time,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Database', 'Failed to get completed trainings', error);
      throw new DatabaseError('Failed to get completed trainings', 'getCompletedTrainings', error as Error);
    }
  }

  // get all training sessions with training info (legacy - keep for backward compatibility)
  async getTrainingSessions(userId?: string): Promise<any[]> {
    const query = `
      SELECT 
        s.id,
        s.training_id,
        s.status,
        s.duration,
        s.ml_results,
        s.completed_at,
        s.created_at,
        t.title,
        t.type,
        t.user_id
      FROM sessions s
      JOIN trainings t ON s.training_id = t.id
      WHERE s.status NOT IN ('abandoned') 
        AND NOT (s.status = 'initialized' AND s.created_at < NOW() - INTERVAL '5 minutes')
        ${userId ? 'AND t.user_id = $1' : ''}
      ORDER BY s.created_at DESC;
    `;
    
    try {
      const params = userId ? [userId] : [];
      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        trainingId: row.training_id,
        title: row.title,
        sessionType: row.type,
        userId: row.user_id,
        status: row.status,
        duration: row.duration,
        mlResults: row.ml_results,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        // format for compatibility with existing components
        filename: `${row.id}_training.webm`,
        filePath: `./uploads/sessions/${row.id}_training.webm`
      }));
    } catch (error) {
      logger.error('Database', 'Failed to get training sessions', error);
      throw new DatabaseError('Failed to get training sessions', 'getTrainingSessions', error as Error);
    }
  }

  // cleanup abandoned sessions (older than specified hours in 'initialized' status)
  async cleanupAbandonedSessions(olderThanHours: number = 1): Promise<{ cleaned: number; sessions: any[] }> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const query = `
      UPDATE sessions 
      SET status = 'abandoned', updated_at = NOW()
      WHERE status = 'initialized' 
        AND created_at < $1
      RETURNING id, status, created_at, updated_at;
    `;
    
    try {
      logger.info('Database', 'Starting cleanup of abandoned sessions', {
        olderThanHours,
        cutoffTime: cutoffTime.toISOString()
      });

      const result = await this.timedQuery(query, [cutoffTime], 'cleanupAbandonedSessions');
      const cleanedSessions = result.rows;
      
      logger.info('Database', 'Cleanup completed', {
        cleanedCount: cleanedSessions.length,
        cleanedSessions: cleanedSessions.map(s => ({ 
          id: s.id, 
          createdAt: s.created_at,
          updatedAt: s.updated_at 
        }))
      });
      
      return {
        cleaned: cleanedSessions.length,
        sessions: cleanedSessions
      };
    } catch (error: any) {
      logger.error('Database', 'Failed to cleanup abandoned sessions', error);
      throw new DatabaseError('Failed to cleanup abandoned sessions', 'cleanupAbandonedSessions', error);
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database', 'Connection pool closed');
    } catch (error) {
      logger.error('Database', 'Error closing connection pool', error);
      throw new DatabaseError('Failed to close database pool', 'close', error as Error);
    }
  }
}

export const database = new Database();