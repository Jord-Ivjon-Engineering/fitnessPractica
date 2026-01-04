import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; // Optional secret for webhook verification

/**
 * Verify Telegram webhook secret (if configured)
 */
function verifyWebhookSecret(req: Request): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    return true; // No secret configured, skip verification
  }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string;
  return secretHeader === TELEGRAM_WEBHOOK_SECRET;
}

/**
 * Handle Telegram bot webhook updates
 */
export const handleTelegramWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify webhook secret if configured
    if (!verifyWebhookSecret(req)) {
      const error: ApiError = new Error('Invalid webhook secret');
      error.statusCode = 401;
      return next(error);
    }

    const update = req.body;

    // Telegram sends updates in this format
    if (!update || !update.update_id) {
      return res.status(200).json({ ok: true }); // Acknowledge but ignore invalid updates
    }

    console.log('📱 Telegram webhook received:', update.update_id, update.message?.text || update.chat_member?.new_chat_member?.status || 'other');

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    }

    if (update.chat_member) {
      await handleChatMember(update.chat_member);
    }

    if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member);
    }

    // Always respond with OK to acknowledge receipt
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Error handling Telegram webhook:', error);
    // Still return OK to prevent Telegram from retrying
    return res.status(200).json({ ok: true });
  }
};

/**
 * Handle incoming messages (for bot commands)
 */
async function handleMessage(message: any) {
  try {
    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username;
    const text = message.text;

    if (!userId || !text) {
      return;
    }

    // Handle /link command
    if (text.startsWith('/link')) {
      const verificationCode = text.split(' ')[1]?.trim();
      
      if (!verificationCode) {
        // Send message back to user (would need to implement sendMessage function)
        console.log(`User ${userId} (@${username}) tried /link without code`);
        return;
      }

      // Find user by verification code
      const user = await prisma.user.findFirst({
        where: {
          // Store verification code temporarily (you might want to add a field for this)
          // For now, we'll use a simple approach: check if email matches pattern
          // Or implement a verification code system
        },
      });

      if (user) {
        // Link Telegram account
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramId: userId.toString(),
            telegramUsername: username ? `@${username}` : null,
          },
        });

        console.log(`✅ Linked Telegram account ${userId} (@${username}) to user ${user.email}`);
        // Send confirmation message to user
      }
    }

    // Handle /start command with verification code
    if (text.startsWith('/start')) {
      const verificationCode = text.split(' ')[1]?.trim();
      
      if (verificationCode) {
        await handleVerificationCode(userId, username, verificationCode);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

/**
 * Handle chat_member updates (when users join/leave channel)
 */
async function handleChatMember(chatMember: any) {
  try {
    const chatId = chatMember.chat?.id;
    const newStatus = chatMember.new_chat_member?.status;
    const oldStatus = chatMember.old_chat_member?.status;
    const user = chatMember.new_chat_member?.user;

    if (!user || !chatId) {
      return;
    }

    const telegramUserId = user.id;
    const telegramUsername = user.username ? `@${user.username}` : null;

    // Check if this is the channel we're monitoring
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    const channelIdNum = channelId?.startsWith('-') ? parseInt(channelId) : null;
    
    // Channel ID might be string or number, handle both
    if (channelId && chatId.toString() !== channelId.toString() && chatId !== channelIdNum) {
      return; // Not our channel
    }

    // User joined the channel
    if (newStatus === 'member' && oldStatus !== 'member') {
      console.log(`👤 User ${telegramUserId} (@${telegramUsername || 'no username'}) joined channel`);

      // Try to automatically link if we can match by email or other method
      // For now, we'll just log it - you can implement matching logic
      await handleUserJoined(telegramUserId, telegramUsername, user.first_name, user.last_name);
    }

    // User left the channel
    if (newStatus === 'left' || newStatus === 'kicked') {
      console.log(`👋 User ${telegramUserId} left channel`);
    }
  } catch (error) {
    console.error('Error handling chat member:', error);
  }
}

/**
 * Handle my_chat_member updates (bot's own status changes)
 */
async function handleMyChatMember(myChatMember: any) {
  try {
    const chatId = myChatMember.chat?.id;
    const newStatus = myChatMember.new_chat_member?.status;

    console.log(`🤖 Bot status changed in chat ${chatId}: ${newStatus}`);
  } catch (error) {
    console.error('Error handling my chat member:', error);
  }
}

/**
 * Handle user joining the channel - try to auto-link
 */
async function handleUserJoined(
  telegramUserId: number,
  telegramUsername: string | null,
  firstName?: string,
  lastName?: string
) {
  try {
    // Check if this Telegram ID is already linked
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: telegramUserId.toString() },
    });

    if (existingUser) {
      // Update username if it changed
      if (telegramUsername && existingUser.telegramUsername !== telegramUsername) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { telegramUsername },
        });
        console.log(`✅ Updated Telegram username for user ${existingUser.email}`);
      }
      return;
    }

    // Try to match by username if provided
    if (telegramUsername) {
      // Remove @ if present
      const cleanUsername = telegramUsername.replace('@', '').toLowerCase();
      
      // Try to find user by email that might match username pattern
      // This is a simple heuristic - you might want to improve this
      // Note: MySQL doesn't support case-insensitive contains directly, so we'll do a simple match
      const potentialMatches = await prisma.user.findMany({
        where: {
          telegramId: null, // Not already linked
        },
        take: 10, // Get more results to filter manually
      });

      // Filter matches where email contains the username (case-insensitive)
      const matches = potentialMatches.filter(user => 
        user.email.toLowerCase().includes(cleanUsername)
      );

      // If we find a single match, link it
      if (matches.length === 1) {
        await prisma.user.update({
          where: { id: matches[0].id },
          data: {
            telegramId: telegramUserId.toString(),
            telegramUsername,
          },
        });
        console.log(`✅ Auto-linked Telegram account ${telegramUserId} to user ${matches[0].email}`);
        return;
      }
    }

    // If no auto-match found, log for manual linking
    console.log(`ℹ️  User ${telegramUserId} (@${telegramUsername || 'no username'}) joined but not auto-linked. They can link manually via profile.`);
  } catch (error) {
    console.error('Error handling user joined:', error);
  }
}

/**
 * Handle verification code from /start command
 */
async function handleVerificationCode(
  telegramUserId: number,
  telegramUsername: string | null,
  verificationCode: string
) {
  try {
    // Generate a simple verification code system
    // You can store verification codes in a temporary table or use a pattern
    // For now, we'll use a simple approach: check if code matches a pattern
    
    // Example: Code format could be "LINK-{userId}-{hash}"
    // Or store codes in a separate table with expiration
    
    // For simplicity, let's check if code is in format that includes user ID
    // You should implement a proper verification code system
    
    console.log(`🔐 Verification code received: ${verificationCode} from user ${telegramUserId}`);
    
    // TODO: Implement proper verification code lookup
    // This would involve:
    // 1. Storing verification codes when user requests them
    // 2. Checking code validity and expiration
    // 3. Linking account if valid
    
  } catch (error) {
    console.error('Error handling verification code:', error);
  }
}

/**
 * Generate a verification code for a user
 */
export async function generateVerificationCode(userId: number): Promise<string> {
  // Generate a unique verification code
  const code = crypto.randomBytes(8).toString('hex').toUpperCase();
  
  // Store code with expiration (you might want to add a verification_codes table)
  // For now, we'll use a simple pattern: LINK-{userId}-{code}
  const verificationCode = `LINK-${userId}-${code}`;
  
  // TODO: Store in database with expiration time
  // await prisma.verificationCode.create({
  //   data: {
  //     userId,
  //     code: verificationCode,
  //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  //   },
  // });
  
  return verificationCode;
}

