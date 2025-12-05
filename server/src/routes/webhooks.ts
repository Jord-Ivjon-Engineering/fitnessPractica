import { Router } from 'express';
import express from 'express';
import { handlePolarWebhook } from '../controllers/webhookController';

const router = Router();

// Polar webhook endpoint (no authentication - uses signature verification)
// Must use express.raw() middleware to preserve raw body for signature verification
router.post(
  '/polar',
  express.raw({ type: 'application/json' }),
  handlePolarWebhook
);

export default router;

