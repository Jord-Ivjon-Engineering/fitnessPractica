import { Router } from 'express';
import {
  getAllPrograms,
  getProgramById,
  attachVideoToProgram,
  getProgramVideos,
  updateProgramVideo,
  updateVideoProgress,
  getVideoProgress,
  getVideoExercises,
} from '../controllers/trainingProgramController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllPrograms);
router.get('/:id', getProgramById);
// List videos for a program
router.get('/:id/videos', getProgramVideos);
// Get video progress for a user in a program
router.get('/:programId/progress', authenticate, getVideoProgress);
// Get exercises for a specific video
router.get('/videos/:videoId/exercises', getVideoExercises);
// Attach a processed video URL to a training program (admin only)
router.post('/:id/videos', authenticate, requireAdmin, attachVideoToProgram);
// Update video progress for a user
router.post('/:programId/videos/:videoId/progress', authenticate, updateVideoProgress);
// Update an existing video (admin only)
router.put('/:programId/videos/:videoId', authenticate, requireAdmin, updateProgramVideo);

export default router;

