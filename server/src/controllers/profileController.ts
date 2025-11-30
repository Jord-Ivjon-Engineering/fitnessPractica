import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPrograms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const userPrograms = await prisma.userProgram.findMany({
      where: { 
        userId,
        // Exclude user programs where both plan and program are null (deleted programs)
        OR: [
          { planId: { not: null } },
          { programId: { not: null } }
        ]
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            intervals: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            imageUrl: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    res.json({
      success: true,
      data: userPrograms,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseProgram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { planId, programId } = req.body;

    if (!planId && !programId) {
      const error: ApiError = new Error('Either planId or programId is required');
      error.statusCode = 400;
      return next(error);
    }

    // Check if user already has this program
    const existing = await prisma.userProgram.findFirst({
      where: {
        userId,
        ...(planId ? { planId } : { programId }),
        status: 'active',
      },
    });

    if (existing) {
      const error: ApiError = new Error('Program already purchased');
      error.statusCode = 409;
      return next(error);
    }

    const userProgram = await prisma.userProgram.create({
      data: {
        userId,
        ...(planId && { planId: parseInt(planId) }),
        ...(programId && { programId: parseInt(programId) }),
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
      include: {
        plan: true,
        program: true,
      },
    });

    res.status(201).json({
      success: true,
      data: userProgram,
    });
  } catch (error) {
    next(error);
  }
};

