import { Router } from 'express';
import {
  createCheckoutSession,
  getPaymentStatus,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Create checkout session (requires authentication)
router.post('/create-checkout-session', authenticate, createCheckoutSession);

// Get payment status (requires authentication)
router.get('/status/:sessionId', authenticate, getPaymentStatus);

export default router;

