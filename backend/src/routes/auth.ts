import { FastifyPluginAsync } from 'fastify';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  
  fastify.get('/api/auth/user', async (request, reply) => {
    return reply.code(501).send({ 
      error: 'Authentication not implemented',
      message: 'This endpoint requires authentication implementation'
    });
  });

};

export default authRoutes;