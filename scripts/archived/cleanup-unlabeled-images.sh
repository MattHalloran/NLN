#!/bin/bash
# Script to clean up unlabeled images from database and disk
#
# RETENTION POLICY: Only deletes images that have been unlabeled for 30+ days
# This prevents accidental deletion of recently removed images

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Retention period in days
RETENTION_DAYS=30

echo -e "${YELLOW}Starting unlabeled images cleanup (${RETENTION_DAYS}-day retention policy)...${NC}"

# Create backup directory
BACKUP_DIR="/root/NLN/backups/unlabeled-images-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}Created backup directory: $BACKUP_DIR${NC}"

# First, set unlabeled_since for any legacy images that have NULL (gives them 30-day grace period)
echo -e "${YELLOW}Setting retention timestamp for legacy unlabeled images...${NC}"
docker exec -i nln_db psql -U nlnuser -d nlndb -c \
  "UPDATE image SET unlabeled_since = NOW()
   WHERE hash IN (
     SELECT DISTINCT i.hash FROM image i
     LEFT JOIN image_labels il ON i.hash = il.hash
     LEFT JOIN plant_images pi ON i.hash = pi.hash
     WHERE il.hash IS NULL
       AND pi.hash IS NULL
       AND i.unlabeled_since IS NULL
   );" > /tmp/legacy_update.txt

LEGACY_COUNT=$(grep -oP 'UPDATE \K\d+' /tmp/legacy_update.txt || echo "0")
echo -e "${GREEN}Set retention timestamp for $LEGACY_COUNT legacy images${NC}"

# Get list of unlabeled image file paths (with 30-day grace period)
echo -e "${YELLOW}Querying database for unlabeled images (older than ${RETENTION_DAYS} days)...${NC}"
docker exec -i nln_db psql -U nlnuser -d nlndb -t -c \
  "SELECT DISTINCT if2.src FROM image i
   LEFT JOIN image_labels il ON i.hash = il.hash
   LEFT JOIN plant_images pi ON i.hash = pi.hash
   JOIN image_file if2 ON i.hash = if2.hash
   WHERE il.hash IS NULL
     AND pi.hash IS NULL
     AND i.unlabeled_since IS NOT NULL
     AND i.unlabeled_since < NOW() - INTERVAL '${RETENTION_DAYS} days';" > /tmp/unlabeled_files.txt

# Count files
FILE_COUNT=$(cat /tmp/unlabeled_files.txt | grep -v '^$' | wc -l)
echo -e "${GREEN}Found $FILE_COUNT unlabeled image files${NC}"

# Backup files
echo -e "${YELLOW}Backing up unlabeled image files...${NC}"
while IFS= read -r filepath; do
    # Trim whitespace
    filepath=$(echo "$filepath" | xargs)
    if [ -n "$filepath" ]; then
        src_file="/root/NLN/assets/$filepath"
        if [ -f "$src_file" ]; then
            cp "$src_file" "$BACKUP_DIR/"
        fi
    fi
done < /tmp/unlabeled_files.txt

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | wc -l)
echo -e "${GREEN}Backed up $BACKUP_COUNT files to $BACKUP_DIR${NC}"

# Get unlabeled image hashes (with 30-day grace period)
echo -e "${YELLOW}Getting unlabeled image hashes (older than ${RETENTION_DAYS} days)...${NC}"
docker exec -i nln_db psql -U nlnuser -d nlndb -t -c \
  "SELECT DISTINCT i.hash FROM image i
   LEFT JOIN image_labels il ON i.hash = il.hash
   LEFT JOIN plant_images pi ON i.hash = pi.hash
   WHERE il.hash IS NULL
     AND pi.hash IS NULL
     AND i.unlabeled_since IS NOT NULL
     AND i.unlabeled_since < NOW() - INTERVAL '${RETENTION_DAYS} days';" > /tmp/unlabeled_hashes.txt

HASH_COUNT=$(cat /tmp/unlabeled_hashes.txt | grep -v '^$' | wc -l)
echo -e "${GREEN}Found $HASH_COUNT unlabeled image records${NC}"

# Delete from database (will cascade to image_file table)
# Only delete images unlabeled for 30+ days (not NULL timestamps)
echo -e "${YELLOW}Deleting unlabeled images from database (${RETENTION_DAYS}-day grace period)...${NC}"
docker exec -i nln_db psql -U nlnuser -d nlndb -c \
  "DELETE FROM image WHERE hash IN (
     SELECT DISTINCT i.hash FROM image i
     LEFT JOIN image_labels il ON i.hash = il.hash
     LEFT JOIN plant_images pi ON i.hash = pi.hash
     WHERE il.hash IS NULL
       AND pi.hash IS NULL
       AND i.unlabeled_since IS NOT NULL
       AND i.unlabeled_since < NOW() - INTERVAL '${RETENTION_DAYS} days');"

echo -e "${GREEN}Database cleanup complete${NC}"

# Delete physical files
echo -e "${YELLOW}Deleting unlabeled image files from disk...${NC}"
DELETED_COUNT=0
while IFS= read -r filepath; do
    filepath=$(echo "$filepath" | xargs)
    if [ -n "$filepath" ]; then
        src_file="/root/NLN/assets/$filepath"
        if [ -f "$src_file" ]; then
            rm "$src_file"
            ((DELETED_COUNT++))
        fi
    fi
done < /tmp/unlabeled_files.txt

echo -e "${GREEN}Deleted $DELETED_COUNT files from disk${NC}"

# Cleanup temp files
rm -f /tmp/unlabeled_files.txt /tmp/unlabeled_hashes.txt /tmp/legacy_update.txt

# Final verification
echo -e "${YELLOW}Verifying cleanup...${NC}"
REMAINING_UNLABELED=$(docker exec -i nln_db psql -U nlnuser -d nlndb -t -c \
  "SELECT COUNT(DISTINCT i.hash) FROM image i
   LEFT JOIN image_labels il ON i.hash = il.hash
   LEFT JOIN plant_images pi ON i.hash = pi.hash
   WHERE il.hash IS NULL
     AND pi.hash IS NULL;" | xargs)

REMAINING_FILES=$(ls -1 /root/NLN/assets/images | wc -l)

echo -e "${GREEN}=== Cleanup Summary ===${NC}"
echo -e "Unlabeled images in database (ready for cleanup): $REMAINING_UNLABELED"
echo -e "Files remaining on disk: $REMAINING_FILES"
echo -e "Backup location: $BACKUP_DIR"
echo -e "Retention policy: ${RETENTION_DAYS} days"
echo -e ""
echo -e "${YELLOW}Note: Images unlabeled for less than ${RETENTION_DAYS} days are preserved${NC}"
echo -e "${GREEN}Cleanup complete!${NC}"
