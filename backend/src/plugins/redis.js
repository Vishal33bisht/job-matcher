import { Redis } from '@upstash/redis';
import fp from 'fastify-plugin';

async function redisPlugin(fastify) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Found' : '❌ Missing');
  console.log('Redis Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Found' : '❌ Missing');
  fastify.decorate('redis', redis);
}

export default fp(redisPlugin);