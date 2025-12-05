# Quick Start Deployment Guide

This is a condensed version of the full deployment guide. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] DigitalOcean account created
- [ ] Domain name purchased (optional but recommended)
- [ ] Repository is on GitHub/GitLab (or accessible via SSH)

## Step-by-Step Quick Deploy

### 1. Create Droplet
- Ubuntu 22.04 LTS
- Minimum: 2GB RAM / 1 vCPU ($12/month)
- Recommended: 4GB RAM / 2 vCPU ($24/month)

### 2. Initial Server Setup (Run on Droplet)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install required packages
apt install -y mysql-server nginx git ffmpeg build-essential
npm install -g pm2
```

### 3. Database Setup

```bash
mysql_secure_installation
mysql -u root -p
```

```sql
CREATE DATABASE fitness_practica;
CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON fitness_practica.* TO 'fitness_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone and Setup Application

```bash
mkdir -p /var/www/fitness-practica
cd /var/www/fitness-practica
git clone https://github.com/yourusername/fitness-practica.git .
```

### 5. Configure Environment Variables

**Backend** (`server/.env`):
```env
DATABASE_URL="mysql://fitness_user:password@localhost:3306/fitness_practica?schema=public"
PORT=3001
NODE_ENV=production
JWT_SECRET=your-long-random-secret-key
CORS_ORIGIN=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
POLAR_ACCESS_TOKEN=polar_at_...
POLAR_WEBHOOK_SECRET=whsec_...
```

**Frontend** (`.env.production`):
```env
VITE_API_URL=https://yourdomain.com/api
```

### 6. Build and Deploy

```bash
# Backend
cd server
npm install
npm run build
npm run prisma:generate
npm run prisma:migrate deploy

# Frontend
cd ..
npm install
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Configure Nginx

```bash
# Copy and configure nginx
cp nginx.conf /etc/nginx/sites-available/fitness-practica
# Edit the file: replace 'yourdomain.com' with your actual domain
nano /etc/nginx/sites-available/fitness-practica

# Enable site
ln -s /etc/nginx/sites-available/fitness-practica /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

### 8. SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 9. Set Permissions

```bash
chown -R www-data:www-data /var/www/fitness-practica
chmod -R 755 /var/www/fitness-practica
chmod -R 775 /var/www/fitness-practica/server/uploads
```

### 10. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Verify Deployment

- Frontend: `https://yourdomain.com`
- API Health: `https://yourdomain.com/api/health`
- PM2 Status: `pm2 status`
- Logs: `pm2 logs`

## Updating Your App

Use the provided deployment script:

```bash
cd /var/www/fitness-practica
./deploy.sh
```

Or manually:
```bash
git pull
cd server && npm install && npm run build && npm run prisma:migrate deploy
cd .. && npm install && npm run build
pm2 restart all
```

## Common Issues

**Backend not starting?**
- Check: `pm2 logs fitness-practica-api`
- Verify: `.env` file exists and has correct values
- Test: Database connection

**Frontend not loading?**
- Check: `nginx -t` for config errors
- Verify: `dist/` folder exists
- Check: Nginx error logs: `tail -f /var/log/nginx/error.log`

**Database errors?**
- Verify: MySQL is running: `systemctl status mysql`
- Test: Connection with `mysql -u fitness_user -p fitness_practica`
- Check: DATABASE_URL in `.env`

## Important Notes

1. **Replace all placeholders**: `yourdomain.com`, passwords, API keys
2. **Use production API keys**: Stripe, Polar, etc.
3. **Set strong JWT_SECRET**: Use a long random string
4. **Backup database**: Set up automatic backups
5. **Monitor resources**: Use `pm2 monit` and `htop`

## Next Steps

- Set up automatic database backups
- Configure monitoring (PM2 Plus, or similar)
- Set up CI/CD pipeline (optional)
- Configure CDN for static assets (optional)

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

