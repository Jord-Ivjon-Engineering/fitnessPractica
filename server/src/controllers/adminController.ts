import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            payments: true,
            programs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Get all transactions/payments (admin only)
export const getAllTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format transactions with item name
    const transactions = payments.map((payment) => {
      let itemName = 'N/A';
      if (payment.program) {
        itemName = payment.program.name;
      } else if (payment.plan) {
        itemName = payment.plan.name;
      }

      return {
        id: payment.id,
        userName: payment.user.name,
        userEmail: payment.user.email,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        itemName: itemName,
        itemType: payment.program ? 'Program' : payment.plan ? 'Plan' : 'Unknown',
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        stripeSessionId: payment.stripeSessionId,
        stripePaymentId: payment.stripePaymentId,
      };
    });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// Create new user (admin only)
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Validation
    if (!email || !password || !name) {
      const error: ApiError = new Error('Email, password, and name are required');
      error.statusCode = 400;
      return next(error);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const error: ApiError = new Error('Email already registered');
      error.statusCode = 409;
      return next(error);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'member',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard statistics (admin only)
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalTransactions, totalRevenue, recentTransactions] = await Promise.all([
      prisma.user.count(),
      prisma.payment.count({
        where: {
          status: 'completed',
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
          status: 'completed',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTransactions,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all training programs (admin only)
export const getAllPrograms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: programs,
    });
  } catch (error) {
    next(error);
  }
};

// Create new training program (admin only)
export const createProgram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, description, imageUrl, videoUrl, price, startDate, endDate } = req.body;

    // Validation
    if (!name || !category) {
      const error: ApiError = new Error('Name and category are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate dates if both are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        const error: ApiError = new Error('End date must be after start date');
        error.statusCode = 400;
        return next(error);
      }
    }

    // Create program
    const program = await prisma.trainingProgram.create({
      data: {
        name,
        category,
        description: description || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        price: price ? parseFloat(price) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: program,
    });
  } catch (error) {
    next(error);
  }
};

// Upload image for program (admin only)
export const uploadProgramImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const multerReq = req as any;
    if (!multerReq.file) {
      const error: ApiError = new Error('No image file uploaded');
      error.statusCode = 400;
      return next(error);
    }

    // Return the URL to access the uploaded image
    const imageUrl = `/uploads/images/${multerReq.file.filename}`;
    
    res.json({
      success: true,
      data: {
        imageUrl,
        filename: multerReq.file.filename,
      },
    });
  } catch (error) {
    next(error);
  }
};

