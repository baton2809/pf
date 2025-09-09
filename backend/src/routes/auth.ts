import { FastifyPluginAsync } from 'fastify';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  
  // simplified auth endpoint - real auth should be implemented
  fastify.get('/api/auth/user', async (request, reply) => {
    // return default user (implement real auth as needed)
    return {
      id: 'default-user',
      email: 'user@example.com',
      name: 'Default User'
    };
  });

};

export default authRoutes;