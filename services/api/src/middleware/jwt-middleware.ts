import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

const parseToken = (headerValue?: string) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};

export const attachUser = async (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const token = parseToken(req.headers.authorization);
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, displayName: true, role: true },
    });
    if (user) {
      req.user = user;
    }
  } catch (error) {
    console.warn('[auth] invalid token', error);
  }

  next();
};

export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  return next();
};

