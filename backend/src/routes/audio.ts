import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../services/database';
import { audioProcessor } from '../services/audio-processor';
import { mlClient } from '../services/ml-client';
import { logger } from '../utils/logger';
import { AudioUploadResponse, SessionStatusResponse } from '../types/audio';

const audioRoutes: FastifyPluginAsync = async (fastify) => {
  
  // additional ml analysis endpoints for existing sessions
  // main flow is handled in training.ts

  // analyze pitch content for existing session
  fastify.post<{
    Params: { id: string };
    Reply: { success: boolean; results?: any } | { error: string };
  }>('/api/audio/session/:id/analyze-pitch', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // get session from new sessions table only
      const session = await database.getSessionBySessionId(id);
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      if (!session.mlResults?.speech_segments || session.mlResults.speech_segments.length === 0) {
        return reply.code(400).send({ error: 'Session has no transcription data for analysis' });
      }

      logger.info('AudioPitchAnalysis', 'Starting pitch analysis', { sessionId: id });
      
      const updatedResults = await audioProcessor.processTextAnalysis(id);
      
      if (!updatedResults) {
        return reply.code(500).send({ error: 'Failed to analyze pitch content' });
      }

      logger.info('AudioPitchAnalysis', 'Pitch analysis completed', { sessionId: id });
      return { 
        success: true, 
        results: {
          pitch_evaluation: updatedResults.pitch_evaluation,
          advices: updatedResults.advices,
          pitch_summary: updatedResults.pitch_summary,
          questions: updatedResults.questions
        }
      };
    } catch (error) {
      logger.error('AudioPitchAnalysis', 'Failed to analyze pitch', error);
      return reply.code(500).send({ error: 'Failed to analyze pitch content' });
    }
  });

  // get pitch insights for session
  fastify.get<{
    Params: { id: string };
    Reply: { insights: any } | { error: string };
  }>('/api/audio/session/:id/insights', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // get session from new sessions table only
      const session = await database.getSessionBySessionId(id);
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const insights = {
        session_info: {
          id: session.id,
          duration: session.duration,
          status: session.status,
          created_at: session.createdAt
        },
        transcription: {
          segments: session.mlResults?.speech_segments || [],
          full_text: session.mlResults?.speech_segments ? 
            session.mlResults.speech_segments.map(s => s.text).join(' ') : ''
        },
        speech_analysis: {
          metrics: session.mlResults?.metrics || null,
          pace_rate: session.mlResults?.temp_rate || null
        },
        pitch_analysis: {
          evaluation: session.mlResults?.pitch_evaluation || null,
          advices: session.mlResults?.advices || [],
          summary: session.mlResults?.pitch_summary || null
        },
        interactive: {
          questions: session.mlResults?.questions || []
        },
        processing: {
          timing: session.mlResults?.processing_time || null
        }
      };

      logger.info('AudioInsights', 'Retrieved session insights', { sessionId: id });
      return { insights };
    } catch (error) {
      logger.error('AudioInsights', 'Failed to retrieve insights', error);
      return reply.code(500).send({ error: 'Failed to retrieve session insights' });
    }
  });

  // generate additional questions
  fastify.post<{
    Params: { id: string };
    Body: { question_count?: number };
    Reply: { questions: string[] } | { error: string };
  }>('/api/audio/session/:id/generate-questions', async (request, reply) => {
    try {
      const { id } = request.params;
      const { question_count = 3 } = request.body || {};
      
      // get session from new sessions table only
      const session = await database.getSessionBySessionId(id);
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      if (!session.mlResults?.speech_segments || session.mlResults.speech_segments.length === 0) {
        return reply.code(400).send({ error: 'Session has no transcription data for question generation' });
      }

      const transcriptText = session.mlResults.speech_segments.map(s => s.text).join(' ');
      const questionsResult = await mlClient.generateQuestions(transcriptText, question_count);

      if (!questionsResult.success || !questionsResult.data) {
        return reply.code(500).send({ 
          error: questionsResult.error?.message || 'Failed to generate questions' 
        });
      }

      logger.info('AudioQuestions', 'Generated additional questions', { 
        sessionId: id, 
        count: questionsResult.data!.length 
      });
      
      return { questions: questionsResult.data! };
    } catch (error) {
      logger.error('AudioQuestions', 'Failed to generate questions', error);
      return reply.code(500).send({ error: 'Failed to generate questions' });
    }
  });
};

export default audioRoutes;