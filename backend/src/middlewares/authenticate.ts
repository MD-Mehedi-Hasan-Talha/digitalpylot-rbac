import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/prisma';

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
  roleLevel: number;
  permissions: string[];
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;

    // Check if token is blacklisted
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { jti: decoded.jti },
    });

    if (blacklisted) {
      res.status(401).json({ message: 'Token has been revoked' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
