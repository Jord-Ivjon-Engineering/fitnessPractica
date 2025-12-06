# Deploying Optimizations to Production

This guide walks you through deploying the video rendering optimizations to your DigitalOcean production server.

## Step 1: Commit and Push Changes (Local Machine)

First, commit and push your changes to your Git repository:

```bash
# On your local machine
git add .
git commit -m "Optimize video rendering for 4GB RAM / 2 vCPU DigitalOcean droplet"
git push origin main
```

## Step 2: Connect to Your DigitalOcean Droplet

SSH into your production server:

```bash
ssh root@YOUR_DROPLET_IP
# or
ssh root@yourdomain.com
```

## Step 3: Run Server Optimization (First Time Only)

**⚠️ Important**: If you haven't run the optimization script before, do it now:

```bash
cd /var/www/fitness-practica
chmod +x scripts/optimize-server.sh
sudo bash scripts/optimize-server.sh
```

This will:
- Create a 2GB swap file (critical for 4GB RAM)
- Optimize memory settings
- Set up automatic cleanup

**Note**: You only need to run this once. Skip this step if you've already run it.

## Step 4: Deploy the Code Changes

You have two options:

### Option A: Use the Automated Deployment Script (Recommended)

```bash
cd /var/www/fitness-practica
chmod +x deploy.sh
sudo ./deploy.sh
```

This script will:
- Pull latest changes from Git
- Install/update dependencies
- Build backend and frontend
- Run database migrations
- Restart PM2 processes
- Reload Nginx

### Option B: Manual Deployment

If you prefer to do it manually:

```bash
cd /var/www/fitness-practica

# Pull latest changes
git pull origin main

# Update backend
cd server
npm install --production
npm run build
npm run prisma:generate
npm run prisma:migrate deploy

# Update frontend
cd ..
npm install --production
npm run build

# Restart application
pm2 restart all

# Reload Nginx
nginx -t && systemctl reload nginx
```

## Step 5: Verify the Deployment

Check that everything is working:

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs fitness-practica-api --lines 20

# Verify swap file is active
free -h
swapon --show

# Check system resources
df -h  # Disk space
```

## Step 6: Test Video Processing

1. Upload a test video through your application
2. Process it with overlays
3. Monitor the logs: `pm2 logs fitness-practica-api`
4. Check memory usage: `free -h` (should show swap being used if needed)

## Troubleshooting

### If deployment script fails:

```bash
# Check Git status
cd /var/www/fitness-practica
git status

# Check for uncommitted changes (you may need to stash them)
git stash

# Try pulling again
git pull origin main
```

### If PM2 restart fails:

```bash
# Check PM2 logs
pm2 logs fitness-practica-api --err

# Check if process is running
pm2 list

# Restart manually
pm2 restart fitness-practica-api
```

### If memory issues occur:

```bash
# Verify swap is active
swapon --show
free -h

# If swap is not active, run optimization script again
sudo bash scripts/optimize-server.sh
```

### If build fails:

```bash
# Clear node_modules and reinstall
cd /var/www/fitness-practica/server
rm -rf node_modules
npm install --production
npm run build
```

## Quick Reference: One-Line Deployment

For future updates, you can use this one-liner:

```bash
cd /var/www/fitness-practica && git pull origin main && cd server && npm install --production && npm run build && npm run prisma:generate && npm run prisma:migrate deploy && cd .. && npm install --production && npm run build && pm2 restart all && nginx -t && systemctl reload nginx
```

Or simply use the deployment script:

```bash
cd /var/www/fitness-practica && sudo ./deploy.sh
```

## What Changed in This Update

The optimizations include:
- ✅ CPU encoding optimized for 2 vCPUs (threads: 2)
- ✅ Memory-efficient batch processing (batch size: 24)
- ✅ Reduced video file size limit (3GB instead of 5GB)
- ✅ Memory monitoring and warnings
- ✅ PM2 memory limit set to 1.8GB
- ✅ System optimization script for swap and memory settings

## Next Steps After Deployment

1. **Monitor the first few video processing jobs** to ensure they complete successfully
2. **Check memory usage** during processing: `watch -n 1 free -h`
3. **Review logs** for any warnings: `pm2 logs fitness-practica-api`
4. **Verify swap is being used** when needed: `swapon --show`

Your production server is now optimized for video rendering on a 4GB RAM / 2 vCPU droplet! 🚀

