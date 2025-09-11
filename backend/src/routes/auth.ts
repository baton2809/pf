import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/auth-service';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { logger } from '../utils/logger';

interface AuthRoutesOptions {
  authService: AuthService;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, options) => {
  const { authService } = options;
  const authMiddleware = createAuthMiddleware(authService);

  // GET /api/auth/google - redirect to Google OAuth
  fastify.get('/api/auth/google', async (request, reply) => {
    try {
      const authUrl = authService.generateAuthUrl();
      logger.info('AuthRoutes', 'redirecting to Google OAuth', { hasUrl: !!authUrl });
      return reply.redirect(authUrl);
    } catch (error: any) {
      logger.error('AuthRoutes', 'failed to generate Google auth URL', error);
      return reply.code(500).send({
        error: 'internal server error',
        message: 'failed to generate Google auth URL'
      });
    }
  });

  // GET /api/auth/google/callback - handle Google callback redirect
  fastify.get('/api/auth/google/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
      
      logger.info('AuthRoutes', 'Google callback received', { 
        hasCode: !!code, 
        hasState: !!state,
        hasError: !!error,
        error,
        codeLength: code?.length,
        query: request.query
      });
      
      if (error) {
        logger.warn('AuthRoutes', 'Google OAuth error', { error });
        const frontendUrl = process.env.FRONTEND_URL!;
        const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`;
        return reply.redirect(errorUrl);
      }
      
      if (!code) {
        logger.warn('AuthRoutes', 'no authorization code received from Google');
        return reply.code(400).send({
          error: 'authentication failed',
          message: 'no authorization code received from Google'
        });
      }
      
      const result = await authService.handleGoogleCallback(code, state);
      
      // redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL!;
      const redirectUrl = `${frontendUrl}/auth/callback?token=${result.token}&success=true`;
      
      logger.info('AuthRoutes', 'Google OAuth callback successful, redirecting', { 
        userId: result.user.id,
        email: result.user.email,
        redirectUrl
      });
      
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      logger.error('AuthRoutes', 'Google callback error', error);
      const frontendUrl = process.env.FRONTEND_URL!;
      const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent('authentication failed')}`;
      return reply.redirect(errorUrl);
    }
  });

  // GET /api/auth/user - get current user (requires JWT)
  fastify.get('/api/auth/user', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'user not authenticated'
        });
      }

      const user = await authService.getUserById(request.user.userId);
      
      if (!user) {
        return reply.code(404).send({
          error: 'not found',
          message: 'user not found'
        });
      }

      logger.debug('AuthRoutes', 'returning user profile', { userId: user.id });

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      });
    } catch (error: any) {
      logger.error('AuthRoutes', 'failed to retrieve user data', error);
      return reply.code(500).send({
        error: 'internal server error',
        message: 'failed to retrieve user data'
      });
    }
  });

  // POST /api/auth/logout - logout (invalidate token)
  fastify.post('/api/auth/logout', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      logger.info('AuthRoutes', 'user logout', { userId: request.user?.userId });
      
      // in a real implementation, you might want to maintain a blacklist of tokens
      // for now, we'll just return success as the client should discard the token
      return reply.send({
        success: true,
        message: 'logged out successfully'
      });
    } catch (error: any) {
      logger.error('AuthRoutes', 'logout failed', error);
      return reply.code(500).send({
        error: 'internal server error',
        message: 'logout failed'
      });
    }
  });

  // POST /api/auth/refresh - refresh JWT token
  fastify.post('/api/auth/refresh', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'user not authenticated'
        });
      }

      // generate new jwt token
      const newToken = authService.generateJWT(request.user.userId, request.user.email);

      logger.info('AuthRoutes', 'token refresh successful', { userId: request.user.userId });

      return reply.send({
        success: true,
        token: newToken
      });
    } catch (error: any) {
      logger.error('AuthRoutes', 'token refresh failed', error);
      return reply.code(500).send({
        error: 'internal server error',
        message: 'token refresh failed'
      });
    }
  });
};

export default authRoutes;