import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export const getAllPrograms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: programs,
    });
  } catch (error) {
    next(error);
  }
};

export const getProgramById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const program = await prisma.trainingProgram.findUnique({
      where: { id: parseInt(id) },
    });

    if (!program) {
      const error: ApiError = new Error('Program not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: program,
    });
  } catch (error) {
    next(error);
  }
};

