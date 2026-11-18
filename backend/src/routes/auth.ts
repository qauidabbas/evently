import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';
import prisma from '../lib/prisma';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const router = Router();

// Setup Redis client and Rate Limiter
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail',
  points: 5, // 5 requests
  duration: 60 * 15, // per 15 minutes by IP
});

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh', // only sent to refresh endpoint
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

router.post('/signup', validate(signupSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Don't reveal email exists to prevent enumeration
      res.status(400).json({ error: 'Registration failed' });
      return;
    }

    const passwordHash = await AuthService.hashPassword(password);
    
    // Keeping tokenIdentifier to the email for now to satisfy Prisma constraint
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        tokenIdentifier: email, 
      }
    });

    const { accessToken, refreshToken } = await AuthService.createSession(
      newUser.id,
      req.headers['user-agent'],
      req.ip
    );

    setRefreshCookie(res, refreshToken);

    res.status(201).json({ 
      message: 'Account created successfully',
      accessToken,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Rate limiting check
    try {
      // We should ideally use IP for rate limiting, but for express req.ip works if trust proxy is set.
      await loginLimiter.consume(req.ip || 'unknown');
    } catch (rejRes) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Constant time-ish failure response. We don't reveal if user exists.
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await AuthService.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Success, reset rate limiter
    await loginLimiter.delete(req.ip || 'unknown');

    const { accessToken, refreshToken } = await AuthService.createSession(
      user.id,
      req.headers['user-agent'],
      req.ip
    );

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const oldRefreshToken = req.cookies?.refresh_token;
    
    if (!oldRefreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const newTokens = await AuthService.rotateRefreshToken(oldRefreshToken, req.ip);

    if (!newTokens) {
      // Clear cookie just in case
      res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    setRefreshCookie(res, newTokens.refreshToken);
    res.status(200).json({ accessToken: newTokens.accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await AuthService.revokeSession(refreshToken);
    }
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
