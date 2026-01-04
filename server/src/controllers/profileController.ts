import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { sendEmailChangeNotice } from '../services/emailChangeService';

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
        telegramUsername: true,
        telegramId: true,
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

    const { name, phone, telegramUsername } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(telegramUsername !== undefined && { telegramUsername: telegramUsername || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        telegramUsername: true,
        telegramId: true,
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

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      const error: ApiError = new Error('Current password and new password are required');
      error.statusCode = 400;
      return next(error);
    }

    if (newPassword.length < 6) {
      const error: ApiError = new Error('New password must be at least 6 characters');
      error.statusCode = 400;
      return next(error);
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      const error: ApiError = new Error('Current password is incorrect');
      error.statusCode = 401;
      return next(error);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { newEmail, currentPassword } = req.body;

    // Validation
    if (!newEmail || !currentPassword) {
      const error: ApiError = new Error('New email and current password are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      const error: ApiError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      const error: ApiError = new Error('Current password is incorrect');
      error.statusCode = 401;
      return next(error);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      const error: ApiError = new Error('Email already in use');
      error.statusCode = 409;
      return next(error);
    }

    // Update email
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        telegramUsername: true,
        telegramId: true,
        createdAt: true,
      },
    });

    // Notify user of email change (send to new email)
    sendEmailChangeNotice(updatedUser.email, updatedUser.name).catch(err => {
      console.error('Failed to send email change notice:', err);
    });

    res.json({
      success: true,
      message: 'Email updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const linkTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { telegramUsername, telegramId, telegramAuthData } = req.body;

    // If Telegram auth data is provided (from Login Widget), verify it
    if (telegramAuthData) {
      const isValid = await verifyTelegramAuth(telegramAuthData);
      if (!isValid) {
        const error: ApiError = new Error('Invalid Telegram authentication data');
        error.statusCode = 401;
        return next(error);
      }
      // Use verified data from auth
      const verifiedId = telegramAuthData.id.toString();
      const verifiedUsername = telegramAuthData.username ? `@${telegramAuthData.username}` : null;

      // Check if this Telegram ID is already linked to another user
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: verifiedId },
      });

      if (existingUser && existingUser.id !== userId) {
        const error: ApiError = new Error('This Telegram account is already linked to another user');
        error.statusCode = 409;
        return next(error);
      }

      // Update user with verified Telegram information
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          telegramId: verifiedId,
          telegramUsername: verifiedUsername,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          telegramUsername: true,
          telegramId: true,
          createdAt: true,
        },
      });

      return res.json({
        success: true,
        message: 'Telegram account linked successfully',
        data: user,
      });
    }

    // Fallback to manual entry
    // Validation
    if (!telegramUsername && !telegramId) {
      const error: ApiError = new Error('Either telegramUsername or telegramId is required');
      error.statusCode = 400;
      return next(error);
    }

    // If telegramId is provided, check if it's already linked to another user
    if (telegramId) {
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: telegramId.toString() },
      });

      if (existingUser && existingUser.id !== userId) {
        const error: ApiError = new Error('This Telegram account is already linked to another user');
        error.statusCode = 409;
        return next(error);
      }
    }

    // Update user with Telegram information
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(telegramUsername && { telegramUsername: telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}` }),
        ...(telegramId && { telegramId: telegramId.toString() }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        telegramUsername: true,
        telegramId: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Telegram account linked successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Telegram authentication data
 * This verifies the hash to ensure the data came from Telegram
 */
async function verifyTelegramAuth(authData: any): Promise<boolean> {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      return false;
    }

    // Create secret key from bot token
    const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();

    // Create data check string
    const { hash, ...data } = authData;
    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n');

    // Create HMAC
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Verify hash
    return hmac === hash;
  } catch (error) {
    console.error('Error verifying Telegram auth:', error);
    return false;
  }
}

