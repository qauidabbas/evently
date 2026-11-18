import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import prisma from '../lib/prisma';

// Secret from env, defaulting to a secure string for dev if not provided (though in prod it MUST be provided)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-jwt-key-256-bit-minimum-length';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

export class AuthService {
  /**
   * Hashes a password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies a password against a hash
   */
  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    return await argon2.verify(hash, password);
  }

  /**
   * Generates a short-lived JWT Access Token
   */
  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  /**
   * Generates a cryptographically secure opaque refresh token
   */
  static generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hashes the refresh token for database storage (SHA-256 is fast and sufficient for random high-entropy strings)
   */
  static hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a new session in the database
   */
  static async createSession(userId: string, deviceInfo?: string, ip?: string): Promise<{ accessToken: string, refreshToken: string }> {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        deviceInfo,
        ip,
      }
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validates and rotates a refresh token, implementing token reuse detection
   */
  static async rotateRefreshToken(oldToken: string, ip?: string): Promise<{ accessToken: string, refreshToken: string } | null> {
    const oldHash = this.hashRefreshToken(oldToken);
    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: oldHash }
    });

    if (!session) {
      // Token not found
      return null;
    }

    if (session.revokedAt) {
      // TOKEN REUSE DETECTED!
      // This session was already revoked, but someone is trying to refresh it.
      // We must revoke ALL sessions for this user as a security measure.
      console.warn(`[SECURITY] Refresh token reuse detected for user ${session.userId}. Revoking all sessions.`);
      await prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      return null;
    }

    // Determine if session is expired (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - REFRESH_TOKEN_EXPIRES_DAYS);
    
    if (session.lastActiveAt < thirtyDaysAgo || session.createdAt < thirtyDaysAgo) {
      // Session expired, mark as revoked
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      return null;
    }

    // Token is valid. Rotate it.
    const newRefreshToken = this.generateRefreshToken();
    const newHash = this.hashRefreshToken(newRefreshToken);
    const newAccessToken = this.generateAccessToken(session.userId);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        lastActiveAt: new Date(),
        ip: ip || session.ip
      }
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
  
  /**
   * Revokes a specific session
   */
  static async revokeSession(refreshToken: string) {
    const hash = this.hashRefreshToken(refreshToken);
    await prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}
