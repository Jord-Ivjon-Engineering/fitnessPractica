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

export const attachVideoToProgram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fileUrl, title } = req.body as { fileUrl?: string; title?: string };

    if (!fileUrl) {
      const error: ApiError = new Error('fileUrl is required');
      error.statusCode = 400;
      return next(error);
    }

    const programId = parseInt(id, 10);
    const program = await prisma.trainingProgram.findUnique({ where: { id: programId } });

    if (!program) {
      const error: ApiError = new Error('Program not found');
      error.statusCode = 404;
      return next(error);
    }

    // Create a ProgramVideo record linked to the program
    // prisma client may not yet have ProgramVideo in generated types until prisma generate is run.
    // Use a safe any-cast to avoid TypeScript errors in dev environments; the runtime client will have the model after generation.
    const created = await (prisma as any).programVideo.create({
      data: {
        programId,
        url: fileUrl,
        title: title || null,
      },
    });

    res.json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const getProgramVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const programId = parseInt(id, 10);

    const videos = await (prisma as any).programVideo.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

export const updateProgramVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { programId, videoId } = req.params;
    const { fileUrl, title } = req.body as { fileUrl?: string; title?: string };

    if (!fileUrl) {
      const error: ApiError = new Error('fileUrl is required');
      error.statusCode = 400;
      return next(error);
    }

    const programIdNum = parseInt(programId, 10);
    const videoIdNum = parseInt(videoId, 10);

    // Verify program exists
    const program = await prisma.trainingProgram.findUnique({ where: { id: programIdNum } });
    if (!program) {
      const error: ApiError = new Error('Program not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify video exists and belongs to program
    const existingVideo = await (prisma as any).programVideo.findFirst({
      where: { id: videoIdNum, programId: programIdNum },
    });

    if (!existingVideo) {
      const error: ApiError = new Error('Video not found');
      error.statusCode = 404;
      return next(error);
    }

    // Update the video
    const updated = await (prisma as any).programVideo.update({
      where: { id: videoIdNum },
      data: {
        url: fileUrl,
        ...(title !== undefined && { title: title || null }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

