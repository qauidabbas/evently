import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
});

export const cacheMiddleware = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    try {
      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cachedResponse));
        return;
      }

      // Intercept the send method to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        res.setHeader('X-Cache', 'MISS');
        redis.setex(key, durationInSeconds, JSON.stringify(body));
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      next(); // Fallback to DB if Redis fails
    }
  };
};

export const invalidateCachePattern = async (pattern: string) => {
  try {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error('Redis invalidation error:', err);
  }
};
