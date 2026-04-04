import { Redis } from '@upstash/redis';
import fp from 'fastify-plugin';

async function redisPlugin(fastify) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  fastify.decorate('redis', redis);
}

export default fp(redisPlugin);