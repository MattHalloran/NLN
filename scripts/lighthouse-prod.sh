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
# Dynamically find Playwright's Chromium binary
CHROME_BINARY=$(find ~/.cache/ms-playwright -name "chrome" -path "*/chrome-linux/chrome" -type f 2>/dev/null | head -1)
if [ -n "$CHROME_BINARY" ]; then
    export CHROME_PATH="$CHROME_BINARY"
    echo -e "${BLUE}Using Chromium: $CHROME_PATH${NC}"
else
    echo -e "${YELLOW}Warning: Could not find Playwright Chromium, using system Chrome${NC}"
fi

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

# Clean up orphaned Windows temp directories (WSL issue)
echo -e "${BLUE}Cleaning up temporary Lighthouse directories...${NC}"
find /tmp -maxdepth 1 -name "lighthouse.*" -type d -mtime +1 -exec rm -rf {} \; 2>/dev/null || true
# Also clean up any orphaned Windows paths in the project directory
find . -maxdepth 1 -type d -name "C:*" -exec rm -rf {} \; 2>/dev/null || true

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
