#!/bin/bash
cd /root/NLN/backups/unlabeled-images-20251016205932
for file in *; do
    rm -f "/root/NLN/assets/images/$file"
done
echo "Deleted orphaned files"
ls -1 /root/NLN/assets/images | wc -l
