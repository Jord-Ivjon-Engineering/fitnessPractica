# How to Deploy - Quick Guide

This guide explains how to use the `deploy.sh` script to deploy your Fitness Practica application.

## Prerequisites

Before deploying, make sure you have:

1. ✅ Server set up (see `DEPLOYMENT.md` for initial setup)
2. ✅ Git repository cloned on the server at `/var/www/fitness-practica`
3. ✅ Environment variables configured (`server/.env` and `.env.production`)
4. ✅ PM2 and Nginx configured
5. ✅ Database created and accessible

## Quick Deploy

### Step 1: SSH into Your Server

```bash
ssh root@YOUR_DROPLET_IP
# or
ssh your-user@YOUR_DROPLET_IP
```

### Step 2: Navigate to Application Directory

```bash
cd /var/www/fitness-practica
```

### Step 3: Run the Deploy Script

**Option A: Run directly (if you have sudo access)**
```bash
sudo bash deploy.sh
```

**Option B: Run as root**
```bash
su -
bash deploy.sh
```

## What the Deploy Script Does

The `deploy.sh` script automates the entire deployment process:

1. **📥 Pulls Latest Code**: Fetches the latest changes from your Git repository
2. **🔧 Builds Backend**: Installs dependencies and compiles TypeScript
3. **🗄️ Runs Migrations**: Applies database schema changes
4. **🎨 Builds Frontend**: Compiles React/Vite application
5. **🔐 Sets Permissions**: Ensures proper file ownership and permissions
6. **🔄 Restarts Services**: Restarts PM2 processes and reloads Nginx
7. **📊 Shows Status**: Displays application status and recent logs

## Manual Deployment (Alternative)

If you prefer to deploy manually or the script fails, follow these steps:

```bash
# 1. Navigate to app directory
cd /var/www/fitness-practica

# 2. Pull latest changes
git pull origin main

# 3. Build backend
cd server
npm install
npm run build
npm run prisma:generate
npm run prisma:migrate:deploy

# 4. Build frontend
cd ..
npm install
npm run build

# 5. Set permissions
chown -R www-data:www-data /var/www/fitness-practica
chmod -R 755 /var/www/fitness-practica
chmod -R 775 /var/www/fitness-practica/server/uploads

# 6. Restart services
pm2 restart all
nginx -t && systemctl reload nginx

# 7. Check status
pm2 status
pm2 logs --lines 20 --nostream
```

## Troubleshooting

### Script Fails with Permission Error

```bash
# Make sure you're running as root or with sudo
sudo bash deploy.sh
```

### Git Pull Fails

```bash
# Check if you have uncommitted changes
git status

# Stash changes if needed
git stash

# Or commit and push your changes first
git add .
git commit -m "Your commit message"
git push origin main
```

### Build Fails

```bash
# Check Node.js version (should be 20.x)
node --version

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Migration Fails

```bash
# Check database connection
cd server
npm run prisma:studio  # Opens Prisma Studio to inspect database

# Or manually check connection
mysql -u fitness_user -p fitness_practica
```

### PM2 Not Restarting

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs fitness-practica-api

# Manually restart
pm2 restart fitness-practica-api

# If process doesn't exist, start it
pm2 start ecosystem.config.cjs
```

### Frontend Not Updating

```bash
# Verify build completed
ls -la dist/

# Check Nginx is serving the correct directory
nginx -t
systemctl reload nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log
```

## Best Practices

1. **Test Before Deploying**: Always test changes locally first
2. **Backup Database**: Create a backup before running migrations
   ```bash
   mysqldump -u fitness_user -p fitness_practica > backup_$(date +%Y%m%d).sql
   ```
3. **Deploy During Low Traffic**: Schedule deployments during off-peak hours
4. **Monitor After Deploy**: Watch logs for a few minutes after deployment
   ```bash
   pm2 logs --lines 50
   ```
5. **Keep Environment Variables Updated**: Ensure `.env` files are up to date

## Automated Deployment (CI/CD)

For automated deployments, you can:

1. **Use GitHub Actions**: Set up a workflow that SSHes into your server and runs `deploy.sh`
2. **Use Webhooks**: Create a webhook endpoint that triggers deployment
3. **Use Git Hooks**: Set up a post-receive hook on your server

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/fitness-practica
            bash deploy.sh
```

## Quick Reference Commands

```bash
# View application logs
pm2 logs fitness-practica-api

# Restart application
pm2 restart all

# Check Nginx status
systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h

# View recent deployment logs
pm2 logs --lines 50 --nostream
```

## Need Help?

- Check `DEPLOYMENT.md` for detailed setup instructions
- Check `DEPLOYMENT_TROUBLESHOOTING.md` for common issues
- Review PM2 logs: `pm2 logs`
- Review Nginx logs: `tail -f /var/log/nginx/error.log`

