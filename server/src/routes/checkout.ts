import { Router } from 'express';
import { createCheckout, verifyCheckout } from '../controllers/checkoutController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Create checkout session (requires authentication)
router.post('/', authenticate, createCheckout);

// Verify checkout status (requires authentication)
router.get('/verify/:checkoutId', authenticate, verifyCheckout);

export default router;

