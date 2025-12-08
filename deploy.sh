#!/bin/bash

# Deployment script for Fitness Practica
# Run this script on your DigitalOcean droplet to deploy updates

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/fitness-practica"
BACKEND_DIR="$APP_DIR/server"
FRONTEND_DIR="$APP_DIR"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Navigate to application directory
cd $APP_DIR

# Stash any local changes before pulling
echo -e "${YELLOW}💾 Stashing local changes (if any)...${NC}"
git stash || true  # Stash changes, or do nothing if there are none

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
}

# Backend deployment
echo -e "${YELLOW}🔧 Building backend...${NC}"
cd $BACKEND_DIR
npm install  # Install all dependencies (including devDependencies for TypeScript build)
npm run build

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npm run prisma:generate
npm run prisma:migrate deploy || {
    echo -e "${YELLOW}⚠️  Migration failed, but continuing...${NC}"
}

# Frontend deployment
echo -e "${YELLOW}🎨 Building frontend...${NC}"
cd $FRONTEND_DIR
npm install  # Install all dependencies (including devDependencies for build)
npm run build

# Set permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $BACKEND_DIR/uploads

# Restart PM2 processes
echo -e "${YELLOW}🔄 Restarting application...${NC}"
pm2 restart all

# Reload Nginx
echo -e "${YELLOW}🌐 Reloading Nginx...${NC}"
nginx -t && systemctl reload nginx

# Show status
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Application status:"
pm2 status
echo ""
echo "📝 Recent logs:"
pm2 logs --lines 10 --nostream

