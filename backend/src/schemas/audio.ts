import { FastifySchema } from 'fastify';

// file upload validation schema
export const uploadAudioSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['audio'],
    properties: {
      audio: {
        type: 'object',
        properties: {
          filename: { type: 'string', pattern: '^[a-zA-Z0-9._-]+\\.(wav|mp3|m4a|ogg)$' },
          mimetype: { 
            type: 'string', 
            enum: ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg'] 
          }
        }
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
};

// get sessions schema
export const getSessionsSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              filename: { type: 'string' },
              status: { 
                type: 'string', 
                enum: ['pending', 'processing', 'completed', 'failed'] 
              },
              createdAt: { type: 'string', format: 'date-time' },
              mlResults: { type: 'object' }
            }
          }
        }
      }
    }
  }
};

// get single session schema
export const getSessionSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        session: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            filename: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'completed', 'failed'] 
            },
            createdAt: { type: 'string', format: 'date-time' },
            mlResults: { type: 'object' }
          }
        }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

// SSE stream schema
export const streamSessionSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};