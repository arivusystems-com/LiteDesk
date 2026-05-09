#!/bin/bash

###############################################################################
# Fix 403 Forbidden Error - Nginx Permissions
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EC2_IP="13.203.208.47"
KEY_FILE=""

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     ${YELLOW}Fix 403 Forbidden Error - Permissions${NC}       ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ask for SSH key
read -p "Enter path to your SSH key (.pem): " KEY_FILE
KEY_FILE="${KEY_FILE/#\~/$HOME}"

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Key file not found${NC}"
    exit 1
fi

chmod 400 "$KEY_FILE"

echo -e "${BLUE}🔧 Fixing permissions on EC2...${NC}"
echo ""

# Fix permissions on EC2
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'REMOTE'
set -e

echo "📁 Setting correct permissions..."

# Give execute permission to home directory (so nginx can traverse)
chmod 755 /home/ubuntu

# Give execute permission to Arivu directory
chmod 755 /home/ubuntu/Arivu

# Give read/execute permission to client directory
chmod 755 /home/ubuntu/Arivu/client

# Give read permission to all files in dist
chmod -R 755 /home/ubuntu/Arivu/client/dist

# Change ownership to include www-data group (nginx user)
# This allows both ubuntu and www-data to access the files
sudo chown -R ubuntu:ubuntu /home/ubuntu/Arivu/client/dist
sudo chmod -R 755 /home/ubuntu/Arivu/client/dist

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "📊 Current permissions:"
ls -la /home/ubuntu/ | grep Arivu
ls -la /home/ubuntu/Arivu/ | grep client
ls -la /home/ubuntu/Arivu/client/ | grep dist

echo ""
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Done! Nginx restarted."
REMOTE

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              ${YELLOW}✅ PERMISSIONS FIXED! ✅${NC}               ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🌐 Try accessing your app now:${NC}"
    echo -e "   ${YELLOW}http://$EC2_IP${NC}"
    echo ""
    echo -e "${GREEN}🎉 Should work now!${NC}"
    echo ""
else
    echo -e "${RED}❌ Failed to fix permissions${NC}"
    exit 1
fi

