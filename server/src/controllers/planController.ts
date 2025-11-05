import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export const getAllPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid plan ID');
      error.statusCode = 400;
      return next(error);
    }

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!plan) {
      const error: ApiError = new Error('Plan not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, intervals } = req.body;

    if (!name) {
      const error: ApiError = new Error('Plan name is required');
      error.statusCode = 400;
      return next(error);
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        price: price ? parseFloat(price) : null,
        intervals: intervals ? JSON.stringify(intervals) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid plan ID');
      error.statusCode = 400;
      return next(error);
    }

    const { name, description, price, intervals } = req.body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(intervals !== undefined && { intervals: JSON.stringify(intervals) }),
      },
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid plan ID');
      error.statusCode = 400;
      return next(error);
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

