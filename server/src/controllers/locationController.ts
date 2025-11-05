import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export const getAllLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

export const getLocationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid location ID');
      error.statusCode = 400;
      return next(error);
    }

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      const error: ApiError = new Error('Location not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone, mapUrl } = req.body;

    if (!name || !address) {
      const error: ApiError = new Error('Name and address are required');
      error.statusCode = 400;
      return next(error);
    }

    const location = await prisma.location.create({
      data: {
        name,
        address,
        phone: phone || null,
        mapUrl: mapUrl || null,
      },
    });

    res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid location ID');
      error.statusCode = 400;
      return next(error);
    }

    const { name, address, phone, mapUrl } = req.body;

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(phone !== undefined && { phone }),
        ...(mapUrl !== undefined && { mapUrl }),
      },
    });

    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const error: ApiError = new Error('Invalid location ID');
      error.statusCode = 400;
      return next(error);
    }

    await prisma.location.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

