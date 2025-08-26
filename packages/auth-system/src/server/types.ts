import { Request } from 'express';

// Server-side authentication types
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo?: any;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isRevoked: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: any;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skip?: (req: any, res: any) => boolean;
}