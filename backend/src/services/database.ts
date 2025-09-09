import { Pool, PoolClient } from 'pg';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { AudioSession } from '../types/audio';
import { DatabaseSession, SessionUpdateFields, DatabaseError } from '../types/database';

class Database {
  private pool: Pool;
  private isInitialized = false;

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
      console.error('Database pool error:', err);
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
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
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
      
      const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS audio_sessions (
          id UUID PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          title VARCHAR(255),
          session_type VARCHAR(50) DEFAULT 'presentation',
          user_id VARCHAR(255) DEFAULT 'default-user',
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          file_path VARCHAR(500) NOT NULL,
          duration INTEGER DEFAULT 0,
          ml_results JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_audio_sessions_status ON audio_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_audio_sessions_created_at ON audio_sessions(created_at);
        CREATE INDEX IF NOT EXISTS idx_audio_sessions_type ON audio_sessions(session_type);
        CREATE INDEX IF NOT EXISTS idx_audio_sessions_user ON audio_sessions(user_id);
      `;

      await client.query(createSessionsTable);
      
      // Add migration for new columns
      const addColumnsIfNotExist = `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audio_sessions' AND column_name = 'session_type') THEN
            ALTER TABLE audio_sessions ADD COLUMN session_type VARCHAR(50) DEFAULT 'presentation';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audio_sessions' AND column_name = 'title') THEN
            ALTER TABLE audio_sessions ADD COLUMN title VARCHAR(255);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audio_sessions' AND column_name = 'user_id') THEN
            ALTER TABLE audio_sessions ADD COLUMN user_id VARCHAR(255) DEFAULT 'default-user';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audio_sessions' AND column_name = 'duration') THEN
            ALTER TABLE audio_sessions ADD COLUMN duration INTEGER DEFAULT 0;
          END IF;
        END 
        $$;
      `;
      
      await client.query(addColumnsIfNotExist);
      
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

  async createSession(
    id: string, 
    filename: string, 
    filePath: string,
    sessionType?: string,
    title?: string,
    userId?: string,
    duration?: number
  ): Promise<AudioSession> {
    const query = `
      INSERT INTO audio_sessions (id, filename, file_path, session_type, title, user_id, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    try {
      const result = await this.pool.query(query, [
        id, 
        filename, 
        filePath,
        sessionType || 'presentation',
        title || null,
        userId || 'default-user',
        duration || 0
      ]);
      return this.mapRowToSession(result.rows[0]);
    } catch (error) {
      logger.error('Database', 'Create session failed', error);
      throw new DatabaseError('Failed to create session', 'createSession', error as Error);
    }
  }

  async getSession(id: string): Promise<AudioSession | null> {
    const query = 'SELECT * FROM audio_sessions WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSession(result.rows[0]);
    } catch (error) {
      console.error('Get session failed:', error);
      throw new DatabaseError('Failed to get session', 'getSession', error as Error);
    }
  }

  async updateSession(id: string, updates: Partial<AudioSession>): Promise<AudioSession | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    
    if (updates.mlResults) {
      fields.push(`ml_results = $${paramCount++}`);
      values.push(JSON.stringify(updates.mlResults));
    }
    
    if (updates.duration !== undefined) {
      fields.push(`duration = $${paramCount++}`);
      values.push(updates.duration);
      console.log(`Updating session ${id} with duration: ${updates.duration} seconds`);
    }

    if (fields.length === 0) {
      throw new DatabaseError('No valid fields to update', 'updateSession');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE audio_sessions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSession(result.rows[0]);
    } catch (error) {
      console.error('Update session failed:', error);
      throw new DatabaseError('Failed to update session', 'updateSession', error as Error);
    }
  }

  async getAllSessions(userId?: string): Promise<AudioSession[]> {
    const query = userId 
      ? 'SELECT * FROM audio_sessions WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM audio_sessions ORDER BY created_at DESC';
    
    const params = userId ? [userId] : [];
    
    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      logger.error('Database', 'Get all sessions failed', error);
      throw new DatabaseError('Failed to get all sessions', 'getAllSessions', error as Error);
    }
  }

  async getSessionsByType(sessionType: string, userId?: string): Promise<AudioSession[]> {
    const query = userId
      ? 'SELECT * FROM audio_sessions WHERE session_type = $1 AND user_id = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM audio_sessions WHERE session_type = $1 ORDER BY created_at DESC';
    
    const params = userId ? [sessionType, userId] : [sessionType];
    
    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      logger.error('Database', 'Get sessions by type failed', { sessionType, userId, error });
      throw new DatabaseError('Failed to get sessions by type', 'getSessionsByType', error as Error);
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    const query = 'DELETE FROM audio_sessions WHERE id = $1 RETURNING *';
    
    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return false; // session not found
      }
      
      const deletedSession = result.rows[0];
      
      // try to delete the audio file from filesystem
      if (deletedSession.file_path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(deletedSession.file_path)) {
            fs.unlinkSync(deletedSession.file_path);
            logger.info('Database', 'Audio file deleted', { filePath: deletedSession.file_path });
          }
        } catch (fileError) {
          // log error but don't fail the database operation
          logger.error('Database', 'Failed to delete audio file', { filePath: deletedSession.file_path, error: fileError });
        }
      }
      
      logger.info('Database', 'Session deleted successfully', { sessionId: id });
      return true;
    } catch (error) {
      logger.error('Database', 'Delete session failed', { sessionId: id, error });
      throw new DatabaseError('Failed to delete session', 'deleteSession', error as Error);
    }
  }

  private mapRowToSession(row: DatabaseSession): AudioSession {
    console.log(`Mapping session ${row.id}: duration = ${row.duration}, status = ${row.status}`);
    return {
      id: row.id,
      filename: row.filename,
      title: row.title,
      sessionType: row.session_type,
      userId: row.user_id,
      status: row.status,
      filePath: row.file_path,
      duration: row.duration,
      mlResults: row.ml_results,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw new DatabaseError('Failed to close database pool', 'close', error as Error);
    }
  }
}

export const database = new Database();