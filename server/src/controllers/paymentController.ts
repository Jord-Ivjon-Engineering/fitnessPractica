import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Payment functionality has been removed
// This file is kept for potential future payment integrations

// Get payment status
export const getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      const error: ApiError = new Error('sessionId is required');
      error.statusCode = 400;
      return next(error);
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: parseInt(sessionId),
        userId,
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            category: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!payment) {
      const error: ApiError = new Error('Payment not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
