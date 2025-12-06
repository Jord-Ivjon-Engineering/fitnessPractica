#!/bin/bash

# Server Optimization Script for DigitalOcean 4GB RAM / 2 vCPU
# Run this script once after initial server setup
# Usage: sudo bash scripts/optimize-server.sh

set -e

echo "🚀 Starting server optimization for 4GB RAM / 2 vCPU..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# 1. Create swap file (CRITICAL for 4GB RAM)
echo -e "${YELLOW}📦 Creating 2GB swap file...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo -e "${GREEN}✅ Swap file created and activated${NC}"
else
    echo -e "${YELLOW}⚠️  Swap file already exists, skipping...${NC}"
fi

# 2. Optimize memory settings
echo -e "${YELLOW}⚙️  Optimizing memory settings...${NC}"
if ! grep -q "vm.swappiness=10" /etc/sysctl.conf; then
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
fi
if ! grep -q "vm.vfs_cache_pressure=50" /etc/sysctl.conf; then
    echo 'vm.vfs_cache_pressure=50' | tee -a /etc/sysctl.conf
fi
sysctl -p
echo -e "${GREEN}✅ Memory settings optimized${NC}"

# 3. Set up automatic cleanup of old video files
echo -e "${YELLOW}🧹 Setting up automatic cleanup...${NC}"
APP_DIR="/var/www/fitness-practica"
if [ -d "$APP_DIR" ]; then
    # Create cleanup script
    cat > /usr/local/bin/cleanup-videos.sh << 'EOF'
#!/bin/bash
# Clean temp files older than 1 day
find /var/www/fitness-practica/server/uploads/temp -type f -mtime +1 -delete 2>/dev/null || true
# Clean edited videos older than 7 days
find /var/www/fitness-practica/server/uploads/edited -type f -mtime +7 -delete 2>/dev/null || true
EOF
    chmod +x /usr/local/bin/cleanup-videos.sh
    
    # Add to crontab if not already present
    (crontab -l 2>/dev/null | grep -v "cleanup-videos.sh"; echo "0 3 * * * /usr/local/bin/cleanup-videos.sh") | crontab -
    echo -e "${GREEN}✅ Automatic cleanup configured (runs daily at 3 AM)${NC}"
else
    echo -e "${YELLOW}⚠️  Application directory not found, skipping cleanup setup${NC}"
    echo -e "${YELLOW}   Run this script again after deploying your application${NC}"
fi

# 4. Verify swap is active
echo -e "${YELLOW}📊 Checking system resources...${NC}"
echo "Swap status:"
swapon --show
echo ""
echo "Memory status:"
free -h
echo ""

# 5. Summary
echo -e "${GREEN}✅ Server optimization complete!${NC}"
echo ""
echo "Summary of changes:"
echo "  ✓ 2GB swap file created and activated"
echo "  ✓ Memory settings optimized (swappiness=10)"
echo "  ✓ Automatic video cleanup scheduled (daily at 3 AM)"
echo ""
echo "Next steps:"
echo "  1. Restart your application: pm2 restart all"
echo "  2. Monitor memory usage: free -h"
echo "  3. Check swap usage: swapon --show"
echo ""

