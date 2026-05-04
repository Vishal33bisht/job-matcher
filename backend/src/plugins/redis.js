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

function createResilientRedis(primaryRedis, fallbackRedis, fastify) {
  return {
    async get(key) {
      try {
        return await primaryRedis.get(key);
      } catch (error) {
        fastify.log.error({ err: error, key }, 'Redis get failed; using in-memory fallback.');
        return fallbackRedis.get(key);
      }
    },
    async set(key, value) {
      try {
        return await primaryRedis.set(key, value);
      } catch (error) {
        fastify.log.error({ err: error, key }, 'Redis set failed; using in-memory fallback.');
        return fallbackRedis.set(key, value);
      }
    },
    async del(...keys) {
      try {
        return await primaryRedis.del(...keys);
      } catch (error) {
        fastify.log.error({ err: error, keys }, 'Redis delete failed; using in-memory fallback.');
        return fallbackRedis.del(...keys);
      }
    },
  };
}

async function redisPlugin(fastify) {
  const { url, token } = getRedisConfig();
  const memoryRedis = createMemoryRedis();

  if (!url || !token) {
    fastify.log.warn('Upstash Redis config missing; using in-memory Redis for this process.');
    fastify.decorate('redis', memoryRedis);
    return;
  }

  const redis = new Redis({ url, token });
  fastify.log.info('Upstash Redis config found.');
  fastify.decorate('redis', createResilientRedis(redis, memoryRedis, fastify));
}

export default fp(redisPlugin);
