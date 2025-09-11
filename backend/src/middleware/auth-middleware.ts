import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { AuthService } from '../services/auth-service';
import { logger } from '../utils/logger';

// extend FastifyRequest to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    try {
      // extract token from authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        logger.debug('AuthMiddleware', 'no authorization header provided');
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'no authorization header provided'
        });
      }

      // check if it's a bearer token
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (!tokenMatch) {
        logger.debug('AuthMiddleware', 'invalid authorization header format');
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'invalid authorization header format'
        });
      }

      const token = tokenMatch[1];

      // verify jwt token
      const decoded = await authService.verifyJWT(token);
      
      // attach user info to request
      request.user = decoded;

      logger.debug('AuthMiddleware', 'authentication successful', { 
        userId: decoded.userId,
        email: decoded.email 
      });

      done();
    } catch (error: any) {
      logger.debug('AuthMiddleware', 'authentication failed', { error: error.message });
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'invalid or expired token'
      });
    }
  };
}

// optional auth middleware - doesn't fail if no token provided
export function createOptionalAuthMiddleware(authService: AuthService) {
  return async function optionalAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        // no token provided, continue without user
        return done();
      }

      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (!tokenMatch) {
        // invalid format, continue without user
        return done();
      }

      const token = tokenMatch[1];
      const decoded = await authService.verifyJWT(token);
      
      // attach user info to request
      request.user = decoded;

      logger.debug('OptionalAuthMiddleware', 'authentication successful', { 
        userId: decoded.userId 
      });

      done();
    } catch (error: any) {
      // token verification failed, continue without user
      logger.debug('OptionalAuthMiddleware', 'token verification failed, continuing without user', {
        error: error.message
      });
      done();
    }
  };
}