# Telegram Bot Setup Guide

This guide explains how to set up the Telegram bot for automatically kicking users with expired live stream trials.

## Overview

The Telegram bot integration:
- Automatically checks for expired live stream subscriptions
- Kicks users from the Telegram channel when their trial expires
- Runs on a scheduled basis (default: every 60 minutes)

## Prerequisites

1. A Telegram account
2. Access to the Telegram channel you want to manage
3. Admin access to add the bot to the channel

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send the command `/newbot`
3. Follow the prompts to:
   - Choose a name for your bot (e.g., "Fitness Practica Live Stream Bot")
   - Choose a username (must end with "bot", e.g., "fitnesspractica_livestream_bot")
4. **Save the bot token** that BotFather gives you (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Channel ID

For private channels with invite links (like `https://t.me/+9E6XqWmWsfo5MjM0`), you need to get the actual channel ID:

### Option A: Using @userinfobot (Recommended)
1. Add **@userinfobot** to your channel
2. Send any message in thechann el
3. Forward that message to **@userinfobot**
4. The bot will reply with the channel ID (format: `-1001234567890`)
5. **Save this channel ID**

### Option B: Using @getidsbot
1. Add **@getidsbot** to your channel
2. Send `/start` in the channel
3. The bot will reply with the channel ID

### Option C: Using the Telegram API
If you have access to the Telegram API, you can use:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```
Then look for the `chat` object with `type: "channel"` and note the `id` field.

## Step 3: Add Bot to Channel as Admin

1. Open your Telegram channel
2. Go to channel settings (tap channel name → Edit)
3. Go to **Administrators**
4. Click **Add Administrator**
5. Search for your bot by username
6. **Important**: Grant the bot the following permissions:
   - ✅ **Ban users** (required to kick users)
   - ✅ **Delete messages** (optional, but recommended)
7. Save the changes

## Step 4: Configure Environment Variables

Add the following to your `server/.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHANNEL_ID=-1001234567890
TELEGRAM_CHECK_INTERVAL_MINUTES=60
```

**Important Notes:**
- `TELEGRAM_BOT_TOKEN`: The token from BotFather
- `TELEGRAM_CHANNEL_ID`: The numeric channel ID (not the invite link)
- `TELEGRAM_CHECK_INTERVAL_MINUTES`: How often to check for expired trials (default: 60 minutes)

## Step 5: Run Database Migration

The schema has been updated to include Telegram fields. Run the migration:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate dev --name add_telegram_fields
```

Or if using `prisma db push`:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

## Step 6: Test the Bot

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Check the logs - you should see:
   ```
   🤖 Starting Telegram bot scheduler (checking every 60 minutes)
   🔍 Checking for expired live stream trials...
   ✅ Finished checking expired trials
   ```

3. Test manually by calling the check function (you can add a test endpoint temporarily)

## Step 7: Set Up Telegram Webhook (Automatic Linking)

The system now supports automatic Telegram ID capture via webhooks! When users join your channel, their Telegram ID is automatically captured and linked to their account.

### A. Configure Webhook URL

1. Your webhook endpoint is: `https://yourdomain.com/api/webhooks/telegram`
2. Set this up using the Telegram Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/webhooks/telegram",
    "secret_token": "your_webhook_secret_here"
  }'
```

3. Add the webhook secret to your `.env`:
   ```env
   TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### B. Enable Chat Member Updates

The bot needs to receive updates when users join/leave the channel:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": []
  }'
```

Then enable chat member updates:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMemberUpdates" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }'
```

### C. How Automatic Linking Works

1. **User joins channel** → Telegram sends webhook to your server
2. **System captures** → Telegram ID and username are automatically captured
3. **Auto-linking** → System tries to match user by email pattern or username
4. **Manual fallback** → If auto-linking fails, user can link manually via Profile page

## Step 8: Manual Linking (Fallback)

If automatic linking doesn't work, users can link manually:

1. **Frontend Form**: Users can go to Profile page and click "Link Telegram"
2. **Enter Information**: They can enter either:
   - Telegram username (e.g., `@username` or `username`)
   - Telegram ID (numeric, e.g., `123456789`)

### Getting User Telegram ID

Users can find their Telegram ID by:
- Messaging **@userinfobot** and forwarding any message
- Using **@getidsbot**
- The bot automatically captures it when they join the channel (if webhook is set up)

## How It Works

1. **Scheduled Check**: Every hour (or configured interval), the bot checks for expired live stream subscriptions
2. **Find Expired Users**: Queries the database for users with:
   - `programId = 999` (Live Stream)
   - `status = 'active'`
   - `expiresAt <= now()`
3. **Update Status**: Changes status from `'active'` to `'expired'`
4. **Kick from Channel**: If the user has a `telegramId`, attempts to kick them from the channel
5. **Unban After Delay**: After 60 seconds, unbans the user so they can rejoin if they purchase again

## Troubleshooting

### Bot can't kick users
**Error**: `Bot lacks permission to kick users`

**Solution**: 
- Make sure the bot is added as an admin to the channel
- Verify the bot has "Ban users" permission enabled
- Check that the channel ID is correct

### Channel ID not working
**Error**: `Chat not found` or `Invalid chat_id`

**Solution**:
- Make sure you're using the numeric channel ID (e.g., `-1001234567890`), not the invite link
- Verify the bot is a member/admin of the channel
- For private channels, the bot must be added as an admin

### Users not being kicked
**Possible causes**:
1. User doesn't have `telegramId` linked in their profile
2. User's trial hasn't expired yet (check `expiresAt` in database)
3. User is not in the channel
4. Bot doesn't have admin permissions

**Debug steps**:
1. Check server logs for error messages
2. Verify user has `telegramId` in database
3. Check `expiresAt` date for the user's live stream subscription
4. Test manually by calling `kickUserFromChannel()` with a test user ID

### Scheduler not running
**Solution**:
- Check that `TELEGRAM_BOT_TOKEN` is set in `.env`
- Verify the server started successfully
- Check server logs for scheduler initialization message

## Security Notes

1. **Never commit the bot token** to version control
2. **Keep the token secure** - anyone with the token can control your bot
3. **Use environment variables** for all sensitive configuration
4. **Regularly rotate tokens** if compromised

## Future Enhancements

Potential improvements:
- Webhook integration for real-time updates
- Bot commands for users to link their accounts
- Automatic user ID capture when users join the channel
- Notification before trial expires
- Manual kick endpoint for admins

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the bot token by calling the Telegram API directly
4. Ensure the bot has proper permissions in the channel

