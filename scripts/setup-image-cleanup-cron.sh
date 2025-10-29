#!/bin/bash
# Setup Automated Image Cleanup Cron Job
#
# This script installs a cron job to run scheduled image cleanup weekly
# Run this once to enable automated cleanup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Setting up Automated Image Cleanup${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Create log directory
LOG_DIR="/var/log/nln"
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✓ Created log directory: $LOG_DIR${NC}"

# Make cleanup script executable
chmod +x /root/NLN/scripts/scheduled-image-cleanup.sh
chmod +x /root/NLN/scripts/cleanup-unlabeled-images.sh
chmod +x /root/NLN/scripts/find-orphaned-files.sh
echo -e "${GREEN}✓ Made cleanup scripts executable${NC}"

# Define cron job
# Runs every Sunday at 2:00 AM
CRON_SCHEDULE="0 2 * * 0"
CRON_COMMAND="/root/NLN/scripts/scheduled-image-cleanup.sh >> /var/log/nln/image-cleanup.log 2>&1"
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "scheduled-image-cleanup.sh"; then
    echo -e "${YELLOW}⚠ Cron job already exists. Updating...${NC}"
    # Remove old job
    crontab -l 2>/dev/null | grep -v "scheduled-image-cleanup.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}✓ Installed cron job${NC}"

echo ""
echo -e "${BLUE}Cron Configuration:${NC}"
echo -e "  Schedule: Every Sunday at 2:00 AM"
echo -e "  Command: $CRON_COMMAND"
echo -e "  Log file: /var/log/nln/image-cleanup.log"
echo ""

# Display current crontab
echo -e "${BLUE}Current cron jobs:${NC}"
crontab -l | grep -v "^#" | grep -v "^$" || echo "  (none)"
echo ""

# Test the cleanup script (dry run)
echo -e "${YELLOW}Testing cleanup script...${NC}"
echo -e "${YELLOW}(This will show what would be cleaned up, but won't actually delete anything yet)${NC}"
echo ""

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo -e "Automated image cleanup has been scheduled."
echo -e "To run cleanup manually: bash /root/NLN/scripts/scheduled-image-cleanup.sh"
echo -e "To view logs: tail -f /var/log/nln/image-cleanup.log"
echo -e "To disable: crontab -e (and remove the scheduled-image-cleanup.sh line)"
echo ""
