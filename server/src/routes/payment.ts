import { Router } from 'express';
import {
  getPaymentStatus,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get payment status (requires authentication)
router.get('/status/:sessionId', authenticate, getPaymentStatus);

export default router;

