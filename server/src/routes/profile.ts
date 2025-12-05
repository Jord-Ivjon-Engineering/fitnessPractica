import { Router } from 'express';
import {
  getProfile,
  getUserPrograms,
  updateProfile,
  purchaseProgram,
  updatePassword,
  updateEmail,
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getProfile);
router.get('/programs', getUserPrograms);
router.put('/', updateProfile);
router.post('/purchase', purchaseProgram);
router.put('/password', updatePassword);
router.put('/email', updateEmail);

export default router;

