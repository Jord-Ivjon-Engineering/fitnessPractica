import { Router } from 'express';
import { createCheckout, verifyCheckout, getPolarEnv } from '../controllers/checkoutController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get Polar environment (public endpoint)
router.get('/environment', getPolarEnv);

// Create checkout session (requires authentication)
router.post('/', authenticate, createCheckout);

// Verify checkout status (requires authentication)
router.post('/verify/:checkoutId', authenticate, verifyCheckout);

export default router;

