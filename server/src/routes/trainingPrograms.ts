import { Router } from 'express';
import {
  getAllPrograms,
  getProgramById,
  createPlaceholderVideo,
  attachVideoToProgram,
  getProgramVideos,
  updateProgramVideo,
  deleteProgramVideo,
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
// Create a placeholder video with exercisesData but no URL (admin only)
router.post('/:id/videos/placeholder', authenticate, requireAdmin, createPlaceholderVideo);
// Attach a processed video URL to a training program (admin only)
router.post('/:id/videos', authenticate, requireAdmin, attachVideoToProgram);
// Update video progress for a user
router.post('/:programId/videos/:videoId/progress', authenticate, updateVideoProgress);
// Update an existing video (admin only)
router.put('/:programId/videos/:videoId', authenticate, requireAdmin, updateProgramVideo);
// Delete a video from a program (admin only)
router.delete('/:programId/videos/:videoId', authenticate, requireAdmin, deleteProgramVideo);

export default router;

