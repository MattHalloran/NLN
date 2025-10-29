#!/bin/bash
# Scheduled Image Cleanup Job
#
# This script should be run periodically (e.g., weekly) via cron to:
# 1. Clean up unlabeled images older than 30 days
# 2. Detect and remove orphaned files (files without DB records)
# 3. Log results for monitoring
#
# Recommended cron schedule: Weekly on Sunday at 2 AM
# 0 2 * * 0 /root/NLN/scripts/scheduled-image-cleanup.sh >> /var/log/nln/image-cleanup.log 2>&1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log directory
LOG_DIR="/var/log/nln"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  NLN Scheduled Image Cleanup${NC}"
echo -e "${BLUE}  Started: $(date)${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Run unlabeled images cleanup
echo -e "${YELLOW}[1/3] Running unlabeled images cleanup (30-day retention)...${NC}"
if bash /root/NLN/scripts/cleanup-unlabeled-images.sh; then
    echo -e "${GREEN}✓ Unlabeled images cleanup completed successfully${NC}"
else
    echo -e "${RED}✗ Unlabeled images cleanup failed with exit code $?${NC}"
    # Continue with other cleanup tasks even if this fails
fi
echo ""

# Run orphaned files detection
echo -e "${YELLOW}[2/3] Detecting orphaned files (files without DB records)...${NC}"
ORPHANED_FILES=$(bash /root/NLN/scripts/find-orphaned-files.sh 2>/dev/null | grep -v "^$" || true)
ORPHAN_COUNT=$(echo "$ORPHANED_FILES" | grep -c "^" || echo "0")

if [ "$ORPHAN_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ No orphaned files found${NC}"
else
    echo -e "${YELLOW}Found $ORPHAN_COUNT orphaned files${NC}"

    # Create backup directory for orphaned files
    ORPHAN_BACKUP_DIR="/root/NLN/backups/orphaned-files-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$ORPHAN_BACKUP_DIR"

    # Backup and delete orphaned files
    echo -e "${YELLOW}Backing up and removing orphaned files...${NC}"
    DELETED_ORPHANS=0
    while IFS= read -r filename; do
        if [ -n "$filename" ]; then
            src_file="/root/NLN/assets/images/$filename"
            if [ -f "$src_file" ]; then
                # Backup first
                cp "$src_file" "$ORPHAN_BACKUP_DIR/"
                # Then delete
                rm "$src_file"
                ((DELETED_ORPHANS++))
                echo "  - Removed: $filename"
            fi
        fi
    done <<< "$ORPHANED_FILES"

    echo -e "${GREEN}✓ Removed $DELETED_ORPHANS orphaned files${NC}"
    echo -e "${GREEN}  Backup location: $ORPHAN_BACKUP_DIR${NC}"
fi
echo ""

# Generate storage statistics
echo -e "${YELLOW}[3/3] Generating storage statistics...${NC}"
TOTAL_IMAGE_FILES=$(find /root/NLN/assets/images -type f 2>/dev/null | wc -l)
TOTAL_IMAGE_SIZE=$(du -sh /root/NLN/assets/images 2>/dev/null | cut -f1)
DB_IMAGE_COUNT=$(docker exec -i nln_db psql -U nlnuser -d nlndb -t -c "SELECT COUNT(DISTINCT hash) FROM image;" 2>/dev/null | xargs || echo "N/A")
DB_FILE_COUNT=$(docker exec -i nln_db psql -U nlnuser -d nlndb -t -c "SELECT COUNT(*) FROM image_file;" 2>/dev/null | xargs || echo "N/A")
UNLABELED_COUNT=$(docker exec -i nln_db psql -U nlnuser -d nlndb -t -c \
  "SELECT COUNT(DISTINCT i.hash) FROM image i
   LEFT JOIN image_labels il ON i.hash = il.hash
   LEFT JOIN plant_images pi ON i.hash = pi.hash
   WHERE il.hash IS NULL
     AND pi.hash IS NULL;" 2>/dev/null | xargs || echo "N/A")

echo -e "${GREEN}Storage Statistics:${NC}"
echo -e "  • Total files on disk: $TOTAL_IMAGE_FILES"
echo -e "  • Total disk usage: $TOTAL_IMAGE_SIZE"
echo -e "  • Unique images in DB: $DB_IMAGE_COUNT"
echo -e "  • Total image variants in DB: $DB_FILE_COUNT"
echo -e "  • Unlabeled images (pending cleanup): $UNLABELED_COUNT"
echo ""

# Check for old backups and warn if they're taking up space
echo -e "${YELLOW}Checking backup directory sizes...${NC}"
BACKUP_SIZE=$(du -sh /root/NLN/backups 2>/dev/null | cut -f1 || echo "0")
BACKUP_COUNT=$(find /root/NLN/backups -maxdepth 1 -type d 2>/dev/null | wc -l)
echo -e "  • Backup directory size: $BACKUP_SIZE"
echo -e "  • Number of backup folders: $((BACKUP_COUNT - 1))"

if [ "$((BACKUP_COUNT - 1))" -gt 10 ]; then
    echo -e "${YELLOW}  ⚠ Warning: More than 10 backup folders exist. Consider cleaning up old backups.${NC}"
fi
echo ""

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Cleanup completed: $(date)${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Write summary to log file
{
    echo "=== Image Cleanup Summary - $(date) ==="
    echo "Files on disk: $TOTAL_IMAGE_FILES"
    echo "Disk usage: $TOTAL_IMAGE_SIZE"
    echo "DB images: $DB_IMAGE_COUNT"
    echo "Unlabeled images: $UNLABELED_COUNT"
    echo "Orphaned files removed: $DELETED_ORPHANS"
    echo ""
} >> "$LOG_DIR/image-cleanup-summary.log"

echo -e "${GREEN}✓ Cleanup job completed successfully${NC}"
echo -e "Log saved to: $LOG_DIR/image-cleanup-summary.log"
