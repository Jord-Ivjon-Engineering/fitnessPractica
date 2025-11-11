import { Router } from 'express';
import {
  getAllPrograms,
  getProgramById,
} from '../controllers/trainingProgramController';

const router = Router();

router.get('/', getAllPrograms);
router.get('/:id', getProgramById);

export default router;

