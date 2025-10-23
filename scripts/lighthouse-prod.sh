#!/bin/bash
# Lighthouse Production Test Script
#
# This script properly tests the production build with Lighthouse CI
# instead of the development server.
#
# Usage: ./scripts/lighthouse-prod.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Lighthouse Production Test ===${NC}\n"

# Check if production build exists
if [ ! -d "packages/ui/dist" ]; then
    echo -e "${YELLOW}Production build not found. Building...${NC}"
    yarn workspace ui build
fi

# Check if server is already running on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Port 3001 is already in use${NC}"
    echo -e "Please stop the development server and run this script again"
    echo -e "\nTo stop the dev server:"
    echo -e "  ps aux | grep 'vite\\|yarn.*start-development' | grep -v grep"
    echo -e "  kill <PID>"
    exit 1
fi

# Start production preview server
echo -e "${GREEN}Starting production server on port 3001...${NC}"
cd packages/ui
npx serve -s dist -l 3001 &
SERVER_PID=$!
cd ../..

# Wait for server to be ready
echo -e "${BLUE}Waiting for server to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready!${NC}\n"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Server failed to start${NC}"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Run Lighthouse
# Set environment variables to prevent Windows temp paths in WSL
export CHROME_PATH=/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp
unset LOCALAPPDATA  # Prevent Windows LOCALAPPDATA from being used

echo -e "${BLUE}Running Lighthouse CI...${NC}\n"
yarn lighthouse || LIGHTHOUSE_EXIT=$?

# Cleanup
echo -e "\n${BLUE}Stopping production server...${NC}"
kill $SERVER_PID 2>/dev/null || true

# Wait a moment for the port to be released
sleep 2

if [ "${LIGHTHOUSE_EXIT:-0}" -ne 0 ]; then
    echo -e "\n${YELLOW}Lighthouse CI completed with warnings/errors${NC}"
    echo -e "Check the report files in .lighthouseci/ for details"
    echo -e "\nTo view reports:"
    echo -e "  yarn lighthouse:open"
    exit ${LIGHTHOUSE_EXIT}
fi

echo -e "\n${GREEN}Lighthouse CI completed successfully!${NC}"
echo -e "\nTo view reports:"
echo -e "  yarn lighthouse:open"
