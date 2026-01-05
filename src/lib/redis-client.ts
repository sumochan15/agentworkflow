import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured (allows graceful fallback)
 */
export function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    console.warn('⚠️  Redis not configured. Job state will not persist across function invocations.');
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url,
      token,
      // Disable automatic serialization - we'll handle JSON ourselves
      automaticDeserialization: false,
    });
  }

  return redis;
}
