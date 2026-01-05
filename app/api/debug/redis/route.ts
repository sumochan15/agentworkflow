import { NextResponse } from 'next/server';
import { getRedisClient } from '@/src/lib/redis-client';

export async function GET() {
  try {
    const redis = getRedisClient();

    if (!redis) {
      return NextResponse.json({
        status: 'error',
        message: 'Redis client not initialized',
        env: {
          hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
          hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          urlLength: process.env.UPSTASH_REDIS_REST_URL?.trim().length || 0,
          tokenLength: process.env.UPSTASH_REDIS_REST_TOKEN?.trim().length || 0,
        }
      });
    }

    // Try to set and get a test value
    await redis.set('test:connection', 'ok', { ex: 10 });
    const testValue = await redis.get('test:connection');

    return NextResponse.json({
      status: 'success',
      message: 'Redis connection working',
      testValue,
      env: {
        hasUrl: true,
        hasToken: true,
        urlLength: process.env.UPSTASH_REDIS_REST_URL?.trim().length || 0,
        tokenLength: process.env.UPSTASH_REDIS_REST_TOKEN?.trim().length || 0,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      stack: error.stack,
      env: {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        urlLength: process.env.UPSTASH_REDIS_REST_URL?.trim().length || 0,
        tokenLength: process.env.UPSTASH_REDIS_REST_TOKEN?.trim().length || 0,
      }
    }, { status: 500 });
  }
}
