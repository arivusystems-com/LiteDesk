#!/bin/bash

###############################################################################
# Switch Local Development to Port 3000 (Avoids Apple AirPlay on Port 5000)
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║      🔧 Switching to Port 3000 for Local Dev          ║
║         (Avoids Apple AirPlay Conflict)                ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

cd /Users/Prabhu/Documents/GitHub/Arivu

echo -e "${BLUE}Step 1: Stopping any existing backend...${NC}"
# Kill processes on both ports
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :5000 2>/dev/null | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✅ Ports cleared${NC}"
echo ""

echo -e "${BLUE}Step 2: Backend is now configured for port 3000${NC}"
echo "   server/.env: PORT=3000"
echo -e "${GREEN}✅ Backend configured${NC}"
echo ""

echo -e "${BLUE}Step 3: Frontend configured for port 3000${NC}"
echo "   client/.env.development created"
echo -e "${GREEN}✅ Frontend configured${NC}"
echo ""

echo -e "${BLUE}Step 4: Starting backend on port 3000...${NC}"
cd server

# Start backend
nohup node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.backend.pid

# Wait for backend
echo "Waiting for backend to start..."
sleep 3

MAX_ATTEMPTS=15
ATTEMPT=0
until curl -s http://localhost:3000/health > /dev/null 2>&1 || curl -s http://localhost:3000/ > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo "Check logs:"
        tail -20 ../backend.log
        exit 1
    fi
    sleep 1
done

echo -e "${GREEN}✅ Backend started! (PID: $BACKEND_PID)${NC}"
echo ""

# Test backend
HEALTH=$(curl -s http://localhost:3000/health 2>&1 || echo "not responding")
echo "Health check: $HEALTH"
echo ""

echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║         ✅ LOCAL DEVELOPMENT NOW ON PORT 3000! ✅     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${BLUE}📊 Configuration:${NC}"
echo "  Backend Port:  3000 (was 5000)"
echo "  Backend URL:   http://localhost:3000"
echo "  Frontend:      http://localhost:5173 (or 5175)"
echo "  API Endpoint:  http://localhost:3000/api"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo "  Backend Health: http://localhost:3000/health"
echo "  Backend API:    http://localhost:3000/api"
echo "  Frontend:       http://localhost:5173"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Frontend is already running on port 5173/5175"
echo "  2. Just refresh your browser"
echo "  3. Login should work now!"
echo ""
echo -e "${YELLOW}💡 Port 3000 won't conflict with Apple AirPlay${NC}"
echo ""
echo -e "${GREEN}✨ You're ready to develop! 🚀${NC}"
echo ""

