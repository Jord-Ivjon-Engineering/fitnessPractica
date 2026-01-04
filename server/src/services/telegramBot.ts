import axios from 'axios';
import prisma from '../config/database';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Channel ID can be:
// - A numeric ID (e.g., -1001234567890) for private channels
// - A username starting with @ (e.g., @channelname) for public channels
// - For private channels with invite links, you need to get the actual channel ID
//   You can use @userinfobot or @getidsbot to get the channel ID
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1001234567890'; // Channel ID or username
const LIVE_STREAM_PROGRAM_ID = 999;

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Get chat member information for a specific user by ID
 * This is more reliable than getting all members for private channels
 */
export async function getChatMember(telegramUserId: number): Promise<TelegramUser | null> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const response = await axios.get(`${TELEGRAM_API_BASE}/getChatMember`, {
      params: {
        chat_id: TELEGRAM_CHANNEL_ID,
        user_id: telegramUserId,
      },
    });

    if (response.data.ok && response.data.result) {
      const member = response.data.result.user;
      return {
        id: member.id,
        username: member.username,
        first_name: member.first_name,
        last_name: member.last_name,
      };
    }

    return null;
  } catch (error: any) {
    // User might not be in the channel, which is fine
    if (error.response?.data?.error_code === 400) {
      return null;
    }
    console.error('Error getting chat member:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get chat member information by username
 * Note: Telegram Bot API limitations mean we can only reliably get IDs for administrators
 * For regular members, we need their user ID. This function will:
 * 1. Check if the user is an administrator (can get their ID)
 * 2. Return null for regular members (we can't get their ID from username alone)
 */
export async function getChatMemberByUsername(username: string): Promise<TelegramUser | null> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    // Remove @ if present
    const cleanUsername = username.replace(/^@/, '').toLowerCase();

    // Try to get chat administrators (they have IDs we can use)
    try {
      const adminsResponse = await axios.get(`${TELEGRAM_API_BASE}/getChatAdministrators`, {
        params: {
          chat_id: TELEGRAM_CHANNEL_ID,
        },
      });

      if (adminsResponse.data.ok && adminsResponse.data.result) {
        const admins = adminsResponse.data.result;
        const matchingAdmin = admins.find((admin: any) => {
          const adminUsername = admin.user?.username?.toLowerCase();
          return adminUsername === cleanUsername;
        });
        
        if (matchingAdmin?.user) {
          console.log(`✅ Found user ${username} as channel administrator (ID: ${matchingAdmin.user.id})`);
          return {
            id: matchingAdmin.user.id,
            username: matchingAdmin.user.username,
            first_name: matchingAdmin.user.first_name,
            last_name: matchingAdmin.user.last_name,
          };
        }
      }
    } catch (adminError: any) {
      // If we can't get admins, log it but continue
      if (adminError.response?.data?.error_code !== 400) {
        console.log('Could not get chat administrators:', adminError.response?.data?.description || adminError.message);
      }
    }

    // For regular members, we cannot get their ID from username using the Bot API
    // The Telegram Bot API doesn't provide a way to resolve username to user ID for regular channel members
    // Users should provide their Telegram ID when linking their account, or be channel administrators
    console.log(`⚠️  User ${username} is not a channel administrator. Cannot resolve username to ID for regular members. User should provide their Telegram ID.`);
    
    return null;
  } catch (error: any) {
    console.error('Error getting chat member by username:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Kick a user from the Telegram channel by ID or username
 * Note: The bot must be an admin of the channel with permission to ban users
 * @param identifier - Either a numeric Telegram user ID or a username (with or without @)
 * @returns Object with success status and reason
 */
export async function kickUserFromChannel(identifier: number | string): Promise<{ success: boolean; reason: string }> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    let telegramUserId: number;
    let member: TelegramUser | null = null;

    // Determine if identifier is a number (ID) or string (username)
    if (typeof identifier === 'number') {
      telegramUserId = identifier;
      // Try to get member info by ID (optional - for logging)
      member = await getChatMember(telegramUserId).catch(() => null);
    } else {
      // It's a username - try to find their ID
      const username = identifier.replace(/^@/, '');
      member = await getChatMemberByUsername(username);
      
      if (!member) {
        return {
          success: false,
          reason: `Could not resolve username ${username} to Telegram ID. User may not be a channel administrator.`
        };
      }
      
      telegramUserId = member.id;
      console.log(`ℹ️  Resolved username ${username} to Telegram ID: ${telegramUserId}`);
    }

    // Log attempt details for debugging
    console.log(`🔍 Attempting to kick user ${telegramUserId} from channel ${TELEGRAM_CHANNEL_ID}`);

    // Try to ban the user directly (don't check if they're in channel first)
    // The API will tell us if they're not in the channel or if there's a permission issue
    const response = await axios.post(`${TELEGRAM_API_BASE}/banChatMember`, {
      chat_id: TELEGRAM_CHANNEL_ID,
      user_id: telegramUserId,
      until_date: Math.floor(Date.now() / 1000) + 60, // Ban for 60 seconds (effectively a kick)
    });

    if (response.data.ok) {
      const identifierStr = typeof identifier === 'string' ? identifier : telegramUserId.toString();
      const userInfo = member ? `(${member.username || member.first_name || 'unknown'})` : '';
      console.log(`✅ Successfully kicked user ${identifierStr} ${userInfo} (ID: ${telegramUserId}) from Telegram channel`);
      
      // Unban after 60 seconds to allow rejoin if they purchase again
      setTimeout(async () => {
        try {
          await axios.post(`${TELEGRAM_API_BASE}/unbanChatMember`, {
            chat_id: TELEGRAM_CHANNEL_ID,
            user_id: telegramUserId,
            only_if_banned: true,
          });
          console.log(`✅ Unbanned user ${telegramUserId} - they can now rejoin if they purchase again`);
        } catch (unbanError: any) {
          console.error(`Error unbanning user ${telegramUserId}:`, unbanError.response?.data || unbanError.message);
        }
      }, 61000); // Unban after 61 seconds (slightly more than ban duration)

      return { success: true, reason: 'User successfully kicked from channel' };
    }

    return { success: false, reason: 'Ban request returned false' };
  } catch (error: any) {
    // Handle specific error cases
    const identifierStr = typeof identifier === 'string' ? identifier : identifier.toString();
    const errorCode = error.response?.data?.error_code;
    const errorDescription = error.response?.data?.description || error.message;
    const fullError = error.response?.data;

    // Log full error for debugging
    console.error(`❌ Telegram API Error when kicking user ${identifierStr}:`, {
      error_code: errorCode,
      description: errorDescription,
      full_response: fullError
    });

    if (errorCode === 400) {
      // Check for specific error messages
      if (errorDescription?.includes('chat not found') || errorDescription?.includes('Chat not found')) {
        return {
          success: false,
          reason: `Channel not found. Check TELEGRAM_CHANNEL_ID (current: ${TELEGRAM_CHANNEL_ID}). Make sure the bot is added to the channel as an admin.`
        };
      }
      if (errorDescription?.includes('user not found') || errorDescription?.includes('not found in the chat')) {
        return {
          success: false,
          reason: `User ${identifierStr} (ID: ${typeof identifier === 'number' ? identifier : 'N/A'}) is not a member of the channel. They may have left or were never added.`
        };
      }
      if (errorDescription?.includes('can\'t remove chat owner')) {
        return {
          success: false,
          reason: 'Cannot kick channel owner'
        };
      }
      if (errorDescription?.includes('not enough rights')) {
        return {
          success: false,
          reason: 'Bot does not have permission to ban users. Make sure the bot is an admin with "Ban users" permission enabled.'
        };
      }
      return {
        success: false,
        reason: `Invalid request (400): ${errorDescription}`
      };
    }
    
    if (errorCode === 403) {
      return {
        success: false,
        reason: 'Bot lacks permission to kick users (403 Forbidden). Make sure the bot is an admin with ban permissions.'
      };
    }

    console.error(`Error kicking user ${identifierStr}:`, error.response?.data || error.message);
    return {
      success: false,
      reason: `Error (${errorCode || 'unknown'}): ${errorDescription}`
    };
  }
}

/**
 * Try to discover channel ID from recent updates
 * This can help if the channel ID is unknown
 */
export async function discoverChannelId(): Promise<string | null> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return null;
    }

    // Get recent updates
    const updatesResponse = await axios.get(`${TELEGRAM_API_BASE}/getUpdates`, {
      params: {
        limit: 100,
      },
    });

    if (updatesResponse.data.ok && updatesResponse.data.result) {
      const updates = updatesResponse.data.result;
      
      // Look for channel-related updates
      for (const update of updates) {
        if (update.channel_post?.chat) {
          const chat = update.channel_post.chat;
          if (chat.type === 'channel' && chat.id) {
            console.log(`📢 Found channel in updates: ${chat.title || 'Unknown'} (ID: ${chat.id})`);
            return chat.id.toString();
          }
        }
        if (update.message?.chat?.type === 'channel' && update.message.chat.id) {
          const chat = update.message.chat;
          console.log(`📢 Found channel in updates: ${chat.title || 'Unknown'} (ID: ${chat.id})`);
          return chat.id.toString();
        }
        if (update.chat_member?.chat?.type === 'channel' && update.chat_member.chat.id) {
          const chat = update.chat_member.chat;
          console.log(`📢 Found channel in updates: ${chat.title || 'Unknown'} (ID: ${chat.id})`);
          return chat.id.toString();
        }
      }
    }

    return null;
  } catch (error: any) {
    console.error('Error discovering channel ID:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Verify bot can access the channel and has proper permissions
 */
export async function verifyChannelAccess(): Promise<{ success: boolean; message: string }> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return { success: false, message: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    console.log(`🔍 Verifying access to channel: ${TELEGRAM_CHANNEL_ID}`);

    // Try to get chat info
    const chatInfoResponse = await axios.get(`${TELEGRAM_API_BASE}/getChat`, {
      params: {
        chat_id: TELEGRAM_CHANNEL_ID,
      },
    });

    if (chatInfoResponse.data.ok) {
      const chat = chatInfoResponse.data.result;
      console.log(`✅ Bot can access channel: ${chat.title || TELEGRAM_CHANNEL_ID} (Type: ${chat.type}, ID: ${chat.id})`);
      
      // Try to get bot's member info to check permissions
      try {
        const botMeResponse = await axios.get(`${TELEGRAM_API_BASE}/getMe`);
        const botId = botMeResponse.data.result.id;
        const botUsername = botMeResponse.data.result.username;
        console.log(`🤖 Bot info: @${botUsername} (ID: ${botId})`);
        
        const botInfoResponse = await axios.get(`${TELEGRAM_API_BASE}/getChatMember`, {
          params: {
            chat_id: TELEGRAM_CHANNEL_ID,
            user_id: botId,
          },
        });
        
        if (botInfoResponse.data.ok) {
          const botMember = botInfoResponse.data.result;
          console.log(`📋 Bot status in channel: ${botMember.status}`);
          const canBan = botMember.status === 'administrator' && botMember.can_restrict_members;
          if (canBan) {
            return { success: true, message: 'Bot has access and ban permissions' };
          } else {
            return { 
              success: false, 
              message: `Bot is in channel but does not have ban permissions. Status: ${botMember.status}. Make sure the bot is an administrator with "Ban users" permission enabled.` 
            };
          }
        }
      } catch (memberError: any) {
        return { success: false, message: `Cannot verify bot permissions: ${memberError.response?.data?.description || memberError.message}` };
      }
    }

    return { success: false, message: 'Cannot access channel info' };
  } catch (error: any) {
    const errorDesc = error.response?.data?.description || error.message;
    if (error.response?.data?.error_code === 400) {
      // Try to discover channel ID
      console.log('🔍 Attempting to discover channel ID from recent updates...');
      const discoveredId = await discoverChannelId();
      
      let message = `Channel not found or bot not in channel. Current TELEGRAM_CHANNEL_ID: ${TELEGRAM_CHANNEL_ID}`;
      if (discoveredId) {
        message += `\n💡 Found potential channel ID in recent updates: ${discoveredId}`;
        message += `\n   Try updating TELEGRAM_CHANNEL_ID to: ${discoveredId}`;
      } else {
        message += `\n\n📝 To fix this:\n`;
        message += `1. Make sure your bot (@Fitness_Practica_Bot) is added to the channel as an administrator\n`;
        message += `2. Get the correct channel ID using @userinfobot:\n`;
        message += `   - Add @userinfobot to your channel\n`;
        message += `   - Send any message in the channel\n`;
        message += `   - Forward that message to @userinfobot\n`;
        message += `   - It will reply with the channel ID (format: -1001234567890)\n`;
        message += `3. Update TELEGRAM_CHANNEL_ID in your server/.env file\n`;
      }
      return { success: false, message };
    }
    return { success: false, message: `Error verifying channel: ${errorDesc}` };
  }
}

/**
 * Check for expired live stream trials and kick users
 */
export async function checkAndKickExpiredUsers(): Promise<void> {
  try {
    console.log('🔍 Checking for expired live stream trials...');
    
    // Verify channel access first
    const channelCheck = await verifyChannelAccess();
    if (!channelCheck.success) {
      console.warn(`⚠️  Channel access issue: ${channelCheck.message}`);
      console.warn(`⚠️  Continuing anyway, but kicks may fail...`);
    }

    const now = new Date();
    
    // Find all active live stream user programs that have just expired
    const newlyExpiredPrograms = await prisma.userProgram.findMany({
      where: {
        programId: LIVE_STREAM_PROGRAM_ID,
        status: 'active',
        expiresAt: {
          lte: now, // Less than or equal to now = expired
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            telegramId: true,
            telegramUsername: true,
          },
        },
      },
    });

    // Also find expired subscriptions that have Telegram info (ID or username) but might not have been kicked yet
    // (e.g., user linked Telegram after subscription expired)
    const expiredWithTelegram = await prisma.userProgram.findMany({
      where: {
        programId: LIVE_STREAM_PROGRAM_ID,
        status: 'expired',
        expiresAt: {
          lte: now,
        },
        user: {
          OR: [
            { telegramId: { not: null } },
            { telegramUsername: { not: null } },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            telegramId: true,
            telegramUsername: true,
          },
        },
      },
    });

    const allExpiredPrograms = [...newlyExpiredPrograms, ...expiredWithTelegram];
    console.log(`Found ${newlyExpiredPrograms.length} newly expired and ${expiredWithTelegram.length} previously expired subscriptions with Telegram info`);

    for (const userProgram of allExpiredPrograms) {
      const user = userProgram.user;
      
      // Update status to expired if it's still active
      if (userProgram.status === 'active') {
        await prisma.userProgram.update({
          where: { id: userProgram.id },
          data: { status: 'expired' },
        });
      }

      // Kick user from Telegram channel if they have Telegram info (ID or username)
      if (user.telegramId) {
        // Try using Telegram ID first (most reliable)
        const telegramUserId = parseInt(user.telegramId, 10);
        if (!isNaN(telegramUserId)) {
          const result = await kickUserFromChannel(telegramUserId);
          if (result.success) {
            console.log(`✅ Kicked user ${user.email} (Telegram ID: ${telegramUserId}) - Trial expired on ${userProgram.expiresAt}`);
          } else {
            console.log(`⚠️ Failed to kick user ${user.email} (Telegram ID: ${telegramUserId}): ${result.reason}`);
          }
        }
      } else if (user.telegramUsername) {
        // Fallback to username if ID is not available
        const username = user.telegramUsername.replace(/^@/, '');
        const result = await kickUserFromChannel(username);
        if (result.success) {
          console.log(`✅ Kicked user ${user.email} (Telegram username: ${user.telegramUsername}) - Trial expired on ${userProgram.expiresAt}`);
        } else {
          console.log(`⚠️ Failed to kick user ${user.email} (Telegram username: ${user.telegramUsername}): ${result.reason}`);
        }
      } else {
        console.log(`⚠️ User ${user.email} has expired trial but no Telegram ID or username linked`);
      }
    }

    console.log('✅ Finished checking expired trials');
  } catch (error: any) {
    console.error('Error checking expired trials:', error);
  }
}

/**
 * Get chat information
 */
export async function getChatInfo(): Promise<any> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const response = await axios.get(`${TELEGRAM_API_BASE}/getChat`, {
      params: {
        chat_id: TELEGRAM_CHANNEL_ID,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error getting chat info:', error.response?.data || error.message);
    return null;
  }
}

