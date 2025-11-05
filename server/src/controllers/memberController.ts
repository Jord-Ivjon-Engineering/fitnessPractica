import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export const getAllMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await prisma.member.findMany({
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid member ID');
      error.statusCode = 400;
      return next(error);
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!member) {
      const error: ApiError = new Error('Member not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const createMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, planId } = req.body;

    if (!name || !email) {
      const error: ApiError = new Error('Name and email are required');
      error.statusCode = 400;
      return next(error);
    }

    // Check if email already exists
    const existingMember = await prisma.member.findUnique({
      where: { email },
    });

    if (existingMember) {
      const error: ApiError = new Error('Email already registered');
      error.statusCode = 409;
      return next(error);
    }

    const member = await prisma.member.create({
      data: {
        name,
        email,
        phone: phone || null,
        planId: planId ? parseInt(planId) : null,
      },
      include: {
        plan: true,
      },
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid member ID');
      error.statusCode = 400;
      return next(error);
    }

    const { name, email, phone, planId } = req.body;

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(planId !== undefined && { planId: planId ? parseInt(planId) : null }),
      },
      include: {
        plan: true,
      },
    });

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid member ID');
      error.statusCode = 400;
      return next(error);
    }

    await prisma.member.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Member deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

