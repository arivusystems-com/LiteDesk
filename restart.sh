#!/bin/bash

# =============================================================================
# Arivu - Restart All Services
# =============================================================================
# This script restarts MongoDB, Backend, and Frontend
# Usage: ./restart.sh
# =============================================================================

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🔄 Restarting Arivu...${NC}"
echo ""

# Stop all services (without prompts)
./stop.sh

# Wait a moment
sleep 2

# Start all services
./start.sh

