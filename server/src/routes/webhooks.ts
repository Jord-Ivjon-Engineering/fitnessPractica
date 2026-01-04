import { Router } from 'express';
import express from 'express';
import { handlePolarWebhook } from '../controllers/webhookController';
import { handleTelegramWebhook } from '../controllers/telegramWebhookController';

const router = Router();

// Polar webhook endpoint (no authentication - uses signature verification)
// Must use express.raw() middleware to preserve raw body for signature verification
router.post(
  '/polar',
  express.raw({ type: 'application/json' }),
  handlePolarWebhook
);

// Telegram bot webhook endpoint
// Telegram sends JSON, so we use express.json() middleware
router.post(
  '/telegram',
  express.json(),
  handleTelegramWebhook
);

export default router;

