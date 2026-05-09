#!/bin/bash

###############################################################################
# Arivu CRM - Local Deployment Helper
###############################################################################
# Run this script from your LOCAL Mac to deploy to AWS EC2
# It will upload the deployment script and execute it
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
EC2_IP="43.204.144.169"
EC2_USER="ubuntu"
KEY_FILE=""

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🚀 Arivu CRM - Deploy from Local Machine          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${PURPLE}📍 Target Server: ${GREEN}$EC2_IP${NC}"
echo ""

# Check if we're in the Arivu directory
if [ ! -f "deploy-aws-quick.sh" ]; then
    echo -e "${RED}❌ Error: deploy-aws-quick.sh not found${NC}"
    echo -e "${YELLOW}Please run this script from the Arivu directory${NC}"
    exit 1
fi

# Ask for SSH key file
echo -e "${BLUE}🔑 SSH Key Setup${NC}"
echo ""
echo "Please provide the path to your EC2 SSH key file (.pem)"
echo -e "${YELLOW}Example: ~/Downloads/arivu-key.pem${NC}"
echo ""
read -p "Enter path to SSH key: " KEY_FILE

# Expand tilde to home directory
KEY_FILE="${KEY_FILE/#\~/$HOME}"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Error: Key file not found: $KEY_FILE${NC}"
    exit 1
fi

# Make sure key has correct permissions
chmod 400 "$KEY_FILE"
echo -e "${GREEN}✓ SSH key validated${NC}"
echo ""

# Test SSH connection
echo -e "${BLUE}🔌 Testing SSH connection...${NC}"
if ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "echo 'Connection successful'" &> /dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to EC2 instance${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo "  1. EC2 instance is running"
    echo "  2. Security group allows SSH from your IP"
    echo "  3. Key file is correct"
    exit 1
fi
echo ""

# Upload deployment script
echo -e "${BLUE}📤 Uploading deployment script to EC2...${NC}"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no deploy-aws-quick.sh "$EC2_USER@$EC2_IP:/home/ubuntu/" || {
    echo -e "${RED}❌ Failed to upload deployment script${NC}"
    exit 1
}
echo -e "${GREEN}✓ Deployment script uploaded${NC}"
echo ""

# Make it executable
echo -e "${BLUE}🔧 Preparing deployment script...${NC}"
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "chmod +x /home/ubuntu/deploy-aws-quick.sh"
echo -e "${GREEN}✓ Script is ready to run${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Ready to deploy Arivu CRM to ${GREEN}$EC2_IP${NC}"
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  • Install Node.js, Nginx, PM2, Git"
echo "  • Clone/update your repository"
echo "  • Install all dependencies"
echo "  • Build the frontend"
echo "  • Configure Nginx"
echo "  • Start the backend with PM2"
echo ""
echo -e "${YELLOW}This will take approximately 5-10 minutes.${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Do you want to proceed? (yes/no): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${PURPLE}🚀 Starting deployment...${NC}"
echo ""

# Execute deployment script on EC2
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "bash /home/ubuntu/deploy-aws-quick.sh"

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              ✅ DEPLOYMENT COMPLETED SUCCESSFULLY! ✅        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your application is now live at:${NC}"
    echo -e "   ${BLUE}http://$EC2_IP${NC}"
    echo ""
    echo -e "${GREEN}👤 Login with:${NC}"
    echo -e "   Email:    admin@arivu.com"
    echo -e "   Password: Admin@123456"
    echo ""
    echo -e "${YELLOW}⚠️  Remember to change the admin password after first login!${NC}"
    echo ""
    echo -e "${BLUE}📱 Open in your browser now:${NC}"
    echo -e "   ${PURPLE}open http://$EC2_IP${NC}  ${YELLOW}(or visit manually)${NC}"
    echo ""
    
    # Try to open in browser (Mac only)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        read -p "Open in browser now? (yes/no): " OPEN_BROWSER
        if [[ $OPEN_BROWSER =~ ^[Yy][Ee][Ss]$ ]]; then
            open "http://$EC2_IP"
        fi
    fi
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}Check the output above for errors${NC}"
    exit 1
fi

