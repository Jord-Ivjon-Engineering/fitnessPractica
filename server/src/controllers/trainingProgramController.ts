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

export const createPlaceholderVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, exercisesData } = req.body as { 
      title?: string; 
      exercisesData?: any;
    };

    const programId = parseInt(id, 10);
    const program = await prisma.trainingProgram.findUnique({ where: { id: programId } });

    if (!program) {
      const error: ApiError = new Error('Program not found');
      error.statusCode = 404;
      return next(error);
    }

    // Create a placeholder ProgramVideo record with exercisesData but no URL yet
    const created = await (prisma as any).programVideo.create({
      data: {
        programId,
        url: '', // Empty URL - will be updated when video is processed
        title: title || null,
        exercisesData: exercisesData || null,
      },
    });

    res.json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const attachVideoToProgram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fileUrl, title, exercisesData } = req.body as { 
      fileUrl?: string; 
      title?: string; 
      exercisesData?: any;
    };

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
        exercisesData: exercisesData || null,
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
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

export const updateProgramVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { programId, videoId } = req.params;
    const { fileUrl, title, exercisesData } = req.body as { 
      fileUrl?: string; 
      title?: string; 
      exercisesData?: any; 
    };

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
        ...(exercisesData !== undefined && { exercisesData: exercisesData || null }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteProgramVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { programId, videoId } = req.params;

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

    // Delete the video (cascade will handle related records like videoProgress)
    await (prisma as any).programVideo.delete({
      where: { id: videoIdNum },
    });

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoId, programId } = req.params;
    const { watchedPercentage } = req.body as { watchedPercentage: number };
    const userId = (req as any).user?.id;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    if (watchedPercentage === undefined || watchedPercentage < 0 || watchedPercentage > 100) {
      const error: ApiError = new Error('watchedPercentage must be between 0 and 100');
      error.statusCode = 400;
      return next(error);
    }

    const videoIdNum = parseInt(videoId, 10);
    const programIdNum = parseInt(programId, 10);

    // Verify video and program exist
    const video = await (prisma as any).programVideo.findUnique({
      where: { id: videoIdNum },
    });

    if (!video) {
      const error: ApiError = new Error('Video not found');
      error.statusCode = 404;
      return next(error);
    }

    if (video.programId !== programIdNum) {
      const error: ApiError = new Error('Video does not belong to this program');
      error.statusCode = 400;
      return next(error);
    }

    // Upsert video progress record
    const progress = await (prisma as any).videoProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId: videoIdNum,
        },
      },
      update: {
        watchedPercentage,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        videoId: videoIdNum,
        programId: programIdNum,
        watchedPercentage,
      },
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

export const getVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure authenticate middleware provided a user
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { programId } = req.params;
    if (!programId) {
      return res.status(400).json({ success: false, message: 'programId is required' });
    }

    const programIdNum = parseInt(programId, 10);

    // Get all video progress for this user in this program
    const progresses = await (prisma as any).videoProgress.findMany({
      where: {
        userId: user.id,
        programId: programIdNum,
      },
      include: {
        video: true,
      },
    });

    return res.json({ success: true, data: progresses });
  } catch (error) {
    next(error);
  }
};

export const getVideoExercises = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'videoId is required' });
    }

    const videoIdNum = parseInt(videoId, 10);

    // Get all exercises for this video, ordered by startTime
    const exercises = await (prisma as any).videoExercise.findMany({
      where: {
        videoId: videoIdNum,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return res.json({ success: true, data: exercises });
  } catch (error) {
    next(error);
  }
};

export const deleteVideosWithoutUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Safer cleanup: only delete very old placeholders (e.g., > 1 hour)
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);

    const result = await (prisma as any).programVideo.deleteMany({
      where: {
        url: '',
        createdAt: {
          lt: cutoff,
        },
      },
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} old placeholder video(s)` ,
      data: { deletedCount: result.count, cutoff },
    });
  } catch (error) {
    next(error);
  }
};