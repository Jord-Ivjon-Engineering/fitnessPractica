import { Router } from 'express';
import {
  getAllPrograms,
  getProgramById,
  attachVideoToProgram,
  getProgramVideos,
} from '../controllers/trainingProgramController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getAllPrograms);
router.get('/:id', getProgramById);
// List videos for a program
router.get('/:id/videos', getProgramVideos);
// Attach a processed video URL to a training program (admin only)
router.post('/:id/videos', authenticate, requireAdmin, attachVideoToProgram);

export default router;

