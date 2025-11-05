import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      const error: ApiError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: number;
      email: string;
      role: string;
    };

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    const authError: ApiError = new Error('Invalid or expired token');
    authError.statusCode = 401;
    next(authError);
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'admin') {
    const error: ApiError = new Error('Admin access required');
    error.statusCode = 403;
    return next(error);
  }
  next();
};

