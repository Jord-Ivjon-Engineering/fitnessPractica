# DigitalOcean Droplet Deployment Guide

This guide will help you deploy your Fitness Practica application to a DigitalOcean Droplet.

## Prerequisites

1. A DigitalOcean account (sign up at https://www.digitalocean.com)
2. A domain name (optional but recommended) - **You can deploy using just the IP address if you don't have a domain**
3. SSH access to your local machine

## Important: Domain vs IP Address

**If you don't have a domain name**, you can still deploy your application using the droplet's IP address. However, there are some limitations:

- ✅ **Works**: You can access your app via `http://YOUR_IP_ADDRESS`
- ❌ **No HTTPS**: Let's Encrypt SSL certificates require a domain name, so you'll only have HTTP (not HTTPS)
- ⚠️ **Security**: Without HTTPS, data is transmitted in plain text (not recommended for production with sensitive data)
- ⚠️ **CORS**: You'll need to use `http://YOUR_IP_ADDRESS` in your environment variables

**Recommendation**: For production, consider getting a domain name (can be as cheap as $10-15/year from providers like Namecheap, Google Domains, or Cloudflare). For testing/development, using the IP address is fine.

### Quick Reference: What to Replace

When you see `YOUR_DROPLET_IP` in this guide, replace it with your actual droplet IP address (e.g., `157.230.45.123`). You can find your IP address in the DigitalOcean dashboard after creating the droplet.

**Example**: If your IP is `157.230.45.123`, then:
- `CORS_ORIGIN=http://157.230.45.123`
- `VITE_API_URL=http://157.230.45.123/api`
- Access your app at `http://157.230.45.123`

## Step 1: Create a DigitalOcean Droplet

1. Log in to your DigitalOcean dashboard
2. Click **"Create"** → **"Droplets"**
3. Choose configuration:
   - **Image**: Ubuntu 22.04 (LTS) x64
   - **Plan**: 
     - Minimum: 2GB RAM / 1 vCPU ($12/month) - for testing
     - Recommended: 4GB RAM / 2 vCPU ($24/month) - for production
     - For video processing: 8GB RAM / 4 vCPU ($48/month) - if you need more processing power
   - **Datacenter region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or password
   - **Hostname**: `fitness-practica-server`
4. Click **"Create Droplet"**

## Step 2: Connect to Your Droplet

After the droplet is created, you'll receive an IP address. Connect via SSH:

```bash
ssh root@YOUR_DROPLET_IP
```

Or if you set up SSH keys:
```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Initial Server Setup

Once connected, run these commands to set up the server:

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install MySQL
apt install -y mysql-server

# Install Nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git

# Install FFmpeg (for video processing)
apt install -y ffmpeg

# Install build tools (for native modules)
apt install -y build-essential
```

## Step 3.5: Run Server Optimization (Recommended for 4GB RAM / 2 vCPU)

After installing all packages, run the optimization script to configure your server for video processing:

```bash
cd /var/www/fitness-practica
chmod +x scripts/optimize-server.sh
sudo bash scripts/optimize-server.sh
```

This script will:
- Create a 2GB swap file (critical for 4GB RAM systems)
- Optimize memory settings (swappiness, cache pressure)
- Set up automatic cleanup of old video files
- Verify system resources

**Note**: If you haven't cloned your repository yet, you can run this script after Step 5 (Clone Your Repository).

## Step 4: Set Up MySQL Database

```bash
# Secure MySQL installation
mysql_secure_installation

# Create database and user
mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE fitness_practica;
CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON fitness_practica.* TO 'fitness_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 5: Clone Your Repository

```bash
# Create application directory
mkdir -p /var/www/fitness-practica
cd /var/www/fitness-practica

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/fitness-practica.git .

# Or if using SSH:
# git clone git@github.com:yourusername/fitness-practica.git .
```

## Step 6: Set Up Environment Variables

**Important**: Replace `YOUR_DROPLET_IP` with your actual droplet IP address (e.g., `157.230.45.123`). If you have a domain, replace it with your domain name instead.

### Backend Environment Variables

```bash
cd /var/www/fitness-practica/server
cp env.example.txt .env
nano .env
```

Update the `.env` file with production values:

**Option A: Using IP Address (No Domain)**
```env
# Database
DATABASE_URL="mysql://fitness_user:your_secure_password_here@localhost:3306/fitness_practica?schema=public"

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-use-long-random-string

# CORS - Using IP address (replace with your actual IP)
CORS_ORIGIN=http://YOUR_DROPLET_IP
CLIENT_URL=http://YOUR_DROPLET_IP

# Frontend URL
FRONTEND_URL=http://YOUR_DROPLET_IP

# Stripe (Production keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Polar.sh
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Option B: Using Domain Name (Recommended for Production)**
```env
# Database
DATABASE_URL="mysql://fitness_user:your_secure_password_here@localhost:3306/fitness_practica?schema=public"

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-use-long-random-string

# CORS - Using domain name
CORS_ORIGIN=https://yourdomain.com
CLIENT_URL=https://yourdomain.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Stripe (Production keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Polar.sh
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Frontend Environment Variables

Create a `.env.production` file in the root directory:

```bash
cd /var/www/fitness-practica
nano .env.production
```

**Option A: Using IP Address (No Domain)**
```env
VITE_API_URL=http://YOUR_DROPLET_IP/api
```

**Option B: Using Domain Name**
```env
VITE_API_URL=https://yourdomain.com/api
```

## Step 7: Build and Install Dependencies

### Backend Setup

```bash
cd /var/www/fitness-practica/server
npm install
npm run build
npm run prisma:generate
npm run prisma:migrate deploy
```

### Frontend Setup

```bash
cd /var/www/fitness-practica
npm install
npm run build
```

The built files will be in the `dist` directory.

## Step 8: Configure PM2

PM2 will manage your Node.js processes. Use the provided `ecosystem.config.js`:

```bash
cd /var/www/fitness-practica
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

This will:
- Start your backend server
- Keep it running after server restarts
- Automatically restart if it crashes

## Step 9: Configure Nginx

Nginx will serve your frontend and proxy API requests to your backend.

Copy the provided nginx configuration:

```bash
cp /var/www/fitness-practica/nginx.conf /etc/nginx/sites-available/fitness-practica
ln -s /etc/nginx/sites-available/fitness-practica /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
```

Edit the configuration file:

```bash
nano /etc/nginx/sites-available/fitness-practica
```

**If using IP address**: Update `server_name` to `_` (catch-all) or your IP address:
```nginx
server_name _;
# or
server_name YOUR_DROPLET_IP;
```

**If using domain name**: Update `server_name` to your domain:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

Test and reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

## Step 10: Set Up SSL Certificate (Let's Encrypt)

**Note**: SSL certificates require a domain name. If you're using only an IP address, skip this step (you'll be using HTTP instead of HTTPS).

For HTTPS with a domain name, install Certbot:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

**If you skipped SSL**: Your application will be accessible via `http://YOUR_DROPLET_IP` (not HTTPS). Make sure your environment variables use `http://` instead of `https://`.

## Step 11: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 12: Set Up File Permissions

```bash
# Create uploads directory with proper permissions
mkdir -p /var/www/fitness-practica/server/uploads/edited
mkdir -p /var/www/fitness-practica/server/uploads/images
mkdir -p /var/www/fitness-practica/server/uploads/temp

# Set ownership
chown -R www-data:www-data /var/www/fitness-practica
chmod -R 755 /var/www/fitness-practica
chmod -R 775 /var/www/fitness-practica/server/uploads
```

## Step 13: Verify Deployment

**If using IP address:**
1. **Check backend health**: Visit `http://161.35.64.67/api/health`
2. **Check frontend**: Visit `http://161.35.64.67`
3. **Check PM2 status**: `pm2 status`
4. **Check Nginx status**: `systemctl status nginx`
5. **Check logs**: 
   - Backend: `pm2 logs fitness-practica-api`
   - Nginx: `tail -f /var/log/nginx/error.log`

**If using domain name:**
1. **Check backend health**: Visit `https://yourdomain.com/api/health`
2. **Check frontend**: Visit `https://yourdomain.com`
3. **Check PM2 status**: `pm2 status`
4. **Check Nginx status**: `systemctl status nginx`
5. **Check logs**: 
   - Backend: `pm2 logs fitness-practica-api`
   - Nginx: `tail -f /var/log/nginx/error.log`

## Step 14: Set Up Automatic Backups

### Database Backup Script

Create a backup script:

```bash
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fitness-practica"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u fitness_user -p'your_secure_password_here' fitness_practica > $BACKUP_DIR/db_backup_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

Make it executable:
```bash
chmod +x /usr/local/bin/backup-db.sh
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-db.sh
```

## Updating Your Application

When you need to update your application:

```bash
cd /var/www/fitness-practica

# Pull latest changes
git pull origin main

# Update backend
cd server
npm install
npm run build
npm run prisma:generate
npm run prisma:migrate deploy
pm2 restart fitness-practica-api

# Update frontend
cd ..
npm install
npm run build
pm2 restart fitness-practica-frontend

# Or restart all
pm2 restart all
```

## Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor resources
pm2 monit

# View status
pm2 status
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
```

## Troubleshooting

### Backend not starting
- Check logs: `pm2 logs fitness-practica-api`
- Verify environment variables: `cat server/.env`
- Check database connection
- Verify port 3001 is not in use: `netstat -tulpn | grep 3001`

### Frontend not loading
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Verify Nginx config: `nginx -t`
- Check file permissions
- Verify dist folder exists: `ls -la dist/`

### Database connection issues
- Verify MySQL is running: `systemctl status mysql`
- Test connection: `mysql -u fitness_user -p fitness_practica`
- Check DATABASE_URL in .env file

### SSL certificate issues
- Renew certificate: `certbot renew`
- Check certificate status: `certbot certificates`

## Security Checklist

- [ ] Changed default MySQL root password
- [ ] Set strong JWT_SECRET
- [ ] Updated all API keys to production keys
- [ ] Configured firewall (UFW)
- [ ] Set up SSL certificate
- [ ] Configured proper file permissions
- [ ] Set up automatic backups
- [ ] Disabled root SSH login (optional but recommended)
- [ ] Set up fail2ban (optional but recommended)

## Additional Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## Support

If you encounter issues:
1. Check the logs (PM2 and Nginx)
2. Verify all environment variables are set correctly
3. Ensure all services are running
4. Check firewall rules
5. Review this guide step by step

