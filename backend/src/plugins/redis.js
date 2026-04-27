import { Redis } from '@upstash/redis';
import fp from 'fastify-plugin';

function getRedisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

function createMemoryRedis() {
  const store = new Map();

  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value) {
      store.set(key, value);
      return 'OK';
    },
    async del(...keys) {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) deleted += 1;
      }
      return deleted;
    },
  };
}

async function redisPlugin(fastify) {
  const { url, token } = getRedisConfig();

  if (!url || !token) {
    fastify.log.warn('Upstash Redis config missing; using in-memory Redis for this process.');
    fastify.decorate('redis', createMemoryRedis());
    return;
  }

  const redis = new Redis({ url, token });
  fastify.log.info('Upstash Redis config found.');
  fastify.decorate('redis', redis);
}

export default fp(redisPlugin);
