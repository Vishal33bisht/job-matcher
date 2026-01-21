import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';

import jobRoutes from './routes/jobs.js';
import resumeRoutes from './routes/resume.js';
import applicationRoutes from './routes/applications.js';
import aiRoutes from './routes/ai.js';
import redisPlugin from './plugins/redis.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// Register plugins
await fastify.register(cors, { origin: true });
await fastify.register(multipart);
await fastify.register(redisPlugin);

// Register routes
await fastify.register(jobRoutes, { prefix: '/api/jobs' });
await fastify.register(resumeRoutes, { prefix: '/api/resume' });
await fastify.register(applicationRoutes, { prefix: '/api/applications' });
await fastify.register(aiRoutes, { prefix: '/api/ai' });

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' });
    console.log(`Server running on port ${process.env.PORT || 3001}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();